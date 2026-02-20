import { RagwallaConfig, RagwallaError } from '../types';

export class HTTPClient {
  private apiKey: string;
  private baseURL!: string; // Assigned in validateAndSetBaseURL
  private timeout: number;
  private debug: boolean;

  constructor(config: RagwallaConfig) {
    this.apiKey = config.apiKey;
    this.validateAndSetBaseURL(config.baseURL);
    this.timeout = config.timeout || 30000;
    this.debug = config.debug || false;
  }

  private log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (!this.debug) return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[Ragwalla HTTP ${timestamp}]`;
    
    if (data) {
      console[level](`${prefix} ${message}`, data);
    } else {
      console[level](`${prefix} ${message}`);
    }
  }

  private validateAndSetBaseURL(baseURL: string): void {
    if (!baseURL) {
      throw new Error('baseURL is required');
    }

    // Validate URL pattern: https://*.ai.ragwalla.com/v1
    const urlPattern = /^https:\/\/[a-zA-Z0-9-]+\.ai\.ragwalla\.com\/v1\/?$/;
    
    if (!urlPattern.test(baseURL)) {
      throw new Error(
        'baseURL must follow the pattern: https://example.ai.ragwalla.com/v1\n' +
        `Received: ${baseURL}`
      );
    }

    // Remove trailing slash if present
    this.baseURL = baseURL.replace(/\/$/, '');
  }

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'ragwalla-agents-sdk-typescript/1.0.0'
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      // ragwalla-hono-worker wraps errors in { error: { message, type, code } }
      const error = body.error || body;
      throw new RagwallaAPIError(
        error.message || `HTTP ${response.status}`,
        response.status,
        error.type,
        error.code,
        error.param
      );
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    
    return response.text() as unknown as T;
  }

  async get<T>(path: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(path, this.baseURL);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    this.log('info', 'Making GET request', { url: url.toString(), params });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      this.log('error', 'Request timeout reached', { url: url.toString(), timeout: this.timeout });
      controller.abort();
    }, this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal
      });

      this.log('info', 'GET request completed', { 
        url: url.toString(), 
        status: response.status, 
        statusText: response.statusText 
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      this.log('error', 'GET request failed', { url: url.toString(), error });
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async post<T>(path: string, data?: any): Promise<T> {
    const url = new URL(path, this.baseURL);
    
    this.log('info', 'Making POST request', { url: url.toString(), hasData: !!data });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      this.log('error', 'Request timeout reached', { url: url.toString(), timeout: this.timeout });
      controller.abort();
    }, this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal
      });

      this.log('info', 'POST request completed', { 
        url: url.toString(), 
        status: response.status, 
        statusText: response.statusText 
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      this.log('error', 'POST request failed', { url: url.toString(), error });
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async put<T>(path: string, data?: any): Promise<T> {
    const url = new URL(path, this.baseURL);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: 'PUT',
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal
      });

      return this.handleResponse<T>(response);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async delete<T>(path: string, data?: any): Promise<T> {
    const url = new URL(path, this.baseURL);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: 'DELETE',
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal
      });

      return this.handleResponse<T>(response);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async postEventStream<T>(path: string, data?: any): Promise<ReadableStream<T>> {
    const url = new URL(path, this.baseURL);
    
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Accept': 'text/event-stream',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new RagwallaAPIError(
        error.message || `HTTP ${response.status}`,
        response.status,
        error.type,
        error.code,
        error.param
      );
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    return response.body.pipeThrough(new TransformStream({
      transform(chunk, controller) {
        const decoder = new TextDecoder();
        const text = decoder.decode(chunk);
        const lines = text.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              controller.enqueue(data);
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    }));
  }
}

export class RagwallaAPIError extends Error implements RagwallaError {
  public readonly type: string;
  public readonly code?: string;
  public readonly param?: string;
  public readonly status?: number;

  constructor(
    message: string,
    status?: number,
    type?: string,
    code?: string,
    param?: string
  ) {
    super(message);
    this.name = 'RagwallaAPIError';
    this.status = status;
    this.type = type || 'api_error';
    this.code = code;
    this.param = param;
  }
}