import { LLMService } from '../../../src/services/llm.service';
import Anthropic from '@anthropic-ai/sdk';

// Mock the Anthropic SDK
jest.mock('@anthropic-ai/sdk');

describe('LLMService', () => {
  let llmService: LLMService;
  let mockClient: jest.Mocked<Anthropic>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up environment variable
    process.env.ANTHROPIC_API_KEY = 'test-api-key';

    // Create mock client
    mockClient = {
      messages: {
        create: jest.fn(),
      },
    } as any;

    // Mock the Anthropic constructor
    (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(() => mockClient);

    llmService = new LLMService();
  });

  describe('constructor', () => {
    it('should throw error if ANTHROPIC_API_KEY is not set', () => {
      delete process.env.ANTHROPIC_API_KEY;
      expect(() => new LLMService()).toThrow('ANTHROPIC_API_KEY environment variable is not set');
    });

    it('should initialize with API key from environment', () => {
      expect(Anthropic).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
    });
  });

  describe('call', () => {
    it('should successfully call Claude API and parse JSON response', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: '{"result": "success", "value": 42}',
            citations: null,
          },
        ],
        model: 'claude-3-5-haiku-20241022',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 20 },
      } as any;

      (mockClient.messages.create as jest.Mock).mockResolvedValue(mockResponse);

      const result = await llmService.call(
        'You are a helpful assistant',
        'Parse this text',
        'haiku'
      );

      expect(result.content).toEqual({ result: 'success', value: 42 });
      expect(result.raw).toBe(mockResponse);
      expect(mockClient.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 4000,
        temperature: 0,
        system: 'You are a helpful assistant',
        messages: [{ role: 'user', content: 'Parse this text' }],
        tools: undefined,
      });
    });

    it('should use sonnet model when specified', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: '{"data": "test"}' }],
        model: 'claude-sonnet-4-5-20250929',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 20 },
      } as any;

      (mockClient.messages.create as jest.Mock).mockResolvedValue(mockResponse);

      await llmService.call('System prompt', 'User message', 'sonnet');

      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-5-20250929',
        })
      );
    });

    it('should apply custom temperature and max tokens', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: '{}' }],
        model: 'claude-3-5-haiku-20241022',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 20 },
      } as any;

      (mockClient.messages.create as jest.Mock).mockResolvedValue(mockResponse);

      await llmService.call('System', 'User', 'haiku', {
        temperature: 0.7,
        maxTokens: 1000,
      });

      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
          max_tokens: 1000,
        })
      );
    });

    it('should throw error on invalid JSON response', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'This is not JSON' }],
        model: 'claude-3-5-haiku-20241022',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 20 },
      } as any;

      (mockClient.messages.create as jest.Mock).mockResolvedValue(mockResponse);

      await expect(llmService.call('System', 'User', 'haiku')).rejects.toThrow(
        'Failed to parse LLM response as JSON'
      );
    });

    it('should handle tool use content block', async () => {
      const mockResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'tool_123',
            name: 'search_tool',
            input: { query: 'test' },
          },
        ],
        model: 'claude-3-5-haiku-20241022',
        stop_reason: 'tool_use',
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 20 },
      } as any;

      (mockClient.messages.create as jest.Mock).mockResolvedValue(mockResponse);

      const result = await llmService.call('System', 'User', 'haiku');

      expect(result.content).toEqual({
        type: 'tool_use',
        id: 'tool_123',
        name: 'search_tool',
        input: { query: 'test' },
      });
    });
  });

  describe('callWithTools', () => {
    it('should handle single tool call and return final response', async () => {
      const toolHandler = jest.fn().mockResolvedValue({ results: ['exercise1', 'exercise2'] });

      // First response: tool use
      const firstResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'tool_abc',
            name: 'search_exercises',
            input: { query: 'bench press' },
          },
        ],
        model: 'claude-3-5-haiku-20241022',
        stop_reason: 'tool_use',
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 20 },
      } as any;

      // Second response: final answer
      const secondResponse = {
        id: 'msg_456',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: '{"exerciseId": "exercise1"}',
          },
        ],
        model: 'claude-3-5-haiku-20241022',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 20 },
      } as any;

      (mockClient.messages.create as jest.Mock)
        .mockResolvedValueOnce(firstResponse)
        .mockResolvedValueOnce(secondResponse);

      const tools: Anthropic.Tool[] = [
        {
          name: 'search_exercises',
          description: 'Search for exercises',
          input_schema: {
            type: 'object',
            properties: {
              query: { type: 'string' },
            },
            required: ['query'],
          },
        },
      ];

      const result = await llmService.callWithTools(
        'System prompt',
        'Find bench press',
        tools,
        toolHandler,
        'haiku'
      );

      expect(result.content).toEqual({ exerciseId: 'exercise1' });
      expect(toolHandler).toHaveBeenCalledWith('search_exercises', { query: 'bench press' });
      expect(mockClient.messages.create).toHaveBeenCalledTimes(2);
    });

    it('should handle tool errors gracefully', async () => {
      const toolHandler = jest.fn().mockRejectedValue(new Error('Tool failed'));

      const firstResponse = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'tool_abc',
            name: 'search_tool',
            input: { query: 'test' },
          },
        ],
        model: 'claude-3-5-haiku-20241022',
        stop_reason: 'tool_use',
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 20 },
      } as any;

      const secondResponse = {
        id: 'msg_456',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: '{"error": "handled"}' }],
        model: 'claude-3-5-haiku-20241022',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 20 },
      } as any;

      (mockClient.messages.create as jest.Mock)
        .mockResolvedValueOnce(firstResponse)
        .mockResolvedValueOnce(secondResponse);

      const tools: Anthropic.Tool[] = [
        {
          name: 'search_tool',
          description: 'Test tool',
          input_schema: { type: 'object', properties: {}, required: [] },
        },
      ];

      const result = await llmService.callWithTools('System', 'User', tools, toolHandler, 'haiku');

      expect(result.content).toEqual({ error: 'handled' });

      // Check that error was passed back to LLM
      const secondCallArgs = (mockClient.messages.create as jest.Mock).mock.calls[1][0];
      expect(secondCallArgs.messages).toHaveLength(3);
      const toolResultMessage = secondCallArgs.messages[2];
      expect(JSON.parse(toolResultMessage.content[0].content)).toEqual({
        error: 'Tool failed',
      });
      expect(toolResultMessage.content[0].is_error).toBe(true);
    });

    it('should handle multiple tool calls in sequence', async () => {
      const toolHandler = jest
        .fn()
        .mockResolvedValueOnce({ results: ['exercise1'] })
        .mockResolvedValueOnce({ details: 'details for exercise1' });

      const firstResponse = {
        id: 'msg_1',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'tool_1',
            name: 'search',
            input: { query: 'bench' },
          },
        ],
        model: 'claude-3-5-haiku-20241022',
        stop_reason: 'tool_use',
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 20 },
      } as any;

      const secondResponse = {
        id: 'msg_2',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'tool_2',
            name: 'get_details',
            input: { id: 'exercise1' },
          },
        ],
        model: 'claude-3-5-haiku-20241022',
        stop_reason: 'tool_use',
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 20 },
      } as any;

      const thirdResponse = {
        id: 'msg_3',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: '{"final": "result"}' }],
        model: 'claude-3-5-haiku-20241022',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 20 },
      } as any;

      (mockClient.messages.create as jest.Mock)
        .mockResolvedValueOnce(firstResponse)
        .mockResolvedValueOnce(secondResponse)
        .mockResolvedValueOnce(thirdResponse);

      const tools: Anthropic.Tool[] = [
        {
          name: 'search',
          description: 'Search',
          input_schema: { type: 'object', properties: {}, required: [] },
        },
        {
          name: 'get_details',
          description: 'Get details',
          input_schema: { type: 'object', properties: {}, required: [] },
        },
      ];

      const result = await llmService.callWithTools('System', 'User', tools, toolHandler);

      expect(result.content).toEqual({ final: 'result' });
      expect(toolHandler).toHaveBeenCalledTimes(2);
      expect(mockClient.messages.create).toHaveBeenCalledTimes(3);
    });
  });

  describe('getModelId', () => {
    it('should return correct model ID for sonnet', () => {
      expect(llmService.getModelId('sonnet')).toBe('claude-sonnet-4-5-20250929');
    });

    it('should return correct model ID for haiku', () => {
      expect(llmService.getModelId('haiku')).toBe('claude-3-5-haiku-20241022');
    });
  });
});
