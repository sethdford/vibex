/**
 * Session Context Tests
 */

import React, { type MutableRefObject } from 'react';
import { render } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { 
  SessionProvider, 
  useSession, 
  useHistory, 
  useSessionStats, 
  addSystemMessage,
  addErrorMessage,
  addInfoMessage
} from '../../../src/ui/contexts/SessionContext';
import { MessageType } from '../../../src/ui/types';

// Helper component to capture the session context
const SessionCapture = ({
  contextRef
}: {
  contextRef: MutableRefObject<ReturnType<typeof useSession> | undefined>;
}) => {
  contextRef.current = useSession();
  return <div data-testid="session-capture">Session Capture</div>;
};

describe('SessionContext', () => {
  it('provides the default initial state', () => {
    const contextRef = { current: undefined };

    render(
      <SessionProvider>
        <SessionCapture contextRef={contextRef} />
      </SessionProvider>
    );

    const sessionContext = contextRef.current!;
    
    expect(sessionContext.history).toEqual([]);
    expect(sessionContext.stats).toEqual({
      startTime: expect.any(Number),
      messageCount: 0,
      currentResponse: {
        promptTokenCount: 0,
        candidatesTokenCount: 0,
        totalTokenCount: 0
      }
    });
    expect(sessionContext.addItem).toBeInstanceOf(Function);
    expect(sessionContext.clearItems).toBeInstanceOf(Function);
    expect(sessionContext.loadHistory).toBeInstanceOf(Function);
    expect(sessionContext.updateStats).toBeInstanceOf(Function);
  });

  it('adds items to history correctly', () => {
    const { result } = renderHook(() => useSession(), {
      wrapper: ({ children }) => <SessionProvider>{children}</SessionProvider>,
    });

    // Set a fixed timestamp for testing
    const timestamp = 1625097600000;
    
    act(() => {
      // Mock Math.random to return a fixed value for deterministic ID generation
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      
      result.current.addItem({
        type: MessageType.USER,
        text: 'Hello',
        timestamp
      }, timestamp);
    });
    
    // Reset the mock
    jest.spyOn(Math, 'random').mockRestore();
    
    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0]).toEqual({
      id: expect.stringContaining(timestamp.toString()), // ID should contain the timestamp
      type: MessageType.USER,
      text: 'Hello',
      timestamp
    });
    expect(result.current.stats.messageCount).toBe(1);
  });

  it('clears history items correctly', () => {
    const { result } = renderHook(() => useSession(), {
      wrapper: ({ children }) => <SessionProvider>{children}</SessionProvider>,
    });

    act(() => {
      result.current.addItem({
        type: MessageType.USER,
        text: 'Message 1',
        timestamp: 1000
      });
      
      result.current.addItem({
        type: MessageType.ASSISTANT,
        text: 'Message 2',
        timestamp: 2000
      });
    });
    
    expect(result.current.history).toHaveLength(2);
    expect(result.current.stats.messageCount).toBe(2);
    
    act(() => {
      result.current.clearItems();
    });
    
    expect(result.current.history).toHaveLength(0);
    expect(result.current.stats.messageCount).toBe(0);
  });

  it('loads history from external source', () => {
    const { result } = renderHook(() => useSession(), {
      wrapper: ({ children }) => <SessionProvider>{children}</SessionProvider>,
    });
    
    const historyItems = [
      {
        id: 'item1',
        type: MessageType.USER,
        text: 'Message 1',
        timestamp: 1000
      },
      {
        id: 'item2',
        type: MessageType.ASSISTANT,
        text: 'Message 2',
        timestamp: 2000
      }
    ];
    
    act(() => {
      result.current.loadHistory(historyItems);
    });
    
    expect(result.current.history).toEqual(historyItems);
    expect(result.current.stats.messageCount).toBe(2);
  });

  it('updates stats correctly', () => {
    const { result } = renderHook(() => useSession(), {
      wrapper: ({ children }) => <SessionProvider>{children}</SessionProvider>,
    });
    
    const initialStartTime = result.current.stats.startTime;
    
    act(() => {
      result.current.updateStats({
        messageCount: 5,
        currentResponse: {
          promptTokenCount: 100,
          candidatesTokenCount: 200,
          totalTokenCount: 300
        }
      });
    });
    
    expect(result.current.stats).toEqual({
      startTime: initialStartTime,
      messageCount: 5,
      currentResponse: {
        promptTokenCount: 100,
        candidatesTokenCount: 200,
        totalTokenCount: 300
      }
    });
    
    // Partial update of nested object
    act(() => {
      result.current.updateStats({
        currentResponse: {
          candidatesTokenCount: 250
        }
      });
    });
    
    // Should preserve other properties
    expect(result.current.stats.currentResponse).toEqual({
      promptTokenCount: 100,
      candidatesTokenCount: 250, // Only this value changed
      totalTokenCount: 300
    });
  });

  it('useHistory hook provides the correct subset of functionality', () => {
    const { result } = renderHook(() => useHistory(), {
      wrapper: ({ children }) => <SessionProvider>{children}</SessionProvider>,
    });
    
    expect(result.current).toEqual({
      history: [],
      addItem: expect.any(Function),
      clearItems: expect.any(Function),
      loadHistory: expect.any(Function)
    });
    
    // Should not have stats-related properties
    expect((result.current as any).stats).toBeUndefined();
    expect((result.current as any).updateStats).toBeUndefined();
  });

  it('useSessionStats hook provides the correct subset of functionality', () => {
    const { result } = renderHook(() => useSessionStats(), {
      wrapper: ({ children }) => <SessionProvider>{children}</SessionProvider>,
    });
    
    expect(result.current).toEqual({
      stats: {
        startTime: expect.any(Number),
        messageCount: 0,
        currentResponse: {
          promptTokenCount: 0,
          candidatesTokenCount: 0,
          totalTokenCount: 0
        }
      },
      updateStats: expect.any(Function)
    });
    
    // Should not have history-related properties
    expect((result.current as any).history).toBeUndefined();
    expect((result.current as any).addItem).toBeUndefined();
    expect((result.current as any).clearItems).toBeUndefined();
    expect((result.current as any).loadHistory).toBeUndefined();
  });

  it('utility functions add messages with correct types', () => {
    const { result } = renderHook(() => useSession(), {
      wrapper: ({ children }) => <SessionProvider>{children}</SessionProvider>,
    });
    
    act(() => {
      // Using the utility functions
      addSystemMessage(result.current.addItem, 'System message');
      addErrorMessage(result.current.addItem, 'Error message');
      addInfoMessage(result.current.addItem, 'Info message');
    });
    
    expect(result.current.history).toHaveLength(3);
    expect(result.current.history[0].type).toBe(MessageType.SYSTEM);
    expect(result.current.history[0].text).toBe('System message');
    
    expect(result.current.history[1].type).toBe(MessageType.ERROR);
    expect(result.current.history[1].text).toBe('Error message');
    
    expect(result.current.history[2].type).toBe(MessageType.INFO);
    expect(result.current.history[2].text).toBe('Info message');
  });

  it('throws error when useSession is used outside of SessionProvider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();
    
    expect(() => renderHook(() => useSession())).toThrow(
      'useSession must be used within a SessionProvider'
    );
    
    console.error = originalError;
  });

  it('throws error when useHistory is used outside of SessionProvider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();
    
    expect(() => renderHook(() => useHistory())).toThrow(
      'useSession must be used within a SessionProvider'
    );
    
    console.error = originalError;
  });

  it('throws error when useSessionStats is used outside of SessionProvider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();
    
    expect(() => renderHook(() => useSessionStats())).toThrow(
      'useSession must be used within a SessionProvider'
    );
    
    console.error = originalError;
  });
});

describe('SessionStatsProvider', () => {
  it('renders the SessionProvider correctly', () => {
    const contextRef = { current: undefined };
    
    render(
      <SessionProvider>
        <SessionCapture contextRef={contextRef} />
      </SessionProvider>
    );
    
    expect(contextRef.current).toBeDefined();
  });
});