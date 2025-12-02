import { LLMService } from '../../../src/services/llm.service';
import Anthropic from '@anthropic-ai/sdk';

// Mock the Anthropic SDK
jest.mock('@anthropic-ai/sdk');

describe('LLMService - Token Usage Tracking', () => {
  let llmService: LLMService;
  let mockCreate: jest.Mock;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock function for messages.create
    mockCreate = jest.fn();

    // Mock the Anthropic constructor to return our mock client
    (Anthropic as jest.MockedClass<typeof Anthropic>).mockImplementation(() => ({
      messages: {
        create: mockCreate,
      },
    } as unknown as Anthropic));

    // Set up environment variable
    process.env.ANTHROPIC_API_KEY = 'test-api-key';

    llmService = new LLMService();
  });

  describe('call method', () => {
    it('should return usage information from API response', async () => {
      // Arrange
      const mockResponse: Anthropic.Message = {
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: '{"result": "test"}',
            citations: [],
          },
        ],
        model: 'claude-3-5-haiku-20241022',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 100,
          output_tokens: 50,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        } as Anthropic.Usage,
      };

      mockCreate.mockResolvedValue(mockResponse);

      // Act
      const result = await llmService.call(
        'system prompt',
        'user message',
        'haiku'
      );

      // Assert
      expect(result.usage).toBeDefined();
      expect(result.usage.inputTokens).toBe(100);
      expect(result.usage.outputTokens).toBe(50);
    });

    it('should include usage along with parsed content', async () => {
      // Arrange
      const mockResponse: Anthropic.Message = {
        id: 'msg_456',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: '{"name": "Test Workout", "blocks": []}',
            citations: [],
          },
        ],
        model: 'claude-sonnet-4-5-20250929',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 250,
          output_tokens: 150,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        } as Anthropic.Usage,
      };

      mockCreate.mockResolvedValue(mockResponse);

      // Act
      const result = await llmService.call<{ name: string; blocks: unknown[] }>(
        'system prompt',
        'user message',
        'sonnet'
      );

      // Assert - verify content is parsed correctly
      expect(result.content).toEqual({ name: 'Test Workout', blocks: [] });

      // Assert - verify usage is included
      expect(result.usage).toEqual({
        inputTokens: 250,
        outputTokens: 150,
      });

      // Assert - verify raw response is included
      expect(result.raw).toBe(mockResponse);
    });

    it('should handle usage with jsonMode enabled', async () => {
      // Arrange
      const mockResponse: Anthropic.Message = {
        id: 'msg_789',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: '"key": "value"}', // JSON mode continues from prefilled '{'
            citations: [],
          },
        ],
        model: 'claude-3-5-haiku-20241022',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 75,
          output_tokens: 25,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        } as Anthropic.Usage,
      };

      mockCreate.mockResolvedValue(mockResponse);

      // Act
      const result = await llmService.call(
        'system prompt',
        'user message',
        'haiku',
        { jsonMode: true }
      );

      // Assert
      expect(result.usage).toEqual({
        inputTokens: 75,
        outputTokens: 25,
      });
    });
  });

  describe('callWithTools method', () => {
    it('should return usage information from final API response', async () => {
      // Arrange - Mock a simple tool use flow that ends with text response
      const mockToolUseResponse: Anthropic.Message = {
        id: 'msg_tool_1',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'tool_123',
            name: 'test_tool',
            input: { param: 'value' },
          },
        ],
        model: 'claude-3-5-haiku-20241022',
        stop_reason: 'tool_use',
        stop_sequence: null,
        usage: {
          input_tokens: 120,
          output_tokens: 30,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        } as Anthropic.Usage,
      };

      const mockFinalResponse: Anthropic.Message = {
        id: 'msg_final',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: '{"result": "final"}',
            citations: [],
          },
        ],
        model: 'claude-3-5-haiku-20241022',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 180,
          output_tokens: 60,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        } as Anthropic.Usage,
      };

      mockCreate
        .mockResolvedValueOnce(mockToolUseResponse)
        .mockResolvedValueOnce(mockFinalResponse);

      const toolHandler = jest.fn().mockResolvedValue({ tool_result: 'success' });

      // Act
      const result = await llmService.callWithTools(
        'system prompt',
        'user message',
        [{ name: 'test_tool', description: 'Test tool', input_schema: { type: 'object', properties: {} } }],
        toolHandler,
        'haiku'
      );

      // Assert - should return usage from final response
      expect(result.usage).toEqual({
        inputTokens: 180,
        outputTokens: 60,
      });
    });

    it('should return usage when tool handler signals stop', async () => {
      // Arrange
      const mockToolUseResponse: Anthropic.Message = {
        id: 'msg_tool_stop',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'tool_use',
            id: 'tool_456',
            name: 'search_tool',
            input: { query: 'test' },
          },
        ],
        model: 'claude-3-5-haiku-20241022',
        stop_reason: 'tool_use',
        stop_sequence: null,
        usage: {
          input_tokens: 95,
          output_tokens: 40,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        } as Anthropic.Usage,
      };

      mockCreate.mockResolvedValueOnce(mockToolUseResponse);

      const toolHandler = jest.fn().mockResolvedValue({
        __stop: true,
        __value: { exercises: [] },
      });

      // Act
      const result = await llmService.callWithTools(
        'system prompt',
        'user message',
        [{ name: 'search_tool', description: 'Search tool', input_schema: { type: 'object', properties: {} } }],
        toolHandler,
        'haiku'
      );

      // Assert
      expect(result.usage).toEqual({
        inputTokens: 95,
        outputTokens: 40,
      });
    });
  });
});
