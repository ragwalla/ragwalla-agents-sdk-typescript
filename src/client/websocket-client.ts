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
  debug?: boolean; // Enable debug logging
  continuationMode?: 'auto' | 'manual';
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
  private debug: boolean;
  private continuationMode: 'auto' | 'manual';

  constructor(config: WebSocketConfig) {
    this.validateAndSetWebSocketURL(config.baseURL);
    this.reconnectAttempts = config.reconnectAttempts || 3;
    this.reconnectDelay = config.reconnectDelay || 1000;
    this.debug = config.debug || false;
    this.continuationMode = config.continuationMode === 'manual' ? 'manual' : 'auto';
  }

  private log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (!this.debug) return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[Ragwalla WebSocket ${timestamp}]`;
    
    if (data) {
      console[level](`${prefix} ${message}`, data);
    } else {
      console[level](`${prefix} ${message}`);
    }
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
   * @param agentId - The agent to connect to
   * @param connectionId - Connection identifier (used for DO routing)
   * @param token - Authentication token
   * @param threadId - Optional Ragwalla thread ID. If provided, resumes that thread. If omitted, a new thread is created on first message.
   */
  async connect(agentId: string, connectionId: string, token: string, threadId?: string): Promise<void> {
    const params = new URLSearchParams({
      token,
      continuation_mode: this.continuationMode
    });
    if (threadId) {
      params.set('thread_id', threadId);
    }
    const url = `${this.baseURL}/agents/${agentId}/${connectionId}?${params.toString()}`;
    
    this.log('info', 'Attempting to connect to WebSocket', { 
      url, 
      agentId, 
      connectionId,
      tokenLength: token.length,
      continuationMode: this.continuationMode
    });
    
    return new Promise((resolve, reject) => {
      this.ws = createWebSocket(url);
      
      // Create event handlers that we can later remove
      const openHandler = () => {
        this.log('info', 'WebSocket connection opened successfully');
        this.currentAttempts = 0;
        this.isManuallyDisconnected = false;
        this.emit('connected', {});
        resolve();
      };

      const messageHandler = (event: any) => {
        try {
          const data = event.data || event;
          const messageText = typeof data === 'string' ? data : data.toString();
          this.log('info', 'Received WebSocket message', { messageText });
          
          const message: WebSocketMessage = JSON.parse(messageText);
          this.log('info', 'Parsed WebSocket message', { type: message.type, dataKeys: Object.keys(message.data || {}) });
          this.handleMessage(message);
        } catch (error) {
          this.log('error', 'Failed to parse WebSocket message', { error, rawData: event.data });
          this.emit('error', { error: 'Failed to parse message', data: event.data });
        }
      };

      const closeHandler = (event: any) => {
        const code = event.code || 1000;
        const reason = event.reason || 'Connection closed';
        this.log('warn', 'WebSocket connection closed', { code, reason });
        this.emit('disconnected', { code, reason });
        
        if (!this.isManuallyDisconnected && this.currentAttempts < this.reconnectAttempts) {
          const delay = this.reconnectDelay * this.currentAttempts;
          this.log('info', `Attempting reconnection ${this.currentAttempts + 1}/${this.reconnectAttempts} in ${delay}ms`);
          
          setTimeout(() => {
            this.currentAttempts++;
            this.connect(agentId, connectionId, token).catch(() => {
              if (this.currentAttempts >= this.reconnectAttempts) {
                this.log('error', 'All reconnection attempts failed', { attempts: this.currentAttempts });
                this.emit('reconnectFailed', { attempts: this.currentAttempts });
              }
            });
          }, delay);
        }
      };

      const errorHandler = (error: any) => {
        const errorMessage = error.message || error.toString() || 'WebSocket error';
        this.log('error', 'WebSocket error occurred', { error: errorMessage, fullError: error });
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
   * 
   * Note: The server expects content at the top level, not nested in a data object.
   * Format: { type: 'message', content: '...', role: '...', timestamp: '...' }
   */
  sendMessage(message: ChatMessage): void {
    if (!this.ws || this.ws.readyState !== 1) { // 1 = OPEN
      this.log('error', 'Cannot send message - WebSocket not connected', { 
        readyState: this.ws?.readyState, 
        message 
      });
      throw new Error('WebSocket is not connected');
    }

    // Server expects content at top level, not nested in data object
    const payload = {
      type: 'message',
      content: message.content,
      role: message.role,
      timestamp: new Date().toISOString(),
      // Include optional fields if provided
      ...(message.metadata && { metadata: message.metadata })
    };

    this.log('info', 'Sending WebSocket message', { payload });
    this.ws.send(JSON.stringify(payload));
  }

  /**
   * Send raw data to the WebSocket
   */
  send(data: any): void {
    if (!this.ws || this.ws.readyState !== 1) { // 1 = OPEN
      this.log('error', 'Cannot send data - WebSocket not connected', { 
        readyState: this.ws?.readyState, 
        data 
      });
      throw new Error('WebSocket is not connected');
    }

    this.log('info', 'Sending raw WebSocket data', { data });
    this.ws.send(JSON.stringify(data));
  }

  /**
   * Update the continuation mode used for this connection.
   * When connected, this will notify the agent immediately.
   */
  setContinuationMode(mode: 'auto' | 'manual'): void {
    const normalized = mode === 'manual' ? 'manual' : 'auto';
    this.continuationMode = normalized;

    if (this.isConnected()) {
      this.log('info', 'Sending continuation mode update', { mode: normalized });
      this.send({
        type: 'set_continuation_mode',
        mode: normalized
      });
    } else {
      this.log('info', 'Continuation mode updated (will apply on next connect)', { mode: normalized });
    }
  }

  /**
   * Request the agent to resume a paused run (manual continuation mode).
   */
  continueRun(runId: string): void {
    if (!runId) {
      throw new Error('runId is required to continue a run');
    }

    this.log('info', 'Sending continue run request', { runId });
    this.send({
      type: 'continue_run',
      runId
    });
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
      case 'chat_message':
        // Server sends content at top level, not in data wrapper
        const messageData = message.data || {
          content: message.content,
          role: message.role,
          threadId: message.threadId,
          messageId: message.messageId
        };
        this.emit('message', messageData);
        break;
      case 'chunk':
        // Streaming message chunk from server
        this.emit('chunk', {
          content: (message as any).content,
          messageId: (message as any).messageId
        });
        // Also emit as message for compatibility
        this.emit('message', {
          content: (message as any).content,
          role: 'assistant',
          messageId: (message as any).messageId
        });
        break;
      case 'complete':
        // Message completion event
        this.emit('complete', {
          messageId: (message as any).messageId
        });
        break;
      case 'message_created':
        // New message created event
        this.emit('messageCreated', {
          messageId: (message as any).messageId,
          role: (message as any).role
        });
        break;
      case 'thread_info':
        // Thread information
        this.emit('threadInfo', message.data || message);
        break;
      case 'thread_history':
        // Historical messages for the current thread
        this.emit('threadHistory', {
          threadId: (message as any).threadId,
          messages: (message as any).messages || [],
          messageCount: (message as any).messageCount || 0
        });
        break;
      case 'typing':
        // Typing indicator
        this.emit('typing', {
          isTyping: (message as any).isTyping
        });
        break;
      case 'tool_use':
        // Tool usage information
        this.emit('toolUse', {
          tools: (message as any).tools
        });
        break;
      case 'status':
        // Transient status update (e.g., tool executing, generating response, MCP progress)
        this.emit('status', {
          status: (message as any).status,
          message: (message as any).message,
          toolName: (message as any).toolName,
          toolCallId: (message as any).toolCallId,
          toolType: (message as any).toolType,
          serverName: (message as any).serverName,
          progress: (message as any).progress,
          total: (message as any).total
        });
        break;
      case 'token_usage':
        this.emit('tokenUsage', message.data);
        break;
      case 'run_paused':
        this.emit('runPaused', message.data || message);
        break;
      case 'continuation_mode_updated':
        this.emit('continuationModeUpdated', message.data || message);
        break;
      case 'continue_run_result':
        this.emit('continueRunResult', message.data || message);
        break;
      case 'error':
        this.emit('error', message.data || { error: message.content });
        break;
      case 'connection_status':
      case 'connected':
        this.emit('connectionStatus', message.data || message);
        break;
      case 'cf_agent_state':
        // Cloudflare agent state updates - emit as raw message
        this.emit('agentState', message.data || message);
        break;
      default:
        this.emit('rawMessage', message);
    }
  }
}
