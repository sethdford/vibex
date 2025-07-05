import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TemplateManager from '../components/TemplateManager';
import { useTheme } from '../theme/ThemeProvider';
import { Colors } from '../colors';

export interface TemplateManagementDemoProps {
  /**
   * Demo mode to showcase different features
   */
  mode?: 'browse' | 'create' | 'search' | 'instantiate' | 'interactive';
  
  /**
   * Whether the demo is focused for input
   */
  isFocused?: boolean;
  
  /**
   * Maximum width for display
   */
  maxWidth?: number;
  
  /**
   * Auto-cycle through demo modes
   */
  autoCycle?: boolean;
  
  /**
   * Cycle interval in milliseconds
   */
  cycleInterval?: number;
}

/**
 * Template Management Demo Component
 * 
 * Demonstrates comprehensive template management capabilities including:
 * - Template browsing and search
 * - Template creation and editing
 * - Template instantiation
 * - Import/export functionality
 * - Real-time updates
 */
export const TemplateManagementDemo: React.FC<TemplateManagementDemoProps> = ({
  mode = 'interactive',
  isFocused = false,
  maxWidth = 120,
  autoCycle = false,
  cycleInterval = 10000,
}) => {
  const { theme } = useTheme();
  const [currentMode, setCurrentMode] = useState(mode);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [createdWorkflows, setCreatedWorkflows] = useState<any[]>([]);
  const [demoStep, setDemoStep] = useState(0);
  const [isRunning, setIsRunning] = useState(autoCycle);
  const [statusMessage, setStatusMessage] = useState('Template Management Demo Ready');

  const demoModes = ['browse', 'create', 'search', 'instantiate'] as const;

  // Auto-cycle through demo modes
  useEffect(() => {
    if (!autoCycle || !isRunning) return;

    const interval = setInterval(() => {
      setCurrentMode(prev => {
        const currentIndex = demoModes.indexOf(prev as any);
        const nextIndex = (currentIndex + 1) % demoModes.length;
        return demoModes[nextIndex];
      });
    }, cycleInterval);

    return () => clearInterval(interval);
  }, [autoCycle, isRunning, cycleInterval]);

  // Handle template selection
  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template);
    setStatusMessage(`Selected template: ${template.metadata.name}`);
  };

  // Handle workflow creation from template
  const handleWorkflowCreate = (workflow: any) => {
    setCreatedWorkflows(prev => [workflow, ...prev.slice(0, 4)]); // Keep last 5
    setStatusMessage(`Created workflow: ${workflow.name}`);
  };

  // Handle keyboard shortcuts
  useInput((input, key) => {
    if (!isFocused) return;

    if (input === 'b') {
      setCurrentMode('browse');
      setStatusMessage('Switched to Browse mode');
    } else if (input === 'c') {
      setCurrentMode('create');
      setStatusMessage('Switched to Create mode');
    } else if (input === 's') {
      setCurrentMode('search');
      setStatusMessage('Switched to Search mode');
    } else if (input === 'i') {
      setCurrentMode('instantiate');
      setStatusMessage('Switched to Instantiate mode');
    } else if (input === 'x') {
      setCurrentMode('interactive');
      setStatusMessage('Switched to Interactive mode');
    } else if (input === 'p') {
      setIsRunning(prev => !prev);
      setStatusMessage(isRunning ? 'Paused auto-cycle' : 'Resumed auto-cycle');
    } else if (input === 'r') {
      setSelectedTemplate(null);
      setCreatedWorkflows([]);
      setDemoStep(0);
      setStatusMessage('Reset demo state');
    } else if (key.ctrl && input === 'h') {
      setStatusMessage('Help: B=Browse, C=Create, S=Search, I=Instantiate, X=Interactive, P=Pause, R=Reset');
    }
  });

  // Render demo status
  const renderDemoStatus = (): React.ReactNode => (
    <Box flexDirection="column" marginBottom={1} borderStyle="single" borderColor="blue">
      <Box>
        <Text color={Colors.Info} bold>🎯 Template Management Demo</Text>
        <Box marginLeft={2}>
          <Text color={Colors.TextDim}>Mode: </Text>
          <Text color={Colors.Success} bold>{currentMode.toUpperCase()}</Text>
        </Box>
      </Box>
      
      <Box marginTop={1}>
        <Text color={Colors.Text}>Status: </Text>
        <Text color={Colors.Info}>{statusMessage}</Text>
      </Box>
      
      {selectedTemplate && (
        <Box marginTop={1}>
          <Text color={Colors.Text}>Selected: </Text>
          <Text color={Colors.Warning}>{selectedTemplate.metadata.name}</Text>
          <Box marginLeft={2}>
            <Text color={Colors.TextDim}>v{selectedTemplate.metadata.version}</Text>
          </Box>
        </Box>
      )}
      
      {createdWorkflows.length > 0 && (
        <Box marginTop={1}>
          <Text color={Colors.Text}>Created Workflows: </Text>
          <Text color={Colors.Success}>{createdWorkflows.length}</Text>
        </Box>
      )}
    </Box>
  );

  // Render controls hint
  const renderControlsHint = (): React.ReactNode => {
    if (!isFocused) return null;
    
    return (
      <Box marginTop={1}>
        <Text color={Colors.TextDim}>
          Controls: B: Browse • C: Create • S: Search • I: Instantiate • X: Interactive • P: Pause • R: Reset • Ctrl+H: Help
        </Text>
      </Box>
    );
  };

  // Render demo-specific content
  const renderDemoContent = (): React.ReactNode => {
    switch (currentMode) {
      case 'browse':
        return (
          <Box flexDirection="column">
            <Box marginBottom={1}>
              <Text color={Colors.Info} bold>📖 Browse Mode</Text>
              <Box marginLeft={2}>
                <Text color={Colors.TextDim}>Showcasing template browsing and filtering</Text>
              </Box>
            </Box>
            
            <TemplateManager
              onTemplateSelect={handleTemplateSelect}
              onWorkflowCreate={handleWorkflowCreate}
            />
          </Box>
        );

      case 'create':
        return (
          <Box flexDirection="column">
            <Box marginBottom={1}>
              <Text color={Colors.Success} bold>➕ Create Mode</Text>
              <Box marginLeft={2}>
                <Text color={Colors.TextDim}>Demonstrating template creation workflow</Text>
              </Box>
            </Box>
            
            <TemplateManager
              onTemplateSelect={handleTemplateSelect}
              onWorkflowCreate={handleWorkflowCreate}
            />
          </Box>
        );

      case 'search':
        return (
          <Box flexDirection="column">
            <Box marginBottom={1}>
              <Text color={Colors.Warning} bold>🔍 Search Mode</Text>
              <Box marginLeft={2}>
                <Text color={Colors.TextDim}>Highlighting search and filter capabilities</Text>
              </Box>
            </Box>
            
            <Box marginBottom={2} borderStyle="single" borderColor="yellow" padding={1}>
              <Text color={Colors.Warning}>Search Features:</Text>
              <Box flexDirection="column" marginTop={1}>
                <Text color={Colors.Text}>• Text search across names, descriptions, and tags</Text>
                <Text color={Colors.Text}>• Category filtering</Text>
                <Text color={Colors.Text}>• Tag-based filtering</Text>
                <Text color={Colors.Text}>• Sorting by name, date, rating</Text>
                <Text color={Colors.Text}>• Real-time filtering</Text>
              </Box>
            </Box>
            
            <TemplateManager
              onTemplateSelect={handleTemplateSelect}
              onWorkflowCreate={handleWorkflowCreate}
            />
          </Box>
        );

      case 'instantiate':
        return (
          <Box flexDirection="column">
            <Box marginBottom={1}>
              <Text color={Colors.Error} bold>⚡ Instantiate Mode</Text>
              <Box marginLeft={2}>
                <Text color={Colors.TextDim}>Showing template-to-workflow conversion</Text>
              </Box>
            </Box>
            
            <Box marginBottom={2} borderStyle="single" borderColor="red" padding={1}>
              <Text color={Colors.Error}>Instantiation Process:</Text>
              <Box flexDirection="column" marginTop={1}>
                <Text color={Colors.Text}>1. Select a template</Text>
                <Text color={Colors.Text}>2. Configure variables (if any)</Text>
                <Text color={Colors.Text}>3. Generate unique workflow instance</Text>
                <Text color={Colors.Text}>4. Apply variable substitution</Text>
                <Text color={Colors.Text}>5. Ready for execution</Text>
              </Box>
            </Box>
            
            {createdWorkflows.length > 0 && (
              <Box marginBottom={2} borderStyle="single" borderColor="green" padding={1}>
                <Text color={Colors.Success}>Recent Workflows:</Text>
                <Box flexDirection="column" marginTop={1}>
                  {createdWorkflows.slice(0, 3).map((workflow, index) => (
                    <Box key={workflow.id}>
                      <Text color={Colors.Text}>• {workflow.name}</Text>
                      <Box marginLeft={2}>
                        <Text color={Colors.TextDim}>ID: {workflow.id}</Text>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
            
            <TemplateManager
              onTemplateSelect={handleTemplateSelect}
              onWorkflowCreate={handleWorkflowCreate}
            />
          </Box>
        );

      case 'interactive':
      default:
        return (
          <Box flexDirection="column">
            <Box marginBottom={1}>
              <Text color={Colors.Info} bold>🎮 Interactive Mode</Text>
              <Box marginLeft={2}>
                <Text color={Colors.TextDim}>Full template management interface</Text>
              </Box>
            </Box>
            
            <Box marginBottom={2} borderStyle="double" borderColor="cyan" padding={1}>
              <Text color={Colors.Info} bold>Template Management Features:</Text>
              <Box flexDirection="column" marginTop={1}>
                <Box>
                  <Text color={Colors.Success}>✓ CRUD Operations</Text>
                  <Box marginLeft={2}>
                    <Text color={Colors.TextDim}>Create, read, update, delete templates</Text>
                  </Box>
                </Box>
                
                <Box marginTop={1}>
                  <Text color={Colors.Success}>✓ Search & Filter</Text>
                  <Box marginLeft={2}>
                    <Text color={Colors.TextDim}>Advanced search with multiple criteria</Text>
                  </Box>
                </Box>
                
                <Box marginTop={1}>
                  <Text color={Colors.Success}>✓ Template Validation</Text>
                  <Box marginLeft={2}>
                    <Text color={Colors.TextDim}>Real-time validation with error reporting</Text>
                  </Box>
                </Box>
                
                <Box marginTop={1}>
                  <Text color={Colors.Success}>✓ Import/Export</Text>
                  <Box marginLeft={2}>
                    <Text color={Colors.TextDim}>JSON-based template sharing</Text>
                  </Box>
                </Box>
                
                <Box marginTop={1}>
                  <Text color={Colors.Success}>✓ Workflow Instantiation</Text>
                  <Box marginLeft={2}>
                    <Text color={Colors.TextDim}>Convert templates to executable workflows</Text>
                  </Box>
                </Box>
              </Box>
            </Box>
            
            <TemplateManager
              onTemplateSelect={handleTemplateSelect}
              onWorkflowCreate={handleWorkflowCreate}
            />
          </Box>
        );
    }
  };

  // Main render
  return (
    <Box flexDirection="column" width={maxWidth}>
      {/* Demo status */}
      {renderDemoStatus()}
      
      {/* Demo content */}
      {renderDemoContent()}
      
      {/* Controls hint */}
      {renderControlsHint()}
    </Box>
  );
};

export default TemplateManagementDemo; 