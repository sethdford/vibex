/**
 * Debug State Hook
 * 
 * Custom hook for managing debug state and operations.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  DebugVariableType, 
  DebugPanelType
} from './types.js';

/**
 * Initial mock debug state
 */
const createMockDebugState = () => {
  // Create mock variables
  const variables = [
    {
      name: 'user',
      value: '{ name: "John", age: 30, ... }',
      rawValue: { name: 'John', age: 30, email: 'john@example.com', isActive: true },
      type: DebugVariableType.OBJECT,
      expanded: false,
      isPrimitive: false,
      path: 'user',
      editable: true,
      enumerable: true,
      configurable: true,
      children: [
        {
          name: 'name',
          value: '"John"',
          rawValue: 'John',
          type: DebugVariableType.STRING,
          isPrimitive: true,
          path: 'user.name',
          editable: true,
          enumerable: true,
          configurable: true
        },
        {
          name: 'age',
          value: '30',
          rawValue: 30,
          type: DebugVariableType.NUMBER,
          isPrimitive: true,
          path: 'user.age',
          editable: true,
          enumerable: true,
          configurable: true
        },
        {
          name: 'email',
          value: '"john@example.com"',
          rawValue: 'john@example.com',
          type: DebugVariableType.STRING,
          isPrimitive: true,
          path: 'user.email',
          editable: true,
          enumerable: true,
          configurable: true
        },
        {
          name: 'isActive',
          value: 'true',
          rawValue: true,
          type: DebugVariableType.BOOLEAN,
          isPrimitive: true,
          path: 'user.isActive',
          editable: true,
          enumerable: true,
          configurable: true
        }
      ]
    },
    {
      name: 'items',
      value: 'Array(3) [ "apple", "banana", "cherry" ]',
      rawValue: ['apple', 'banana', 'cherry'],
      type: DebugVariableType.ARRAY,
      expanded: false,
      isPrimitive: false,
      path: 'items',
      editable: true,
      enumerable: true,
      configurable: true,
      children: [
        {
          name: '0',
          value: '"apple"',
          rawValue: 'apple',
          type: DebugVariableType.STRING,
          isPrimitive: true,
          path: 'items.0',
          editable: true,
          enumerable: true,
          configurable: true
        },
        {
          name: '1',
          value: '"banana"',
          rawValue: 'banana',
          type: DebugVariableType.STRING,
          isPrimitive: true,
          path: 'items.1',
          editable: true,
          enumerable: true,
          configurable: true
        },
        {
          name: '2',
          value: '"cherry"',
          rawValue: 'cherry',
          type: DebugVariableType.STRING,
          isPrimitive: true,
          path: 'items.2',
          editable: true,
          enumerable: true,
          configurable: true
        }
      ]
    },
    {
      name: 'count',
      value: '42',
      rawValue: 42,
      type: DebugVariableType.NUMBER,
      isPrimitive: true,
      path: 'count',
      editable: true,
      enumerable: true,
      configurable: true
    },
    {
      name: 'isEnabled',
      value: 'true',
      rawValue: true,
      type: DebugVariableType.BOOLEAN,
      isPrimitive: true,
      path: 'isEnabled',
      editable: true,
      enumerable: true,
      configurable: true
    },
    {
      name: 'processItem',
      value: 'function processItem(item) { ... }',
      rawValue: null,
      type: DebugVariableType.FUNCTION,
      isPrimitive: false,
      path: 'processItem',
      editable: false,
      enumerable: true,
      configurable: true
    }
  ];

  // Create mock breakpoints
  const breakpoints = [
    {
      id: 'bp-1',
      path: '/Users/sethford/Downloads/Projects/vibex/src/core/usecases/process-items.js',
      line: 42,
      condition: null,
      enabled: true,
      hitCount: 3
    },
    {
      id: 'bp-2',
      path: '/Users/sethford/Downloads/Projects/vibex/src/services/item-service.js',
      line: 78,
      condition: 'item.status === "error"',
      enabled: true,
      hitCount: 0
    },
    {
      id: 'bp-3',
      path: '/Users/sethford/Downloads/Projects/vibex/src/ui/components/ItemList.js',
      line: 25,
      condition: null,
      enabled: false,
      hitCount: 1
    }
  ];

  // Create mock call stack
  const callstack = [
    {
      id: 'frame-1',
      name: 'processItems',
      path: '/Users/sethford/Downloads/Projects/vibex/src/core/usecases/process-items.js',
      line: 42,
      column: 3,
      isCurrent: true,
      context: [
        'function processItems(items) {',
        '  const results = [];',
        '  for (const item of items) {',
        '    const processed = processItem(item);',
        '    results.push(processed);',
        '  }',
        '  return results;',
        '}'
      ],
      locals: variables
    },
    {
      id: 'frame-2',
      name: 'handleSubmit',
      path: '/Users/sethford/Downloads/Projects/vibex/src/ui/components/ItemForm.js',
      line: 67,
      column: 5,
      isCurrent: false,
      context: [
        'function handleSubmit() {',
        '  const formData = getFormData();',
        '  const validationResult = validateForm(formData);',
        '  if (validationResult.valid) {',
        '    const items = parseItems(formData.items);',
        '    const results = processItems(items);',
        '    updateUI(results);',
        '  } else {',
        '    showErrors(validationResult.errors);',
        '  }',
        '}'
      ]
    },
    {
      id: 'frame-3',
      name: 'onClick',
      path: '/Users/sethford/Downloads/Projects/vibex/src/ui/components/SubmitButton.js',
      line: 23,
      column: 7,
      isCurrent: false,
      context: [
        '<Button',
        '  onClick={() => {',
        '    setSubmitting(true);',
        '    try {',
        '      handleSubmit();',
        '    } catch (error) {',
        '      console.error("Submit error:", error);',
        '      setError(error.message);',
        '    } finally {',
        '      setSubmitting(false);',
        '    }',
        '  }}',
        '>'
      ]
    }
  ];

  // Create mock console messages
  const consoleMessages = [
    {
      id: 'msg-1',
      type: 'log',
      text: 'Processing items: 3',
      timestamp: new Date(Date.now() - 60000),
      groupLevel: 0
    },
    {
      id: 'msg-2',
      type: 'info',
      text: 'User authenticated: john@example.com',
      timestamp: new Date(Date.now() - 45000),
      groupLevel: 0
    },
    {
      id: 'msg-3',
      type: 'debug',
      text: 'Form data: { items: Array(3), options: { ... } }',
      timestamp: new Date(Date.now() - 30000),
      groupLevel: 0
    },
    {
      id: 'msg-4',
      type: 'warn',
      text: 'Deprecated method called: legacy.processItem()',
      source: {
        path: '/Users/sethford/Downloads/Projects/vibex/src/legacy/processors.js',
        line: 45
      },
      timestamp: new Date(Date.now() - 15000),
      groupLevel: 0
    },
    {
      id: 'msg-5',
      type: 'command',
      text: 'next',
      timestamp: new Date(Date.now() - 5000),
      groupLevel: 0
    },
    {
      id: 'msg-6',
      type: 'result',
      text: 'Stepped to line 43',
      timestamp: new Date(),
      groupLevel: 0
    }
  ];

  // Create mock watch expressions
  const watches = [
    {
      id: 'watch-1',
      expression: 'items.length',
      value: '3',
      type: DebugVariableType.NUMBER,
      enabled: true,
      showType: true,
      timestamp: new Date()
    },
    {
      id: 'watch-2',
      expression: 'items.filter(i => i.startsWith("a"))',
      value: 'Array(1) ["apple"]',
      type: DebugVariableType.ARRAY,
      enabled: true,
      showType: true,
      timestamp: new Date()
    },
    {
      id: 'watch-3',
      expression: 'user.name + " has " + items.length + " items"',
      value: '"John has 3 items"',
      type: DebugVariableType.STRING,
      enabled: true,
      showType: true,
      timestamp: new Date()
    },
    {
      id: 'watch-4',
      expression: 'nonExistentVariable',
      error: 'ReferenceError: nonExistentVariable is not defined',
      value: undefined,
      type: DebugVariableType.UNDEFINED,
      enabled: true,
      showType: true,
      timestamp: new Date()
    }
  ];

  // Create mock threads
  const threads = [
    {
      id: 'thread-1',
      name: 'Main Thread',
      stopped: true,
      frameId: 'frame-1',
      frames: callstack
    },
    {
      id: 'thread-2',
      name: 'Worker Thread',
      stopped: false,
      frames: []
    },
    {
      id: 'thread-3',
      name: 'Timer Thread',
      stopped: false,
      frames: []
    }
  ];

  // Return the full mock debug state
  return {
    connected: true,
    running: false,
    paused: true,
    variables,
    breakpoints,
    callstack,
    console: consoleMessages,
    watches,
    currentThread: threads[0],
    threads,
    lastException: undefined,
    connectionError: undefined
  };
};

/**
 * Custom hook for managing debug state
 * 
 * @param {Object} initialState - Initial debug state
 * @returns {Object} Debug state and operations
 */
export const useDebugState = (initialState) => {
  // Initialize state with mock data if no initial state provided
  const [state, setState] = useState(() => {
    return initialState ? { ...createMockDebugState(), ...initialState } : createMockDebugState();
  });

  // Available debug commands
  const commands = useMemo(() => ([
    {
      name: 'continue',
      description: 'Continue execution',
      shortcut: 'F5',
      enabled: state.connected && state.paused,
      action: () => executeCommand('continue'),
      category: 'control',
      icon: '▶'
    },
    {
      name: 'pause',
      description: 'Pause execution',
      shortcut: 'F5',
      enabled: state.connected && state.running && !state.paused,
      action: () => executeCommand('pause'),
      category: 'control',
      icon: '⏸'
    },
    {
      name: 'step-over',
      description: 'Step over',
      shortcut: 'F10',
      enabled: state.connected && state.paused,
      action: () => executeCommand('step-over'),
      category: 'control',
      icon: '⤵'
    },
    {
      name: 'step-into',
      description: 'Step into',
      shortcut: 'F11',
      enabled: state.connected && state.paused,
      action: () => executeCommand('step-into'),
      category: 'control',
      icon: '⤷'
    },
    {
      name: 'step-out',
      description: 'Step out',
      shortcut: 'Shift+F11',
      enabled: state.connected && state.paused,
      action: () => executeCommand('step-out'),
      category: 'control',
      icon: '⤴'
    },
    {
      name: 'restart',
      description: 'Restart debugging',
      shortcut: 'Shift+F5',
      enabled: state.connected,
      action: () => executeCommand('restart'),
      category: 'control',
      icon: '🔄'
    },
    {
      name: 'stop',
      description: 'Stop debugging',
      shortcut: 'Shift+F5',
      enabled: state.connected,
      action: () => executeCommand('stop'),
      category: 'control',
      icon: '⏹'
    }
  ]), [state.connected, state.paused, state.running]);

  // Command execution
  const executeCommand = useCallback((command, args = []) => {
    console.log(`Executing debug command: ${command}`, args);
    
    // Mock command execution - in a real implementation this would communicate with a debugger
    switch (command) {
      case 'continue':
        setState(prev => ({
          ...prev,
          paused: false,
          running: true
        }));
        
        // Simulate resuming and pausing at next breakpoint after a delay
        setTimeout(() => {
          setState(prev => {
            // Select a different stack frame for demonstration purposes
            const updatedCallstack = [...prev.callstack];
            updatedCallstack[0] = {
              ...updatedCallstack[0],
              line: 43,
              isCurrent: true
            };
            
            return {
              ...prev,
              paused: true,
              running: false,
              callstack: updatedCallstack
            };
          });
        }, 1000);
        break;
        
      case 'pause':
        setState(prev => ({
          ...prev,
          paused: true,
          running: false
        }));
        break;
        
      case 'step-over':
        setState(prev => {
          // Update current line in stack frame
          const updatedCallstack = [...prev.callstack];
          updatedCallstack[0] = {
            ...updatedCallstack[0],
            line: updatedCallstack[0].line + 1
          };
          
          // Add console message
          const updatedConsole = [...prev.console, {
            id: `msg-${Date.now()}`,
            type: 'result',
            text: `Stepped to line ${updatedCallstack[0].line}`,
            timestamp: new Date(),
            groupLevel: 0
          }];
          
          return {
            ...prev,
            callstack: updatedCallstack,
            console: updatedConsole
          };
        });
        break;
        
      case 'step-into':
        setState(prev => {
          // Simulate stepping into a function by adding a new stack frame
          const newFrame = {
            id: `frame-${Date.now()}`,
            name: 'processItem',
            path: '/Users/sethford/Downloads/Projects/vibex/src/core/usecases/process-item.js',
            line: 12,
            column: 2,
            isCurrent: true,
            context: [
              'function processItem(item) {',
              '  if (!item) {',
              '    throw new Error("Invalid item");',
              '  }',
              '  return {',
              '    ...item,',
              '    processed: true,',
              '    timestamp: Date.now()',
              '  };',
              '}'
            ]
          };
          
          // Update current stack frame
          const updatedCallstack = [
            newFrame,
            ...prev.callstack.map(frame => ({ ...frame, isCurrent: false }))
          ];
          
          // Add console message
          const updatedConsole = [...prev.console, {
            id: `msg-${Date.now()}`,
            type: 'result',
            text: `Stepped into ${newFrame.name} at line ${newFrame.line}`,
            timestamp: new Date(),
            groupLevel: 0
          }];
          
          return {
            ...prev,
            callstack: updatedCallstack,
            console: updatedConsole
          };
        });
        break;
        
      case 'step-out':
        setState(prev => {
          // Simulate stepping out of a function by removing the top stack frame
          if (prev.callstack.length <= 1) {
            return prev;
          }
          
          // Update current stack frame
          const updatedCallstack = [...prev.callstack.slice(1)];
          updatedCallstack[0] = {
            ...updatedCallstack[0],
            isCurrent: true
          };
          
          // Add console message
          const updatedConsole = [...prev.console, {
            id: `msg-${Date.now()}`,
            type: 'result',
            text: `Returned to ${updatedCallstack[0].name} at line ${updatedCallstack[0].line}`,
            timestamp: new Date(),
            groupLevel: 0
          }];
          
          return {
            ...prev,
            callstack: updatedCallstack,
            console: updatedConsole
          };
        });
        break;
        
      case 'restart':
        setState(createMockDebugState());
        break;
        
      case 'stop':
        setState(prev => ({
          ...prev,
          paused: false,
          running: false
        }));
        break;
        
      case 'toggle-breakpoint':
        if (args.length >= 2) {
          const [path, line] = args;
          
          setState(prev => {
            const existingBreakpoint = prev.breakpoints.find(
              bp => bp.path === path && bp.line === line
            );
            
            if (existingBreakpoint) {
              // Remove breakpoint
              const updatedBreakpoints = prev.breakpoints.filter(
                bp => bp.id !== existingBreakpoint.id
              );
              
              return {
                ...prev,
                breakpoints: updatedBreakpoints
              };
            } else {
              // Add breakpoint
              const newBreakpoint = {
                id: `bp-${Date.now()}`,
                path,
                line,
                condition: null,
                enabled: true,
                hitCount: 0
              };
              
              return {
                ...prev,
                breakpoints: [...prev.breakpoints, newBreakpoint]
              };
            }
          });
        }
        break;
        
      default:
        console.log(`Unknown debug command: ${command}`);
    }
  }, []);

  // Update variable
  const updateVariable = useCallback((variable, newValue) => {
    setState(prev => {
      // In a real implementation, this would communicate with a debugger
      
      // Clone the variables array
      const updatedVariables = JSON.parse(JSON.stringify(prev.variables));
      
      // Find and update the variable
      const updateVariableRecursive = (vars, path) => {
        for (let i = 0; i < vars.length; i++) {
          if (vars[i].path === path) {
            // Found the variable, update it
            vars[i].rawValue = newValue;
            vars[i].value = typeof newValue === 'string' ? `"${newValue}"` : String(newValue);
            return true;
          }
          
          // Check children if they exist
          if (vars[i].children) {
            if (updateVariableRecursive(vars[i].children, path)) {
              return true;
            }
          }
        }
        
        return false;
      };
      
      updateVariableRecursive(updatedVariables, variable.path);
      
      return {
        ...prev,
        variables: updatedVariables
      };
    });
  }, []);

  // Toggle variable expansion
  const toggleVariableExpansion = useCallback((variable) => {
    setState(prev => {
      // Clone the variables array
      const updatedVariables = JSON.parse(JSON.stringify(prev.variables));
      
      // Find and toggle the variable
      const toggleVariableRecursive = (vars, path) => {
        for (let i = 0; i < vars.length; i++) {
          if (vars[i].path === path) {
            // Found the variable, toggle expansion
            vars[i].expanded = !vars[i].expanded;
            return true;
          }
          
          // Check children if they exist
          if (vars[i].children) {
            if (toggleVariableRecursive(vars[i].children, path)) {
              return true;
            }
          }
        }
        
        return false;
      };
      
      toggleVariableRecursive(updatedVariables, variable.path);
      
      return {
        ...prev,
        variables: updatedVariables
      };
    });
  }, []);

  // Add breakpoint
  const addBreakpoint = useCallback((path, line, condition = null) => {
    let newBreakpoint;
    
    setState(prev => {
      newBreakpoint = {
        id: `bp-${Date.now()}`,
        path,
        line,
        condition,
        enabled: true,
        hitCount: 0
      };
      
      return {
        ...prev,
        breakpoints: [...prev.breakpoints, newBreakpoint]
      };
    });
    
    return newBreakpoint;
  }, []);

  // Remove breakpoint
  const removeBreakpoint = useCallback((id) => {
    setState(prev => ({
      ...prev,
      breakpoints: prev.breakpoints.filter(bp => bp.id !== id)
    }));
  }, []);

  // Update breakpoint
  const updateBreakpoint = useCallback((id, updates) => {
    let updatedBreakpoint;
    
    setState(prev => {
      const updatedBreakpoints = prev.breakpoints.map(bp => {
        if (bp.id === id) {
          updatedBreakpoint = { ...bp, ...updates };
          return updatedBreakpoint;
        }
        return bp;
      });
      
      return {
        ...prev,
        breakpoints: updatedBreakpoints
      };
    });
    
    return updatedBreakpoint;
  }, []);

  // Add watch
  const addWatch = useCallback((expression) => {
    let newWatch;
    
    setState(prev => {
      newWatch = {
        id: `watch-${Date.now()}`,
        expression,
        value: '...',  // Value would be calculated by debugger
        type: DebugVariableType.UNDEFINED,
        enabled: true,
        showType: true,
        timestamp: new Date()
      };
      
      // Simulate evaluation
      setTimeout(() => {
        setState(prevState => {
          const updatedWatches = prevState.watches.map(w => {
            if (w.id === newWatch.id) {
              // Mock evaluation result
              if (expression === 'items.length') {
                return {
                  ...w,
                  value: '3',
                  type: DebugVariableType.NUMBER
                };
              } else if (expression.includes('nonExistent')) {
                return {
                  ...w,
                  error: 'ReferenceError: Variable not defined',
                  type: DebugVariableType.UNDEFINED
                };
              } else {
                return {
                  ...w,
                  value: '"Mock evaluation result"',
                  type: DebugVariableType.STRING
                };
              }
            }
            return w;
          });
          
          return {
            ...prevState,
            watches: updatedWatches
          };
        });
      }, 500);
      
      return {
        ...prev,
        watches: [...prev.watches, newWatch]
      };
    });
    
    return newWatch;
  }, []);

  // Remove watch
  const removeWatch = useCallback((id) => {
    setState(prev => ({
      ...prev,
      watches: prev.watches.filter(w => w.id !== id)
    }));
  }, []);

  // Update watch
  const updateWatch = useCallback((id, updates) => {
    let updatedWatch;
    
    setState(prev => {
      const updatedWatches = prev.watches.map(w => {
        if (w.id === id) {
          updatedWatch = { ...w, ...updates };
          return updatedWatch;
        }
        return w;
      });
      
      return {
        ...prev,
        watches: updatedWatches
      };
    });
    
    return updatedWatch;
  }, []);

  // Clear console
  const clearConsole = useCallback(() => {
    setState(prev => ({
      ...prev,
      console: []
    }));
  }, []);

  // Select stack frame
  const selectStackFrame = useCallback((frameId) => {
    setState(prev => {
      const updatedCallstack = prev.callstack.map(frame => ({
        ...frame,
        isCurrent: frame.id === frameId
      }));
      
      // Update thread's current frame ID
      const updatedThreads = prev.threads.map(thread => {
        if (thread.id === prev.currentThread?.id) {
          return {
            ...thread,
            frameId,
            frames: updatedCallstack
          };
        }
        return thread;
      });
      
      return {
        ...prev,
        callstack: updatedCallstack,
        threads: updatedThreads,
        currentThread: {
          ...prev.currentThread,
          frameId,
          frames: updatedCallstack
        }
      };
    });
  }, []);

  // Select thread
  const selectThread = useCallback((threadId) => {
    setState(prev => {
      const selectedThread = prev.threads.find(t => t.id === threadId);
      
      if (!selectedThread) {
        return prev;
      }
      
      return {
        ...prev,
        currentThread: selectedThread,
        callstack: selectedThread.frames
      };
    });
  }, []);

  // Open source
  const openSource = useCallback((path, line) => {
    console.log(`Opening source: ${path}:${line}`);
    // In a real implementation, this would load the source file
  }, []);

  return {
    state,
    commands,
    executeCommand,
    updateVariable,
    toggleVariableExpansion,
    addBreakpoint,
    removeBreakpoint,
    updateBreakpoint,
    addWatch,
    removeWatch,
    updateWatch,
    clearConsole,
    selectStackFrame,
    selectThread,
    openSource
  };
};

export default useDebugState;