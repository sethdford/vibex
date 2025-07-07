/**
 * App Orchestration Service Tests
 * 
 * Comprehensive testing following Gemini CLI patterns
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { appOrchestrationService } from './app-orchestration.js';
import { contextService } from './contextService.js';
import { logger } from '../utils/logger.js';
import type { HistoryItem } from '../ui/types.js';
import { MessageType } from '../ui/types.js';
import type { AppConfigType } from '../config/schema.js';

// Mock dependencies
vi.mock('./contextService.js');
vi.mock('../utils/logger.js');

const mockContextService = contextService as unknown as {
  initializeContext: Mock;
};

const mockLogger = logger as unknown as {
  error: Mock;
  debug: Mock;
};

describe('AppOrchestrationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initializeApp', () => {
    it('should initialize app with context successfully', async () => {
      const config = { debug: true } as AppConfigType;
      const preloadedContext = 'test context';
      const expectedMessage = 'Context initialized';

      mockContextService.initializeContext.mockResolvedValue(expectedMessage);

      const result = await appOrchestrationService.initializeApp(config, preloadedContext);

      expect(result).toBe(expectedMessage);
      expect(mockContextService.initializeContext).toHaveBeenCalledWith(config, preloadedContext);
    });

    it('should handle initialization errors', async () => {
      const config = { debug: true } as AppConfigType;
      const error = new Error('Context init failed');

      mockContextService.initializeContext.mockRejectedValue(error);

      await expect(appOrchestrationService.initializeApp(config)).rejects.toThrow('App initialization failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize app context', error);
    });
  });

  describe('processUserInput', () => {
    const mockProcessAtCommand = vi.fn();

    beforeEach(() => {
      mockProcessAtCommand.mockClear();
    });

    it('should process input with @ commands successfully', async () => {
      const input = '@file test.ts hello world';
      const processedQuery = [{ text: 'hello world' }];
      mockProcessAtCommand.mockResolvedValue({ processedQuery });

      const result = await appOrchestrationService.processUserInput(input, mockProcessAtCommand);

      expect(result).toBe('hello world');
      expect(mockProcessAtCommand).toHaveBeenCalledWith(input);
    });

    it('should handle @ command processing errors', async () => {
      const input = '@file test.ts hello';
      const error = new Error('@ command failed');
      mockProcessAtCommand.mockRejectedValue(error);

      const result = await appOrchestrationService.processUserInput(input, mockProcessAtCommand);

      expect(result).toBe(input);
      expect(mockLogger.error).toHaveBeenCalledWith('Error processing @ commands, using original query', error);
    });

    it('should throw error for empty input', async () => {
      await expect(appOrchestrationService.processUserInput('', mockProcessAtCommand))
        .rejects.toThrow('Empty input provided');
      
      await expect(appOrchestrationService.processUserInput('   ', mockProcessAtCommand))
        .rejects.toThrow('Empty input provided');
    });

    it('should return original input when no processed query', async () => {
      const input = 'test input';
      mockProcessAtCommand.mockResolvedValue({});

      const result = await appOrchestrationService.processUserInput(input, mockProcessAtCommand);

      expect(result).toBe(input);
    });
  });

  describe('clearAppState', () => {
    const originalConsole = console.clear;

    beforeEach(() => {
      console.clear = vi.fn();
    });

    afterEach(() => {
      console.clear = originalConsole;
    });

    it('should clear console successfully', () => {
      appOrchestrationService.clearAppState();

      expect(console.clear).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('App state cleared');
    });

    it('should handle clear errors gracefully', () => {
      const error = new Error('Clear failed');
      (console.clear as Mock).mockImplementation(() => { throw error; });

      appOrchestrationService.clearAppState();

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to clear app state', error);
    });
  });

    describe('handleExit', () => {
    const mockOnExit = vi.fn();
    const originalProcessExit = process.exit;

    beforeEach(() => {
      process.exit = vi.fn() as any;
      mockOnExit.mockClear();
    });

    afterEach(() => {
      process.exit = originalProcessExit;
    });

    it('should use quit command when available', () => {
      const mockAction = vi.fn();
      const slashCommands = [
        { name: 'quit', action: mockAction, description: 'Quit the application' }
      ];

      appOrchestrationService.handleExit(slashCommands, mockOnExit);

      expect(mockAction).toHaveBeenCalledWith('quit', '', '');
      expect(mockOnExit).not.toHaveBeenCalled();
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should use exit command when quit not available', () => {
      const mockAction = vi.fn();
      const slashCommands = [
        { name: 'exit', action: mockAction, description: 'Exit the application' }
      ];

      appOrchestrationService.handleExit(slashCommands, mockOnExit);

      expect(mockAction).toHaveBeenCalledWith('exit', '', '');
    });

    it('should use onExit callback when no commands available', () => {
      appOrchestrationService.handleExit([], mockOnExit);

      expect(mockOnExit).toHaveBeenCalled();
      expect(process.exit).not.toHaveBeenCalled();
    });

    it('should use process.exit as fallback', () => {
      appOrchestrationService.handleExit([]);

      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should handle exit errors', () => {
      const error = new Error('Exit failed');
      const mockAction = vi.fn().mockImplementation(() => { throw error; });
      const slashCommands = [{ name: 'quit', action: mockAction, description: 'Quit' }];

      appOrchestrationService.handleExit(slashCommands);

      expect(mockLogger.error).toHaveBeenCalledWith('Error during exit', error);
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

    describe('extractUserMessages', () => {
    it('should extract user messages correctly', () => {
      const history: HistoryItem[] = [
        { type: MessageType.USER, text: 'Hello', timestamp: 1, id: '1' },
        { type: MessageType.ASSISTANT, text: 'Hi there', timestamp: 2, id: '2' },
        { type: MessageType.USER, text: 'How are you?', timestamp: 3, id: '3' },
        { type: MessageType.USER, text: '', timestamp: 4, id: '4' }, // Empty text
        { type: MessageType.USER, text: '   ', timestamp: 5, id: '5' } // Whitespace only
      ];

      const result = appOrchestrationService.extractUserMessages(history);

      expect(result).toEqual(['How are you?', 'Hello']);
    });

    it('should handle empty history', () => {
      const result = appOrchestrationService.extractUserMessages([]);
      expect(result).toEqual([]);
    });

    it('should handle extraction errors', () => {
      const invalidHistory = null as any;

      const result = appOrchestrationService.extractUserMessages(invalidHistory);

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to extract user messages', expect.any(Error));
    });
  });

  describe('findLastAssistantMessage', () => {
    it('should find last assistant message', () => {
      const history: HistoryItem[] = [
        { type: MessageType.USER, text: 'Hello', timestamp: 1, id: '1' },
        { type: MessageType.ASSISTANT, text: 'First response', timestamp: 2, id: '2' },
        { type: MessageType.USER, text: 'How are you?', timestamp: 3, id: '3' },
        { type: MessageType.ASSISTANT, text: 'Last response', timestamp: 4, id: '4' },
      ];

      const result = appOrchestrationService.findLastAssistantMessage(history);

      expect(result).toBe('Last response');
    });

    it('should return null when no assistant messages', () => {
      const history: HistoryItem[] = [
        { type: MessageType.USER, text: 'Hello', timestamp: 1, id: '1' },
        { type: MessageType.USER, text: 'How are you?', timestamp: 2, id: '2' },
      ];

      const result = appOrchestrationService.findLastAssistantMessage(history);

      expect(result).toBeNull();
    });

    it('should handle empty history', () => {
      const result = appOrchestrationService.findLastAssistantMessage([]);
      expect(result).toBeNull();
    });

    it('should handle search errors', () => {
      const invalidHistory = null as any;

      const result = appOrchestrationService.findLastAssistantMessage(invalidHistory);

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to find last assistant message', expect.any(Error));
    });
  });
}); 