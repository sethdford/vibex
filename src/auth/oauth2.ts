/**
 * OAuth 2.0 Authentication for vibex
 * 
 * Provides OAuth 2.0 authentication with support for:
 * - Authorization code flow
 * - Client credentials flow
 * - Device code flow
 * - Token refresh
 * - Multiple identity providers
 */

import type { Server } from 'http';
import { createServer } from 'http';
import { URL } from 'url';
import open from 'open';
import { logger } from '../utils/logger.js';
import { createUserError } from '../errors/formatter.js';
import { ErrorCategory } from '../errors/types.js';
import { retry } from '../utils/retry.js';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { randomBytes } from 'crypto';

/**
 * OAuth 2.0 provider configurations
 */
export interface OAuth2ProviderConfig {
  /**
   * Provider name
   */
  name: string;
  
  /**
   * Authorization endpoint URL
   */
  authorizationUrl: string;
  
  /**
   * Token endpoint URL
   */
  tokenUrl: string;
  
  /**
   * Revocation endpoint URL
   */
  revocationUrl?: string;
  
  /**
   * Device authorization endpoint URL (for device code flow)
   */
  deviceAuthorizationUrl?: string;
  
  /**
   * OAuth scopes to request
   */
  scopes: string[];
  
  /**
   * Client ID
   */
  clientId: string;
  
  /**
   * Client secret (only for confidential clients)
   */
  clientSecret?: string;
  
  /**
   * Redirect URI for authorization code flow
   */
  redirectUri?: string;
}

/**
 * Common token response properties
 */
export interface TokenResponse {
  /**
   * Access token for API calls
   */
  access_token: string;
  
  /**
   * Token type (usually "Bearer")
   */
  token_type: string;
  
  /**
   * Expiration time in seconds
   */
  expires_in?: number;
  
  /**
   * Refresh token for getting a new access token
   */
  refresh_token?: string;
  
  /**
   * Requested scopes that were granted
   */
  scope?: string;
  
  /**
   * ID token for OpenID Connect
   */
  id_token?: string;
}

/**
 * OAuth 2.0 token with metadata
 */
export interface OAuth2Token extends TokenResponse {
  /**
   * Provider name
   */
  provider: string;
  
  /**
   * Creation timestamp
   */
  created_at: number;
  
  /**
   * Expiration timestamp
   */
  expires_at?: number;
}

/**
 * Device code response
 */
interface DeviceCodeResponse {
  /**
   * Code for verification
   */
  device_code: string;
  
  /**
   * Code for user to enter
   */
  user_code: string;
  
  /**
   * Verification URL
   */
  verification_uri: string;
  
  /**
   * Complete verification URL with code
   */
  verification_uri_complete?: string;
  
  /**
   * Polling interval in seconds
   */
  interval: number;
  
  /**
   * Expiration time in seconds
   */
  expires_in: number;
}

/**
 * OAuth 2.0 auth options
 */
export interface OAuth2Options {
  /**
   * Force re-authentication even if a valid token exists
   */
  forceAuth?: boolean;
  
  /**
   * Use device code flow instead of authorization code flow
   */
  useDeviceFlow?: boolean;
  
  /**
   * Local port to use for the redirect server
   */
  port?: number;
  
  /**
   * Timeout for authentication in milliseconds
   */
  timeout?: number;
  
  /**
   * Custom headers to include in token requests
   */
  headers?: Record<string, string>;
}

interface TokenErrorResponse {
  error: string;
  error_description?: string;
}

interface DeviceCodeErrorResponse {
  error: string;
  error_description?: string;
}

function isTokenErrorResponse(data: unknown): data is TokenErrorResponse {
  return typeof data === 'object' && 
         data !== null && 
         'error' in data && 
         typeof (data as TokenErrorResponse).error === 'string';
}

function isDeviceCodeErrorResponse(data: unknown): data is DeviceCodeErrorResponse {
  return typeof data === 'object' && 
         data !== null && 
         'error' in data && 
         typeof (data as DeviceCodeErrorResponse).error === 'string';
}

function isTokenResponse(data: unknown): data is TokenResponse {
  return typeof data === 'object' && 
         data !== null && 
         'access_token' in data && 
         'token_type' in data &&
         typeof (data as TokenResponse).access_token === 'string' &&
         typeof (data as TokenResponse).token_type === 'string';
}

function isDeviceCodeResponse(data: unknown): data is DeviceCodeResponse {
  return typeof data === 'object' && 
         data !== null && 
         'device_code' in data && 
         'user_code' in data &&
         'verification_uri' in data &&
         'interval' in data &&
         'expires_in' in data &&
         typeof (data as DeviceCodeResponse).device_code === 'string' &&
         typeof (data as DeviceCodeResponse).user_code === 'string';
}

/**
 * OAuth 2.0 authentication manager
 */
export class OAuth2Manager {
  private readonly providers: Map<string, OAuth2ProviderConfig> = new Map();
  private readonly tokens: Map<string, OAuth2Token> = new Map();
  private readonly tokenFilePath: string;
  
  /**
   * Create a new OAuth2 manager
   */
  constructor(configDir?: string) {
    // Set up token storage path
    const storageDir = configDir || path.join(os.homedir(), '.vibex');
    this.tokenFilePath = path.join(storageDir, 'oauth2-tokens.json');
  }
  
  /**
   * Initialize the OAuth2 manager
   */
  async initialize(): Promise<void> {
    // Create the token storage directory if it doesn't exist
    const storageDir = path.dirname(this.tokenFilePath);
    await fs.mkdir(storageDir, { recursive: true });
    
    // Load existing tokens
    await this.loadTokens();
  }
  
  /**
   * Load tokens from storage
   */
  private async loadTokens(): Promise<void> {
    try {
      const data = await fs.readFile(this.tokenFilePath, 'utf8');
      const tokens = JSON.parse(data) as Record<string, OAuth2Token>;
      
      // Clear existing tokens
      this.tokens.clear();
      
      // Add loaded tokens
      Object.entries(tokens).forEach(([provider, token]) => {
        this.tokens.set(provider, token);
      });
      
      logger.debug(`Loaded OAuth tokens for ${this.tokens.size} providers`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.warn('Failed to load OAuth tokens:', error);
      }
    }
  }
  
  /**
   * Save tokens to storage
   */
  private async saveTokens(): Promise<void> {
    try {
      // Convert token map to object
      const tokens: Record<string, OAuth2Token> = {};
      for (const [provider, token] of this.tokens.entries()) {
        tokens[provider] = token;
      }
      
      // Write tokens to file
      await fs.writeFile(this.tokenFilePath, JSON.stringify(tokens, null, 2), 'utf8');
    } catch (error) {
      logger.error('Failed to save OAuth tokens:', error);
    }
  }
  
  /**
   * Register an OAuth 2.0 provider
   */
  registerProvider(config: OAuth2ProviderConfig): void {
    this.providers.set(config.name, config);
    logger.debug(`Registered OAuth provider: ${config.name}`);
  }
  
  /**
   * Get all registered providers
   */
  getProviders(): OAuth2ProviderConfig[] {
    return Array.from(this.providers.values());
  }
  
  /**
   * Get a provider by name
   */
  getProvider(name: string): OAuth2ProviderConfig | undefined {
    return this.providers.get(name);
  }
  
  /**
   * Get a token for a provider
   */
  async getToken(providerName: string, options: OAuth2Options = {}): Promise<OAuth2Token> {
    // Check if we have a provider
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw createUserError(`OAuth provider not found: ${providerName}`, {
        category: ErrorCategory.AUTHENTICATION
      });
    }
    
    // Check if we have a valid token
    const existingToken = this.tokens.get(providerName);
    if (
      existingToken && 
      !options.forceAuth &&
      (!existingToken.expires_at || existingToken.expires_at > Date.now())
    ) {
      return existingToken;
    }
    
    // Check if we have a refresh token
    if (
      existingToken?.refresh_token && 
      !options.forceAuth
    ) {
      try {
        // Try to refresh the token
        const refreshedToken = await this.refreshToken(providerName, existingToken.refresh_token);
        return refreshedToken;
      } catch (error) {
        logger.warn(`Failed to refresh token for ${providerName}:`, error);
        // Continue with authentication
      }
    }
    
    // Authenticate with the provider
    if (options.useDeviceFlow && provider.deviceAuthorizationUrl) {
      return this.authenticateWithDeviceFlow(providerName, options);
    } else if (provider.clientSecret) {
      return this.authenticateWithClientCredentials(providerName);
    } else {
      return this.authenticateWithAuthorizationCode(providerName, options);
    }
  }
  
  /**
   * Authenticate with the authorization code flow
   */
  private async authenticateWithAuthorizationCode(
    providerName: string,
    options: OAuth2Options = {}
  ): Promise<OAuth2Token> {
    const provider = this.providers.get(providerName)!;
    
    // Generate a PKCE code verifier and challenge
    const codeVerifier = randomBytes(64).toString('base64url');
    const codeChallenge = codeVerifier; // In a real implementation, this would be hashed
    
    // Generate state to prevent CSRF
    const state = randomBytes(32).toString('hex');
    
    // Determine the redirect URI
    const redirectUri = provider.redirectUri || `http://localhost:${options.port || 3000}/callback`;
    
    // Create the authorization URL
    const authUrl = new URL(provider.authorizationUrl);
    authUrl.searchParams.set('client_id', provider.clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', provider.scopes.join(' '));
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'plain'); // Should be S256 in production
    
    // Start a local server to receive the callback
    const { promise: serverPromise, server } = this.startLocalServer(
      new URL(redirectUri).port,
      state,
      options.timeout || 300000 // Default 5 minutes
    );
    
    // Open the browser for authentication
    await open(authUrl.toString());
    
    try {
      // Wait for the authorization code
      const code = await serverPromise;
      
      // Exchange the code for tokens
      const tokenResponse = await this.fetchTokenWithAuthCode(
        provider,
        code,
        redirectUri,
        codeVerifier,
        options.headers
      );
      
      // Process and store the token
      return this.processAndStoreToken(providerName, tokenResponse);
    } finally {
      // Ensure server is closed
      server.close();
    }
  }
  
  /**
   * Start a local server to receive the authorization code
   */
  private startLocalServer(
    port: string,
    expectedState: string,
    timeoutMs: number
  ): { promise: Promise<string>; server: Server } {
    return {
      promise: new Promise<string>((resolve, reject) => {
        const server = createServer((req, res) => {
          // Parse the URL
          const url = new URL(req.url || '', `http://localhost:${port}`);
          const code = url.searchParams.get('code');
          const state = url.searchParams.get('state');
          const error = url.searchParams.get('error');
          
          // Send response to browser
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Authentication Complete</title>
                <style>
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 2rem;
                    text-align: center;
                  }
                  .success { color: #28a745; }
                  .error { color: #dc3545; }
                </style>
              </head>
              <body>
                ${error 
                  ? `<h1 class="error">Authentication Failed</h1><p>Error: ${error}</p>` 
                  : `<h1 class="success">Authentication Successful</h1><p>You can now close this window and return to the application.</p>`
                }
              </body>
            </html>
          `);
          
          // Handle errors
          if (error) {
            reject(new Error(`Authentication error: ${error}`));
            return;
          }
          
          // Validate state to prevent CSRF
          if (!state || state !== expectedState) {
            reject(new Error('Invalid state parameter'));
            return;
          }
          
          // Check for authorization code
          if (!code) {
            reject(new Error('No authorization code received'));
            return;
          }
          
          // Return the authorization code
          resolve(code);
        });
        
        // Start the server
        server.listen(port);
        
        // Set a timeout
        const timeoutId = setTimeout(() => {
          server.close();
          reject(new Error(`Authentication timed out after ${timeoutMs / 1000} seconds`));
        }, timeoutMs);
        
        // Clear timeout when server closes
        server.on('close', () => {
          clearTimeout(timeoutId);
        });
        
        // Handle server errors
        server.on('error', error => {
          clearTimeout(timeoutId);
          reject(error);
        });
      }),
      server: {} as Server // This will be set after server creation
    };
  }
  
  /**
   * Fetch a token using an authorization code
   */
  private async fetchTokenWithAuthCode(
    provider: OAuth2ProviderConfig,
    code: string,
    redirectUri: string,
    codeVerifier: string,
    headers?: Record<string, string>
  ): Promise<TokenResponse> {
    // Create token request body
    const body = new URLSearchParams();
    body.append('grant_type', 'authorization_code');
    body.append('code', code);
    body.append('redirect_uri', redirectUri);
    body.append('client_id', provider.clientId);
    body.append('code_verifier', codeVerifier);
    
    // Include client secret if available
    if (provider.clientSecret) {
      body.append('client_secret', provider.clientSecret);
    }
    
    // Make token request
    const response = await fetch(provider.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...headers
      },
      body: body.toString()
    });
    
    // Handle errors
    if (!response.ok) {
      const errorData = await response.json();
      if (isTokenErrorResponse(errorData)) {
        throw new Error(`Token request failed: ${errorData.error} - ${errorData.error_description || 'Unknown error'}`);
      }
      throw new Error('Token request failed with unknown error');
    }
    
    // Parse token response
    const tokenData = await response.json();
    if (!isTokenResponse(tokenData)) {
      throw new Error('Invalid token response format');
    }
    return tokenData;
  }
  
  /**
   * Authenticate with the device code flow
   */
  private async authenticateWithDeviceFlow(
    providerName: string,
    options: OAuth2Options = {}
  ): Promise<OAuth2Token> {
    const provider = this.providers.get(providerName)!;
    
    if (!provider.deviceAuthorizationUrl) {
      throw createUserError(`Provider ${providerName} does not support device code flow`, {
        category: ErrorCategory.AUTHENTICATION
      });
    }
    
    // Request device code
    const deviceCodeResponse = await this.requestDeviceCode(
      provider,
      options.headers
    );
    
    // Display instructions to the user
    this.displayDeviceCodeInstructions(deviceCodeResponse);
    
    // Poll for token
    const tokenResponse = await this.pollForDeviceToken(
      provider,
      deviceCodeResponse,
      options.headers
    );
    
    // Process and store the token
    return this.processAndStoreToken(providerName, tokenResponse);
  }
  
  /**
   * Request a device code for authentication
   */
  private async requestDeviceCode(
    provider: OAuth2ProviderConfig,
    headers?: Record<string, string>
  ): Promise<DeviceCodeResponse> {
    // Create request body
    const body = new URLSearchParams();
    body.append('client_id', provider.clientId);
    body.append('scope', provider.scopes.join(' '));
    
    // Make request
    const response = await fetch(provider.deviceAuthorizationUrl!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...headers
      },
      body: body.toString()
    });
    
    // Handle errors
    if (!response.ok) {
      const errorData = await response.json();
      if (isDeviceCodeErrorResponse(errorData)) {
        throw new Error(`Device code request failed: ${errorData.error} - ${errorData.error_description || 'Unknown error'}`);
      }
      throw new Error('Device code request failed with unknown error');
    }
    
    // Parse response
    const deviceData = await response.json();
    if (!isDeviceCodeResponse(deviceData)) {
      throw new Error('Invalid device code response format');
    }
    return deviceData;
  }
  
  /**
   * Display device code instructions to the user
   */
  private displayDeviceCodeInstructions(response: DeviceCodeResponse): void {
    const { verification_uri, user_code, verification_uri_complete } = response;
    
    console.log('\n🔐 Device Authentication Required\n');
    console.log(`To authenticate, visit: ${verification_uri}`);
    console.log(`And enter code: ${user_code}`);
    
    if (verification_uri_complete) {
      console.log(`\nOr visit this URL directly: ${verification_uri_complete}`);
    }
    
    console.log(`\nWaiting for authentication...`);
    
    // Try to open the verification URL for the user
    try {
      open(verification_uri_complete || verification_uri);
    } catch (error) {
      logger.debug('Failed to open browser:', error);
    }
  }
  
  /**
   * Poll for a token using the device code
   */
  private async pollForDeviceToken(
    provider: OAuth2ProviderConfig,
    deviceCode: DeviceCodeResponse,
    headers?: Record<string, string>
  ): Promise<TokenResponse> {
    const { device_code, interval, expires_in } = deviceCode;
    const pollingInterval = interval * 1000; // Convert to milliseconds
    const expiresAt = Date.now() + expires_in * 1000;
    
    // Create request body
    const body = new URLSearchParams();
    body.append('grant_type', 'urn:ietf:params:oauth:grant-type:device_code');
    body.append('device_code', device_code);
    body.append('client_id', provider.clientId);
    
    // Include client secret if available
    if (provider.clientSecret) {
      body.append('client_secret', provider.clientSecret);
    }
    
    // Poll until token is granted or times out
    while (Date.now() < expiresAt) {
      try {
        // Request token
        const response = await fetch(provider.tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...headers
          },
          body: body.toString()
        });
        
        // Check for success
        if (response.ok) {
          return (await response.json()) as TokenResponse;
        }
        
        // Parse error
        const errorData = await response.json() as any;
        const error = errorData.error;
        
        // Handle known error codes
        if (error === 'authorization_pending') {
          // User hasn't approved yet, continue polling
          await new Promise(resolve => setTimeout(resolve, pollingInterval));
          continue;
        } else if (error === 'slow_down') {
          // Server asks to slow down, add 5 seconds to interval
          await new Promise(resolve => setTimeout(resolve, pollingInterval + 5000));
          continue;
        } else if (error === 'expired_token' || error === 'access_denied') {
          // Token expired or user denied access
          throw createUserError(`Authentication failed: ${errorData.error_description || error}`, {
            category: ErrorCategory.AUTHENTICATION
          });
        } else {
          // Other errors
          throw createUserError(`Token request failed: ${errorData.error_description || error}`, {
            category: ErrorCategory.AUTHENTICATION
          });
        }
      } catch (error) {
        if (error instanceof Error && 'category' in error) {
          throw error; // Re-throw user errors
        }
        
        // For network errors, retry after the polling interval
        logger.debug('Error polling for token:', error);
        await new Promise(resolve => setTimeout(resolve, pollingInterval));
      }
    }
    
    // Timeout reached
    throw createUserError('Device code authentication timed out', {
      category: ErrorCategory.AUTHENTICATION
    });
  }
  
  /**
   * Authenticate with client credentials
   */
  private async authenticateWithClientCredentials(
    providerName: string
  ): Promise<OAuth2Token> {
    const provider = this.providers.get(providerName)!;
    
    if (!provider.clientSecret) {
      throw createUserError(`Provider ${providerName} requires a client secret for client credentials flow`, {
        category: ErrorCategory.AUTHENTICATION
      });
    }
    
    // Create token request body
    const body = new URLSearchParams();
    body.append('grant_type', 'client_credentials');
    body.append('client_id', provider.clientId);
    body.append('client_secret', provider.clientSecret);
    body.append('scope', provider.scopes.join(' '));
    
    // Make token request
    const response = await fetch(provider.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });
    
    // Handle errors
    if (!response.ok) {
      let errorText: string;
      try {
        const errorData = await response.json() as any;
        errorText = errorData?.error_description || errorData?.error || 'Unknown error';
      } catch {
        errorText = await response.text();
      }
      
      throw createUserError(`Client credentials authentication failed: ${errorText}`, {
        category: ErrorCategory.AUTHENTICATION
      });
    }
    
    // Parse token response
    const tokenResponse = await response.json() as TokenResponse;
    
    // Process and store the token
    return this.processAndStoreToken(providerName, tokenResponse);
  }
  
  /**
   * Refresh an OAuth token
   */
  private async refreshToken(
    providerName: string,
    refreshToken: string
  ): Promise<OAuth2Token> {
    const provider = this.providers.get(providerName)!;
    
    // Create token request body
    const body = new URLSearchParams();
    body.append('grant_type', 'refresh_token');
    body.append('refresh_token', refreshToken);
    body.append('client_id', provider.clientId);
    
    // Include client secret if available
    if (provider.clientSecret) {
      body.append('client_secret', provider.clientSecret);
    }
    
    // Use retry for token refresh to handle transient failures
    const tokenResponse = await retry(async () => {
      const response = await fetch(provider.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });
      
      // Handle errors
      if (!response.ok) {
        let errorText: string;
        try {
          const errorData = await response.json() as any;
          errorText = errorData?.error_description || errorData?.error || 'Unknown error';
        } catch {
          errorText = await response.text();
        }
        
        throw createUserError(`Token refresh failed: ${errorText}`, {
          category: ErrorCategory.AUTHENTICATION
        });
      }
      
      // Parse token response
      return await response.json() as TokenResponse;
    }, {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 5000
    });
    
    // If the response doesn't include a refresh token, keep the old one
    const tokenData = tokenResponse as TokenResponse;
    if (!tokenData.refresh_token && refreshToken) {
      tokenData.refresh_token = refreshToken;
    }
    
    // Process and store the token
    return this.processAndStoreToken(providerName, tokenData);
  }
  
  /**
   * Process and store a token response
   */
  private processAndStoreToken(
    providerName: string,
    tokenResponse: TokenResponse
  ): OAuth2Token {
    const now = Date.now();
    
    // Create the token object
    const token: OAuth2Token = {
      ...tokenResponse,
      provider: providerName,
      created_at: now
    };
    
    // Calculate expiration time
    if (tokenResponse.expires_in) {
      token.expires_at = now + tokenResponse.expires_in * 1000;
    }
    
    // Store the token
    this.tokens.set(providerName, token);
    
    // Save tokens to storage
    this.saveTokens();
    
    return token;
  }
  
  /**
   * Revoke a token
   */
  async revokeToken(providerName: string): Promise<boolean> {
    const provider = this.providers.get(providerName);
    const token = this.tokens.get(providerName);
    
    if (!provider || !token) {
      return false;
    }
    
    // Remove token from memory
    this.tokens.delete(providerName);
    
    // Save tokens to storage
    await this.saveTokens();
    
    // If provider has a revocation endpoint, revoke the token
    if (provider.revocationUrl && token.access_token) {
      try {
        // Create revocation request body
        const body = new URLSearchParams();
        body.append('token', token.access_token);
        body.append('token_type_hint', 'access_token');
        body.append('client_id', provider.clientId);
        
        if (provider.clientSecret) {
          body.append('client_secret', provider.clientSecret);
        }
        
        // Make revocation request
        const response = await fetch(provider.revocationUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: body.toString()
        });
        
        // Check for success
        return response.ok;
      } catch (error) {
        logger.warn(`Failed to revoke token for ${providerName}:`, error);
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Clear all tokens
   */
  async clearTokens(): Promise<void> {
    this.tokens.clear();
    await this.saveTokens();
  }
}

// Export singleton instance
export const oauth2Manager = new OAuth2Manager();