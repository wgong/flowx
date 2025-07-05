import { EventEmitter } from 'events';
import WebSocket from 'ws';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

export interface WebSocketClientOptions {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
}

export class WebSocketClient extends EventEmitter {
  private ws?: WebSocket;
  private options: WebSocketClientOptions;
  private reconnectAttempts = 0;
  private heartbeatTimer?: NodeJS.Timeout;
  private reconnectTimer?: NodeJS.Timeout;
  private isConnected = false;
  private messageQueue: WebSocketMessage[] = [];

  constructor(options: Partial<WebSocketClientOptions> = {}) {
    super();
    
    this.options = {
      url: 'ws://localhost:3001/ws',
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      ...options
    };
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.options.url);

        this.ws.on('open', () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.processMessageQueue();
          this.emit('connected');
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            const message = JSON.parse(data.toString()) as WebSocketMessage;
            this.handleMessage(message);
          } catch (error) {
            this.emit('error', new Error(`Failed to parse message: ${error}`));
          }
        });

        this.ws.on('close', () => {
          this.isConnected = false;
          this.stopHeartbeat();
          this.emit('disconnected');
          this.attemptReconnect();
        });

        this.ws.on('error', (error) => {
          this.emit('error', error);
          reject(error);
        });

        // Connection timeout
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Connection timeout'));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
    }
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
  }

  send(type: string, data: any): void {
    const message: WebSocketMessage = {
      type,
      data,
      timestamp: Date.now()
    };

    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for later
      this.messageQueue.push(message);
    }
  }

  subscribe(eventType: string): void {
    this.send('subscribe', { eventType });
  }

  unsubscribe(eventType: string): void {
    this.send('unsubscribe', { eventType });
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'system-metrics':
        this.emit('system-metrics', message.data);
        break;
      
      case 'agent-update':
        this.emit('agent-update', message.data);
        break;
      
      case 'task-update':
        this.emit('task-update', message.data);
        break;
      
      case 'memory-update':
        this.emit('memory-update', message.data);
        break;
      
      case 'swarm-update':
        this.emit('swarm-update', message.data);
        break;
      
      case 'alert':
        this.emit('alert', message.data);
        break;
      
      case 'log':
        this.emit('log', message.data);
        break;
      
      case 'pong':
        // Heartbeat response
        break;
      
      default:
        this.emit('message', message);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send('ping', {});
      }
    }, this.options.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.emit('reconnect-failed');
      return;
    }

    this.reconnectAttempts++;
    this.emit('reconnecting', { attempt: this.reconnectAttempts });

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // Reconnection failed, will try again
      });
    }, this.options.reconnectInterval);
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message && this.ws) {
        this.ws.send(JSON.stringify(message));
      }
    }
  }

  get connected(): boolean {
    return this.isConnected;
  }

  get connectionState(): string {
    if (this.isConnected) return 'connected';
    if (this.reconnectAttempts > 0) return 'reconnecting';
    return 'disconnected';
  }
}

// Singleton instance
let wsClient: WebSocketClient | null = null;

export function getWebSocketClient(): WebSocketClient {
  if (!wsClient) {
    wsClient = new WebSocketClient();
  }
  return wsClient;
}

export function createWebSocketClient(options?: Partial<WebSocketClientOptions>): WebSocketClient {
  return new WebSocketClient(options);
} 