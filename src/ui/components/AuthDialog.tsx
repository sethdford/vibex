/**
 * Authentication Dialog Component
 * 
 * Manages authentication flow with different methods (API key, OAuth, device code)
 * and provides a user-friendly interface with keyboard navigation, help text,
 * and error handling.
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Colors } from '../colors.js';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';

export enum AuthMethod {
  API_KEY = 'api_key',
  OAUTH = 'oauth',
  DEVICE_CODE = 'device_code',
  SYSTEM_KEYCHAIN = 'system_keychain',
}

/**
 * Authentication provider information
 */
export interface AuthProvider {
  /**
   * Provider ID
   */
  id: string;
  
  /**
   * Display name
   */
  name: string;
  
  /**
   * Provider description
   */
  description?: string;
  
  /**
   * Authentication method
   */
  method: AuthMethod;
  
  /**
   * Provider icon
   */
  icon?: string;
}

interface AuthDialogProps {
  /**
   * Called when authentication is attempted
   */
  onAuthenticate: (method: AuthMethod, providerId?: string, apiKey?: string) => Promise<boolean>;
  
  /**
   * Called when dialog is cancelled
   */
  onCancel: () => void;
  
  /**
   * Available authentication providers
   */
  providers?: AuthProvider[];
  
  /**
   * Initial error message to display
   */
  initialError?: string | null;
  
  /**
   * Whether the dialog has focus
   */
  isFocused?: boolean;
  
  /**
   * Maximum width of the dialog
   */
  maxWidth?: number;
}

/**
 * Enhanced authentication dialog with multiple providers and methods
 */
export const AuthDialog: React.FC<AuthDialogProps> = ({
  onAuthenticate,
  onCancel,
  providers = [
    { id: 'api_key', name: 'API Key', method: AuthMethod.API_KEY },
    { id: 'oauth', name: 'OAuth', method: AuthMethod.OAUTH },
    { id: 'device', name: 'Device Code', method: AuthMethod.DEVICE_CODE }
  ],
  initialError = null,
  isFocused = true,
  maxWidth = 80
}) => {
  const [step, setStep] = useState<'method' | 'apiKey' | 'authenticating'>('method');
  const [selectedProvider, setSelectedProvider] = useState<AuthProvider>(providers[0]);
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(initialError);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Help text state
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // Handle keyboard navigation
  useInput((input, key) => {
    if (!isFocused) return;
    
    if (step === 'method') {
      if (key.upArrow || input === 'k') {
        setSelectedIndex(prev => Math.max(0, prev - 1));
        setSelectedProvider(providers[Math.max(0, selectedIndex - 1)]);
      }
      if (key.downArrow || input === 'j') {
        setSelectedIndex(prev => Math.min(providers.length - 1, prev + 1));
        setSelectedProvider(providers[Math.min(providers.length - 1, selectedIndex + 1)]);
      }
      if (key.return) {
        const provider = providers[selectedIndex];
        if (provider.method === AuthMethod.API_KEY) {
          setStep('apiKey');
        } else {
          setStep('authenticating');
          handleAuthenticate(provider.method, provider.id);
        }
      }
      // Toggle help with '?'
      if (input === '?') {
        setShowHelp(prev => !prev);
      }
    }

    // Handle cancel with Escape
    if (key.escape) {
      onCancel();
    }
  });

  const handleAuthenticate = async (method?: AuthMethod, providerId?: string) => {
    setError(null);
    setStep('authenticating');
    
    const authMethod = method || selectedProvider.method;
    const provId = providerId || selectedProvider.id;
    
    try {
      const success = await onAuthenticate(
        authMethod, 
        provId,
        authMethod === AuthMethod.API_KEY ? apiKey : undefined
      );
      
      if (!success) {
        setError('Authentication failed. Please try again.');
        setStep(authMethod === AuthMethod.API_KEY ? 'apiKey' : 'method');
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
      setStep(authMethod === AuthMethod.API_KEY ? 'apiKey' : 'method');
    }
  };

  const handleApiKeySubmit = (value: string) => {
    setApiKey(value);
    handleAuthenticate();
  };

  // Render Method Selection
  if (step === 'method') {
    return (
      <Box 
        flexDirection="column" 
        borderStyle="round" 
        borderColor={isFocused ? Colors.Primary : Colors.Gray600} 
        padding={1}
        width={Math.min(maxWidth, 100)}
      >
        <Box marginBottom={1}>
          <Text bold>Authentication Required</Text>
          <Box flexGrow={1} />
          {isFocused && (
            <Text color={Colors.TextDim}>
              Press ? for help
            </Text>
          )}
        </Box>
        
        <Box marginBottom={1}>
          <Text>Select authentication method:</Text>
        </Box>
        
        {/* Provider list */}
        <Box flexDirection="column">
          {providers.map((provider, index) => (
            <Box 
              key={provider.id} 
              marginLeft={2} 
              marginBottom={1}
              paddingX={1}
              paddingY={1}
            >
              {/* Provider name with icon */}
              <Box>
                {provider.icon && (
                  <Text color={index === selectedIndex ? Colors.Primary : Colors.TextDim}>
                    {provider.icon} 
                  </Text>
                )}
                <Text 
                  color={index === selectedIndex ? Colors.Primary : undefined}
                  bold={index === selectedIndex}
                >
                  {provider.name}
                </Text>
              </Box>
              
              {/* Provider description */}
              {provider.description && (
                <Box marginLeft={2} marginTop={1}>
                  <Text color={Colors.TextDim}>{provider.description}</Text>
                </Box>
              )}
              
              {/* Help text for selected provider when help is toggled */}
              {index === selectedIndex && showHelp && (
                <Box marginLeft={2} marginTop={1} flexDirection="column">
                  <Text color={Colors.Info}>
                    {provider.method === AuthMethod.API_KEY && 'Enter your API key to authenticate'}
                    {provider.method === AuthMethod.OAUTH && 'Browser-based OAuth authentication'}
                    {provider.method === AuthMethod.DEVICE_CODE && 'Device code authentication for headless systems'}
                    {provider.method === AuthMethod.SYSTEM_KEYCHAIN && 'Use credentials from system keychain'}
                  </Text>
                </Box>
              )}
            </Box>
          ))}
        </Box>
        
        {error && (
          <Box marginTop={1}>
            <Text color={Colors.Error}>{error}</Text>
          </Box>
        )}
        
        <Box marginTop={1}>
          <Text color={Colors.TextDim}>
            {isFocused ? 'Press [↑/↓] to navigate, [Enter] to select, [?] for help, [Esc] to cancel' : 'Dialog not focused'}
          </Text>
        </Box>
        
        {/* Privacy policy notice */}
        <Box marginTop={1} flexDirection="column">
          <Text>By continuing, you agree to the Terms of Service and Privacy Policy</Text>
          <Text color={Colors.Info} underline>
            https://vibex.docs/privacy
          </Text>
        </Box>
      </Box>
    );
  }
  
  // Render API Key Input
  if (step === 'apiKey') {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor={Colors.Primary} padding={1}>
        <Box marginBottom={1}>
          <Text bold>Enter API Key</Text>
        </Box>
        
        <Box marginBottom={1}>
          <Text>API Key: </Text>
          <TextInput 
            value={apiKey} 
            onChange={setApiKey} 
            onSubmit={handleApiKeySubmit} 
            mask="*"
          />
        </Box>
        
        {error && (
          <Box marginTop={1}>
            <Text color={Colors.Error}>{error}</Text>
          </Box>
        )}
        
        <Box marginTop={1}>
          <Text dimColor>Press [Enter] to submit, [Esc] to cancel</Text>
        </Box>
      </Box>
    );
  }
  
  // Render Authentication in Progress
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={Colors.Primary} padding={1}>
      <Box marginBottom={1}>
        <Text bold>Authenticating...</Text>
      </Box>
      
      <Box>
        <Text color={Colors.AccentBlue}>
          <Spinner type="dots" />
        </Text>
        <Text> {selectedProvider.method === AuthMethod.API_KEY ? 'Verifying API key' : 'Authenticating with OAuth'}</Text>
      </Box>
      
      {error && (
        <Box marginTop={1}>
          <Text color={Colors.Error}>{error}</Text>
        </Box>
      )}
    </Box>
  );
};

export default AuthDialog;