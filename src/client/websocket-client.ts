import { WebSocketMessage, ChatMessage } from '../types';

// Universal WebSocket interface
interface UniversalWebSocket {
  send(data: string): void;
  close(): void;
  readyState: number;
  addEventListener(type: string, listener: (event: any) => void): void;
  removeEventListener(type: string, listener: (event: any) => void): void;
}

// WebSocket factory function that works in both Node.js and Workers
function createWebSocket(url: string): UniversalWebSocket {
  if (typeof WebSocket !== 'undefined') {
    // Browser/Workers environment
    return new WebSocket(url) as UniversalWebSocket;
  } else {
    // Node.js environment
    try {
      const WS = require('ws');
      const ws = new WS(url);
      
      // Adapt Node.js WebSocket to match browser API
      return {
        send: (data: string) => ws.send(data),
        close: () => ws.close(),
        get readyState() { return ws.readyState; },
        addEventListener: (type: string, listener: (event: any) => void) => {
          if (type === 'open') ws.on('open', listener);
          else if (type === 'message') ws.on('message', (data: any) => listener({ data }));
          else if (type === 'close') ws.on('close', (code: number, reason: string) => listener({ code, reason }));
          else if (type === 'error') ws.on('error', listener);
        },
        removeEventListener: (type: string, listener: (event: any) => void) => {
          if (type === 'open') ws.off('open', listener);
          else if (type === 'message') ws.off('message', listener);
          else if (type === 'close') ws.off('close', listener);
          else if (type === 'error') ws.off('error', listener);
        }
      };
    } catch (error) {
      throw new Error('WebSocket not available in this environment. In Node.js, please install the "ws" package.');
    }
  }
}

export interface WebSocketConfig {
  baseURL: string; // Required - must follow pattern: wss://example.ai.ragwalla.com/v1
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export class RagwallaWebSocket {
  private ws: UniversalWebSocket | null = null;
  private baseURL!: string; // Assigned in validateAndSetWebSocketURL
  private reconnectAttempts: number;
  private reconnectDelay: number;
  private currentAttempts = 0;
  private isManuallyDisconnected = false;
  private listeners: Map<string, Set<Function>> = new Map();
  private eventHandlers: Map<string, (event: any) => void> = new Map();

  constructor(config: WebSocketConfig) {
    this.validateAndSetWebSocketURL(config.baseURL);
    this.reconnectAttempts = config.reconnectAttempts || 3;
    this.reconnectDelay = config.reconnectDelay || 1000;
  }

  private validateAndSetWebSocketURL(baseURL: string): void {
    if (!baseURL) {
      throw new Error('WebSocket baseURL is required');
    }

    // Convert https:// to wss:// if needed and validate pattern
    let wsURL = baseURL;
    if (baseURL.startsWith('https://')) {
      wsURL = baseURL.replace('https://', 'wss://');
    }

    // Validate URL pattern: wss://*.ai.ragwalla.com/v1
    const urlPattern = /^wss:\/\/[a-zA-Z0-9-]+\.ai\.ragwalla\.com\/v1\/?$/;
    
    if (!urlPattern.test(wsURL)) {
      throw new Error(
        'WebSocket baseURL must follow the pattern: wss://example.ai.ragwalla.com/v1\n' +
        `Received: ${wsURL}`
      );
    }

    // Remove trailing slash if present
    this.baseURL = wsURL.replace(/\/$/, '');
  }

  /**
   * Connect to an agent's WebSocket endpoint
   */
  async connect(agentId: string, connectionId: string, token: string): Promise<void> {
    const url = `${this.baseURL}/agents/${agentId}/${connectionId}?token=${token}`;
    
    return new Promise((resolve, reject) => {
      this.ws = createWebSocket(url);
      
      // Create event handlers that we can later remove
      const openHandler = () => {
        this.currentAttempts = 0;
        this.isManuallyDisconnected = false;
        this.emit('connected', {});
        resolve();
      };

      const messageHandler = (event: any) => {
        try {
          const data = event.data || event;
          const messageText = typeof data === 'string' ? data : data.toString();
          const message: WebSocketMessage = JSON.parse(messageText);
          this.handleMessage(message);
        } catch (error) {
          this.emit('error', { error: 'Failed to parse message', data: event.data });
        }
      };

      const closeHandler = (event: any) => {
        const code = event.code || 1000;
        const reason = event.reason || 'Connection closed';
        this.emit('disconnected', { code, reason });
        
        if (!this.isManuallyDisconnected && this.currentAttempts < this.reconnectAttempts) {
          setTimeout(() => {
            this.currentAttempts++;
            this.connect(agentId, connectionId, token).catch(() => {
              if (this.currentAttempts >= this.reconnectAttempts) {
                this.emit('reconnectFailed', { attempts: this.currentAttempts });
              }
            });
          }, this.reconnectDelay * this.currentAttempts);
        }
      };

      const errorHandler = (error: any) => {
        const errorMessage = error.message || error.toString() || 'WebSocket error';
        this.emit('error', { error: errorMessage });
        reject(new Error(errorMessage));
      };

      // Store handlers for cleanup
      this.eventHandlers.set('open', openHandler);
      this.eventHandlers.set('message', messageHandler);
      this.eventHandlers.set('close', closeHandler);
      this.eventHandlers.set('error', errorHandler);

      // Add event listeners
      this.ws.addEventListener('open', openHandler);
      this.ws.addEventListener('message', messageHandler);
      this.ws.addEventListener('close', closeHandler);
      this.ws.addEventListener('error', errorHandler);
    });
  }

  /**
   * Disconnect from the WebSocket
   */
  disconnect(): void {
    this.isManuallyDisconnected = true;
    if (this.ws) {
      // Remove event listeners
      this.eventHandlers.forEach((handler, event) => {
        this.ws!.removeEventListener(event, handler);
      });
      this.eventHandlers.clear();
      
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send a chat message to the agent
   */
  sendMessage(message: ChatMessage): void {
    if (!this.ws || this.ws.readyState !== 1) { // 1 = OPEN
      throw new Error('WebSocket is not connected');
    }

    const payload: WebSocketMessage = {
      type: 'message',
      data: message,
      timestamp: new Date().toISOString()
    };

    this.ws.send(JSON.stringify(payload));
  }

  /**
   * Send raw data to the WebSocket
   */
  send(data: any): void {
    if (!this.ws || this.ws.readyState !== 1) { // 1 = OPEN
      throw new Error('WebSocket is not connected');
    }

    this.ws.send(JSON.stringify(data));
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === 1; // 1 = OPEN
  }

  /**
   * Add event listener
   */
  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  /**
   * Remove event listener
   */
  off(event: string, listener: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
    }
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  private emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'message':
        this.emit('message', message.data);
        break;
      case 'token_usage':
        this.emit('tokenUsage', message.data);
        break;
      case 'error':
        this.emit('error', message.data);
        break;
      case 'connection_status':
        this.emit('connectionStatus', message.data);
        break;
      default:
        this.emit('rawMessage', message);
    }
  }
}