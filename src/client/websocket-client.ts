import WebSocket from 'ws';
import { WebSocketMessage, ChatMessage } from '../types';

export interface WebSocketConfig {
  baseURL?: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export class RagwallaWebSocket {
  private ws: WebSocket | null = null;
  private baseURL: string;
  private reconnectAttempts: number;
  private reconnectDelay: number;
  private currentAttempts = 0;
  private isManuallyDisconnected = false;
  private listeners: Map<string, Set<Function>> = new Map();

  constructor(config: WebSocketConfig = {}) {
    this.baseURL = config.baseURL || 'wss://api.ragwalla.com';
    this.reconnectAttempts = config.reconnectAttempts || 3;
    this.reconnectDelay = config.reconnectDelay || 1000;
  }

  /**
   * Connect to an agent's WebSocket endpoint
   */
  async connect(agentId: string, connectionId: string, token: string): Promise<void> {
    const url = `${this.baseURL}/v1/agents/${agentId}/${connectionId}?token=${token}`;
    
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);
      
      this.ws.on('open', () => {
        this.currentAttempts = 0;
        this.isManuallyDisconnected = false;
        this.emit('connected', {});
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          this.emit('error', { error: 'Failed to parse message', data: data.toString() });
        }
      });

      this.ws.on('close', (code: number, reason: string) => {
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
      });

      this.ws.on('error', (error) => {
        this.emit('error', { error: error.message });
        reject(error);
      });
    });
  }

  /**
   * Disconnect from the WebSocket
   */
  disconnect(): void {
    this.isManuallyDisconnected = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send a chat message to the agent
   */
  sendMessage(message: ChatMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
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
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    this.ws.send(JSON.stringify(data));
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
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