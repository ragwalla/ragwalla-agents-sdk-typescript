import { RagwallaConfig, RagwallaError } from '../types';

export class HTTPClient {
  private apiKey: string;
  private baseURL!: string; // Assigned in validateAndSetBaseURL
  private timeout: number;

  constructor(config: RagwallaConfig) {
    this.apiKey = config.apiKey;
    this.validateAndSetBaseURL(config.baseURL);
    this.timeout = config.timeout || 30000;
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
      const error = await response.json().catch(() => ({}));
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getHeaders(),
        signal: controller.signal
      });

      return this.handleResponse<T>(response);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async post<T>(path: string, data?: any): Promise<T> {
    const url = new URL(path, this.baseURL);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal
      });

      return this.handleResponse<T>(response);
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

  async delete<T>(path: string): Promise<T> {
    const url = new URL(path, this.baseURL);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: 'DELETE',
        headers: this.getHeaders(),
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