import Anthropic from '@anthropic-ai/sdk';

export type ModelType = 'sonnet' | 'haiku';

/**
 * Extract JSON object from text that may contain explanatory text after the JSON
 * Counts braces to find the end of the JSON object
 */
function extractJsonObject(text: string): string {
  let braceCount = 0;
  let jsonEnd = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') braceCount++;
    if (text[i] === '}') braceCount--;
    if (braceCount === 0) {
      jsonEnd = i + 1;
      break;
    }
  }
  return text.substring(0, jsonEnd);
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  tools?: Anthropic.Tool[];
  jsonMode?: boolean; // Force pure JSON output without markdown wrappers
}

export interface LLMResponse<T = unknown> {
  content: T;
  raw: Anthropic.Message;
}

/**
 * Generic LLM service for interacting with Anthropic Claude API
 */
export class LLMService {
  private client: Anthropic;
  private modelMap: Record<ModelType, string> = {
    sonnet: 'claude-sonnet-4-5-20250929',
    haiku: 'claude-3-5-haiku-20241022',
  };

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey === undefined || apiKey === null || apiKey === '') {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Call Claude API with a system prompt and user message
   * Expects JSON response from the model
   */
  async call<T = unknown>(
    systemPrompt: string,
    userMessage: string,
    model: ModelType = 'haiku',
    options: LLMOptions = {}
  ): Promise<LLMResponse<T>> {
    const { temperature = 0, maxTokens = 4000, tools, jsonMode = false } = options;

    const modelId = this.modelMap[model];

    // Build messages array
    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: userMessage,
      },
    ];

    // If JSON mode is enabled, prefill assistant response with opening brace
    // This forces Claude to output pure JSON without markdown wrappers
    if (jsonMode) {
      messages.push({
        role: 'assistant',
        content: '{',
      });
    }

    const response = await this.client.messages.create({
      model: modelId,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages,
      tools,
    });

    // Extract content
    const contentBlock = response.content[0];

    // Handle text response (JSON)
    if (contentBlock.type === 'text') {
      let text = contentBlock.text.trim();

      // If JSON mode was enabled, prepend the opening brace and extract only the JSON
      if (jsonMode) {
        text = '{' + text;
        // Extract only the JSON object (ignore any explanatory text after)
        text = extractJsonObject(text);
      }

      // Try to parse as JSON
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const parsed = JSON.parse(text);
        return {
          content: parsed as T,
          raw: response,
        };
      } catch (error) {
        throw new Error(`Failed to parse LLM response as JSON: ${text}`);
      }
    }

    // Handle tool use response
    if (contentBlock.type === 'tool_use') {
      return {
        content: contentBlock as unknown as T,
        raw: response,
      };
    }

    throw new Error(
      `Unexpected content block type: ${(contentBlock as Anthropic.ContentBlock).type}`
    );
  }

  /**
   * Call Claude API with tool use support
   * Handles multi-turn conversations for tool calling
   */
  async callWithTools<T = unknown>(
    systemPrompt: string,
    userMessage: string,
    tools: Anthropic.Tool[],
    toolHandler: (
      toolName: string,
      toolInput: Record<string, unknown>
    ) => Promise<Record<string, unknown>>,
    model: ModelType = 'haiku',
    options: Omit<LLMOptions, 'tools'> & {
      toolChoice?: Anthropic.MessageCreateParams['tool_choice'];
    } = {}
  ): Promise<LLMResponse<T>> {
    const { temperature = 0, maxTokens = 4000, toolChoice } = options;
    const modelId = this.modelMap[model];

    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: userMessage,
      },
    ];

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const response = await this.client.messages.create({
        model: modelId,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages,
        tools,
        tool_choice: toolChoice,
      });

      // Check if we have a final text response
      const textContent = response.content.find((block) => block.type === 'text');
      if (
        textContent !== undefined &&
        textContent.type === 'text' &&
        response.stop_reason === 'end_turn'
      ) {
        const text = textContent.text.trim();
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const parsed = JSON.parse(text);
          return {
            content: parsed as T,
            raw: response,
          };
        } catch (error) {
          throw new Error(`Failed to parse LLM response as JSON: ${text}`);
        }
      }

      // Handle tool use
      const toolUseBlocks = response.content.filter((block) => block.type === 'tool_use');

      if (toolUseBlocks.length === 0) {
        throw new Error('LLM response contains no text or tool use');
      }

      // Add assistant's response to messages
      messages.push({
        role: 'assistant',
        content: response.content,
      });

      // Execute all tool calls and collect results
      let shouldStop = false;
      let finalResult: Record<string, unknown> | null = null;

      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUseBlocks.map(async (toolBlock) => {
          try {
            const result = await toolHandler(
              toolBlock.name,
              toolBlock.input as Record<string, unknown>
            );

            // Check if result indicates we should stop
            if ('__stop' in result && result.__stop === true) {
              shouldStop = true;
              finalResult = result.__value as Record<string, unknown>;
            }

            return {
              type: 'tool_result' as const,
              tool_use_id: toolBlock.id,
              content: JSON.stringify(result),
            };
          } catch (error) {
            return {
              type: 'tool_result' as const,
              tool_use_id: toolBlock.id,
              content: JSON.stringify({ error: (error as Error).message }),
              is_error: true,
            };
          }
        })
      );

      // If tool handler signaled to stop, return immediately
      if (shouldStop && response.stop_reason === 'tool_use') {
        return {
          content: finalResult as T,
          raw: response,
        };
      }

      // Add tool results to messages
      messages.push({
        role: 'user',
        content: toolResults,
      });

      // Continue loop to get next response
    }
  }

  /**
   * Get the model ID for a given model type
   */
  getModelId(model: ModelType): string {
    return this.modelMap[model];
  }
}
