import { createClaudeContentGenerator, createTurnManager, TurnEvent } from '../../../src/ai/index.js';

// Mock the Claude API calls
jest.mock('fetch', () => {
  return jest.fn().mockImplementation(() => {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: 'Test response' }],
        usage: { input_tokens: 10, output_tokens: 20 }
      }),
      status: 200,
      statusText: 'OK'
    });
  });
});

describe('Integration: TurnManager and ContentGenerator', () => {
  test('TurnManager correctly uses ContentGenerator for basic queries', async () => {
    // Create content generator
    const contentGenerator = createClaudeContentGenerator('fake-api-key');
    
    // Mock the generate method
    jest.spyOn(contentGenerator, 'generate').mockResolvedValue({
      content: 'Test response',
      usage: { input_tokens: 10, output_tokens: 20 }
    });
    
    // Create turn manager with the content generator
    const turnManager = createTurnManager(contentGenerator);
    
    // Execute a turn
    const result = await turnManager.execute('Hello');
    
    // Verify the result
    expect(result).toBeDefined();
    expect(result.content).toBe('Test response');
    
    // Verify content generator was called correctly
    expect(contentGenerator.generate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: 'Hello'
        })
      ]),
      expect.any(Object)
    );
  });
  
  test('TurnManager correctly uses ContentGenerator for streaming', async () => {
    // Create content generator
    const contentGenerator = createClaudeContentGenerator('fake-api-key');
    
    // Mock the generateStream method
    const mockStream = async function* () {
      yield { type: 'content', content: 'Test ' };
      yield { type: 'content', content: 'response' };
      return {
        content: 'Test response',
        usage: { input_tokens: 10, output_tokens: 20 }
      };
    };
    
    jest.spyOn(contentGenerator, 'generateStream').mockImplementation(mockStream);
    
    // Create turn manager with the content generator
    const turnManager = createTurnManager(contentGenerator);
    
    // Set up event listeners
    const contentChunks: string[] = [];
    turnManager.on(TurnEvent.CONTENT, (chunk) => {
      contentChunks.push(chunk);
    });
    
    // Execute a streaming turn
    const result = await turnManager.executeStreaming('Hello');
    
    // Verify the result
    expect(result).toBeDefined();
    expect(result.content).toBe('Test response');
    
    // Verify content chunks were received
    expect(contentChunks).toEqual(['Test ', 'response']);
    
    // Verify content generator was called correctly
    expect(contentGenerator.generateStream).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          role: 'user',
          content: 'Hello'
        })
      ]),
      expect.any(Object)
    );
  });
  
  test('TurnManager correctly handles tool calls from ContentGenerator', async () => {
    // Create content generator
    const contentGenerator = createClaudeContentGenerator('fake-api-key');
    
    // Mock tool call response
    const toolCallResponse = {
      content: null,
      usage: { input_tokens: 10, output_tokens: 20 },
      toolCalls: [{
        id: 'tool-call-1',
        type: 'function',
        function: {
          name: 'testTool',
          arguments: JSON.stringify({ param1: 'value1', param2: 'value2' })
        }
      }]
    };
    
    // Mock follow-up response after tool call
    const followUpResponse = {
      content: 'Response after tool execution',
      usage: { input_tokens: 15, output_tokens: 25 }
    };
    
    // Setup the mock to return tool call then response
    jest.spyOn(contentGenerator, 'generate')
      .mockResolvedValueOnce(toolCallResponse)
      .mockResolvedValueOnce(followUpResponse);
    
    // Create turn manager with the content generator
    const turnManager = createTurnManager(contentGenerator);
    
    // Set up tool call event listener
    const toolCalls: any[] = [];
    turnManager.on(TurnEvent.TOOL_CALL, (toolCall) => {
      toolCalls.push(toolCall);
    });
    
    // Execute a turn that will result in a tool call
    const result = await turnManager.execute('Use a tool');
    
    // Verify tool call was emitted
    expect(toolCalls.length).toBe(1);
    expect(toolCalls[0].function.name).toBe('testTool');
    
    // Submit tool result
    const toolResult = { result: 'Tool execution successful' };
    const finalResult = await turnManager.submitToolResult(toolCalls[0].id, toolResult);
    
    // Verify final result
    expect(finalResult).toBeDefined();
    expect(finalResult.content).toBe('Response after tool execution');
    
    // Verify content generator was called with correct tool result
    const secondCallMessages = (contentGenerator.generate as jest.Mock).mock.calls[1][0];
    const toolResultMessage = secondCallMessages[secondCallMessages.length - 1];
    
    expect(toolResultMessage.role).toBe('tool');
    expect(toolResultMessage).toHaveProperty('content');
    expect(toolResultMessage).toHaveProperty('tool_call_id', 'tool-call-1');
  });
  
  test('TurnManager and ContentGenerator handle errors gracefully', async () => {
    // Create content generator
    const contentGenerator = createClaudeContentGenerator('fake-api-key');
    
    // Mock an error response
    jest.spyOn(contentGenerator, 'generate').mockImplementationOnce(() => {
      throw new Error('API error');
    });
    
    // Create turn manager with the content generator
    const turnManager = createTurnManager(contentGenerator);
    
    // Set up error handler
    const errorHandler = jest.fn();
    turnManager.on(TurnEvent.ERROR, errorHandler);
    
    // Execute a turn and expect error
    await expect(turnManager.execute('Hello')).rejects.toThrow('API error');
    
    // Verify error event was emitted
    expect(errorHandler).toHaveBeenCalled();
  });
  
  test('TurnManager passes options correctly to ContentGenerator', async () => {
    // Create content generator
    const contentGenerator = createClaudeContentGenerator('fake-api-key');
    
    // Mock the generate method
    jest.spyOn(contentGenerator, 'generate').mockResolvedValue({
      content: 'Test response',
      usage: { input_tokens: 10, output_tokens: 20 }
    });
    
    // Create turn manager with the content generator
    const turnManager = createTurnManager(contentGenerator);
    
    // Define options
    const options = {
      temperature: 0.7,
      maxTokens: 500,
      model: 'claude-3-opus-20240229',
      seed: 12345
    };
    
    // Execute a turn with options
    await turnManager.execute('Hello', options);
    
    // Verify content generator was called with correct options
    expect(contentGenerator.generate).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        temperature: 0.7,
        maxTokens: 500,
        model: 'claude-3-opus-20240229',
        seed: 12345
      })
    );
  });
});