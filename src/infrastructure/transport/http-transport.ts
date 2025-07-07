/**
 * @license
 * Copyright 2025 VibeX Team
 * SPDX-License-Identifier: MIT
 */

/**
 * HTTP Transport Layer
 * 
 * Provides HTTP-based communication for external APIs
 * following clean architecture principles.
 */

import { logger } from '../../utils/logger.js';

/**
 * HTTP request configuration
 */
export interface HttpRequestConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

/**
 * HTTP response wrapper
 */
export interface HttpResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

/**
 * HTTP error with additional context
 */
export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly response?: any,
    public readonly config?: HttpRequestConfig
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * HTTP client interface
 */
export interface HttpClient {
  request<T = any>(config: HttpRequestConfig): Promise<HttpResponse<T>>;
  get<T = any>(url: string, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>>;
  post<T = any>(url: string, data?: any, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>>;
  put<T = any>(url: string, data?: any, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>>;
  patch<T = any>(url: string, data?: any, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>>;
  delete<T = any>(url: string, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>>;
}

/**
 * Fetch-based HTTP client implementation
 */
export class FetchHttpClient implements HttpClient {
  private defaultConfig: Partial<HttpRequestConfig> = {
    timeout: 30000,
    retries: 3,
    retryDelay: 1000,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'VibeX-CLI/1.0'
    }
  };

  constructor(defaultConfig?: Partial<HttpRequestConfig>) {
    if (defaultConfig) {
      this.defaultConfig = { ...this.defaultConfig, ...defaultConfig };
    }
  }

  async request<T = any>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    const { retries = 3, retryDelay = 1000 } = mergedConfig;

    let lastError: Error;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this.makeRequest<T>(mergedConfig);
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on client errors (4xx)
        if (error instanceof HttpError && error.status >= 400 && error.status < 500) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === retries) {
          break;
        }

        // Wait before retrying
        const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
        logger.warn(`HTTP request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`, {
          url: config.url,
          error: error instanceof Error ? error.message : String(error)
        });
        
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  async get<T = any>(url: string, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'GET' });
  }

  async post<T = any>(url: string, data?: any, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'POST', body: data });
  }

  async put<T = any>(url: string, data?: any, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'PUT', body: data });
  }

  async patch<T = any>(url: string, data?: any, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'PATCH', body: data });
  }

  async delete<T = any>(url: string, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: 'DELETE' });
  }

  private async makeRequest<T>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    const { url, method = 'GET', headers = {}, body, timeout = 30000 } = config;

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Prepare request options
      const requestOptions: RequestInit = {
        method,
        headers: { ...this.defaultConfig.headers, ...headers },
        signal: controller.signal
      };

      // Add body for non-GET requests
      if (body && method !== 'GET') {
        if (typeof body === 'object' && !(body instanceof FormData)) {
          requestOptions.body = JSON.stringify(body);
        } else {
          requestOptions.body = body;
        }
      }

      // Make the request
      const response = await fetch(url, requestOptions);

      // Parse response
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let data: T;
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else if (contentType.includes('text/')) {
        data = await response.text() as any;
      } else {
        data = await response.arrayBuffer() as any;
      }

      // Check for HTTP errors
      if (!response.ok) {
        throw new HttpError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          data,
          config
        );
      }

      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      };

    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }

      // Handle abort/timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new HttpError(`Request timeout after ${timeout}ms`, 408, null, config);
      }

      // Handle network errors
      throw new HttpError(
        `Network error: ${error instanceof Error ? error.message : String(error)}`,
        0,
        null,
        config
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * HTTP client factory
 */
export class HttpClientFactory {
  private static instance: HttpClient;

  static createClient(config?: Partial<HttpRequestConfig>): HttpClient {
    return new FetchHttpClient(config);
  }

  static getDefaultClient(): HttpClient {
    if (!this.instance) {
      this.instance = new FetchHttpClient();
    }
    return this.instance;
  }

  static setDefaultClient(client: HttpClient): void {
    this.instance = client;
  }
}

/**
 * Specialized HTTP clients for different services
 */

/**
 * Anthropic API client
 */
export class AnthropicHttpClient extends FetchHttpClient {
  constructor(apiKey: string) {
    super({
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      timeout: 60000 // Longer timeout for AI requests
    });
  }
}

/**
 * GitHub API client
 */
export class GitHubHttpClient extends FetchHttpClient {
  constructor(token?: string) {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'VibeX-CLI/1.0'
    };

    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    super({
      headers,
      timeout: 30000
    });
  }
}

/**
 * Generic API client with authentication
 */
export class AuthenticatedHttpClient extends FetchHttpClient {
  constructor(
    private authToken: string,
    private authType: 'Bearer' | 'Basic' | 'API-Key' = 'Bearer',
    private authHeader: string = 'Authorization'
  ) {
    super();
  }

  async request<T = any>(config: HttpRequestConfig): Promise<HttpResponse<T>> {
    // Add authentication header
    const authValue = this.authType === 'Bearer' ? `Bearer ${this.authToken}` :
                     this.authType === 'Basic' ? `Basic ${this.authToken}` :
                     this.authToken;

    const authenticatedConfig = {
      ...config,
      headers: {
        ...config.headers,
        [this.authHeader]: authValue
      }
    };

    return super.request<T>(authenticatedConfig);
  }
} 