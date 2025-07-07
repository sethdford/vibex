/**
 * Debugging Interface Tests
 * 
 * Tests for the debugging interface components.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DebuggingInterface } from '../../../../src/ui/components/debugging';

// Mock useDebugState hook
jest.mock('../../../../src/ui/components/debugging/useDebugState', () => {
  // Create a simple mock implementation
  const mockState = {
    connected: true,
    running: false,
    paused: true,
    variables: [
      {
        name: 'testVar',
        value: '42',
        rawValue: 42,
        type: 'number',
        isPrimitive: true,
        path: 'testVar',
        editable: true,
        enumerable: true,
        configurable: true
      }
    ],
    breakpoints: [
      {
        id: 'bp-1',
        path: '/test/file.js',
        line: 10,
        condition: null,
        enabled: true,
        hitCount: 0
      }
    ],
    callstack: [
      {
        id: 'frame-1',
        name: 'testFunction',
        path: '/test/file.js',
        line: 10,
        column: 1,
        isCurrent: true,
        context: ['function testFunction() {', '  return 42;', '}']
      }
    ],
    console: [
      {
        id: 'msg-1',
        type: 'log',
        text: 'Test message',
        timestamp: new Date(),
        groupLevel: 0
      }
    ],
    watches: [],
    threads: [
      {
        id: 'thread-1',
        name: 'Main Thread',
        stopped: true,
        frames: []
      }
    ],
    currentThread: {
      id: 'thread-1',
      name: 'Main Thread',
      stopped: true,
      frames: []
    }
  };

  return {
    __esModule: true,
    default: jest.fn(() => ({
      state: mockState,
      commands: [
        {
          name: 'continue',
          description: 'Continue execution',
          shortcut: 'F5',
          enabled: true,
          action: jest.fn(),
          category: 'control',
          icon: '▶'
        }
      ],
      executeCommand: jest.fn(),
      updateVariable: jest.fn(),
      toggleVariableExpansion: jest.fn(),
      addBreakpoint: jest.fn(),
      removeBreakpoint: jest.fn(),
      updateBreakpoint: jest.fn(),
      addWatch: jest.fn(),
      removeWatch: jest.fn(),
      updateWatch: jest.fn(),
      clearConsole: jest.fn(),
      selectStackFrame: jest.fn(),
      selectThread: jest.fn(),
      openSource: jest.fn()
    }))
  };
});

// Mock panel components to simplify testing
jest.mock('../../../../src/ui/components/debugging/panels/VariablesPanel', () => ({
  __esModule: true,
  default: jest.fn(props => <div data-testid="variables-panel">Variables Panel Mock</div>)
}));

jest.mock('../../../../src/ui/components/debugging/panels/CallStackPanel', () => ({
  __esModule: true,
  default: jest.fn(props => <div data-testid="callstack-panel">Call Stack Panel Mock</div>)
}));

jest.mock('../../../../src/ui/components/debugging/panels/BreakpointsPanel', () => ({
  __esModule: true,
  default: jest.fn(props => <div data-testid="breakpoints-panel">Breakpoints Panel Mock</div>)
}));

jest.mock('../../../../src/ui/components/debugging/panels/ConsolePanel', () => ({
  __esModule: true,
  default: jest.fn(props => <div data-testid="console-panel">Console Panel Mock</div>)
}));

jest.mock('../../../../src/ui/components/debugging/DebugToolbar', () => ({
  __esModule: true,
  default: jest.fn(props => <div data-testid="debug-toolbar">Debug Toolbar Mock</div>)
}));

// Mock Ink components
jest.mock('ink', () => {
  const React = require('react');
  
  const Box = ({ children, ...props }) => (
    <div data-testid="ink-box" {...props}>
      {children}
    </div>
  );
  
  const Text = ({ children, ...props }) => (
    <span data-testid="ink-text" {...props}>
      {children}
    </span>
  );
  
  return {
    Box,
    Text,
    useInput: jest.fn((callback, { isActive } = {}) => {}),
    useStdin: jest.fn(() => ({ stdin: {}, setRawMode: jest.fn() })),
    useStdout: jest.fn(() => ({})),
    measureElement: jest.fn(() => ({ width: 80, height: 24 }))
  };
});

describe('DebuggingInterface', () => {
  const mockOnExit = jest.fn();
  const mockOnCommand = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('renders debugging interface with toolbar and panels', () => {
    render(
      <DebuggingInterface
        width={120}
        height={40}
        onExit={mockOnExit}
        onCommand={mockOnCommand}
      />
    );
    
    // Check that main components are rendered
    expect(screen.getByTestId('debug-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('variables-panel')).toBeInTheDocument();
    expect(screen.getByTestId('callstack-panel')).toBeInTheDocument();
    expect(screen.getByTestId('breakpoints-panel')).toBeInTheDocument();
    expect(screen.getByTestId('console-panel')).toBeInTheDocument();
  });
  
  test('passes appropriate props to toolbar', () => {
    const { default: DebugToolbarMock } = require('../../../../src/ui/components/debugging/DebugToolbar');
    
    render(
      <DebuggingInterface
        width={120}
        height={40}
        onExit={mockOnExit}
        onCommand={mockOnCommand}
      />
    );
    
    // Check that props are passed correctly
    expect(DebugToolbarMock).toHaveBeenCalled();
    const toolbarProps = DebugToolbarMock.mock.calls[0][0];
    expect(toolbarProps).toHaveProperty('commands');
    expect(toolbarProps).toHaveProperty('state');
    expect(toolbarProps).toHaveProperty('width');
    expect(toolbarProps).toHaveProperty('onCommand');
  });
  
  test('passes appropriate props to panels', () => {
    const { default: VariablesPanelMock } = require('../../../../src/ui/components/debugging/panels/VariablesPanel');
    const { default: CallStackPanelMock } = require('../../../../src/ui/components/debugging/panels/CallStackPanel');
    
    render(
      <DebuggingInterface
        width={120}
        height={40}
        onExit={mockOnExit}
        onCommand={mockOnCommand}
      />
    );
    
    // Check that props are passed correctly to VariablesPanel
    expect(VariablesPanelMock).toHaveBeenCalled();
    const variablesPanelProps = VariablesPanelMock.mock.calls[0][0];
    expect(variablesPanelProps).toHaveProperty('variables');
    expect(variablesPanelProps).toHaveProperty('width');
    expect(variablesPanelProps).toHaveProperty('height');
    expect(variablesPanelProps).toHaveProperty('onVariableEdit');
    expect(variablesPanelProps).toHaveProperty('onVariableToggle');
    
    // Check that props are passed correctly to CallStackPanel
    expect(CallStackPanelMock).toHaveBeenCalled();
    const callStackPanelProps = CallStackPanelMock.mock.calls[0][0];
    expect(callStackPanelProps).toHaveProperty('callstack');
    expect(callStackPanelProps).toHaveProperty('width');
    expect(callStackPanelProps).toHaveProperty('height');
    expect(callStackPanelProps).toHaveProperty('onFrameSelect');
  });
});