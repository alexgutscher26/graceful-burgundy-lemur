interface WebSocketMessage {
  type: string
  data: any
  timestamp: string
  roomId?: string
}

interface WebSocketConfig {
  url: string
  token: string
  reconnectAttempts?: number
  reconnectInterval?: number
}

export type WebSocketEvent =
  | "thread:message:new"
  | "thread:message:edit"
  | "thread:message:delete"
  | "thread:new"
  | "thread:update"
  | "wiki:created"
  | "user:typing"
  | "user:online"
  | "user:offline"

export class WebSocketManager {
  private ws: WebSocket | null = null
  private config: WebSocketConfig
  private reconnectAttempts = 0
  private maxReconnectAttempts: number
  private reconnectInterval: number
  private eventListeners = new Map<WebSocketEvent, Set<(data: any) => void>>()
  private rooms = new Set<string>()
  private reconnectTimer: NodeJS.Timeout | null = null
  private pingTimer: NodeJS.Timeout | null = null
  private isConnecting = false
  private connectionPromise: Promise<void> | null = null

  constructor(config: WebSocketConfig) {
    this.config = config
    this.maxReconnectAttempts = config.reconnectAttempts || 5
    this.reconnectInterval = config.reconnectInterval || 1000
  }

  async connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return this.connectionPromise || Promise.resolve()
    }

    this.isConnecting = true
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        const wsUrl = `${this.config.url}?token=${encodeURIComponent(this.config.token)}`
        this.ws = new WebSocket(wsUrl)

        const timeout = setTimeout(() => {
          this.isConnecting = false
          reject(new Error("WebSocket connection timeout"))
        }, 10000)

        this.ws.onopen = () => {
          clearTimeout(timeout)
          this.isConnecting = false
          this.reconnectAttempts = 0
          console.log("WebSocket connected")

          // Re-join rooms after reconnect
          this.rooms.forEach(room => this.joinRoom(room))

          // Start ping interval
          this.startPingInterval()

          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data)
            this.handleMessage(message)
          } catch (error) {
            console.error("Failed to parse WebSocket message:", error)
          }
        }

        this.ws.onclose = () => {
          clearTimeout(timeout)
          this.isConnecting = false
          this.connectionPromise = null
          console.log("WebSocket disconnected")

          this.stopPingInterval()
          this.handleDisconnect()
        }

        this.ws.onerror = (error) => {
          clearTimeout(timeout)
          console.error("WebSocket error:", error)
          this.isConnecting = false
          this.connectionPromise = null
          reject(error)
        }
      } catch (error) {
        this.isConnecting = false
        this.connectionPromise = null
        reject(error)
      }
    })

    return this.connectionPromise
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.rooms.clear()
    this.eventListeners.clear()
  }

  private startPingInterval() {
    this.pingTimer = setInterval(() => {
      this.send({ type: "ping", data: {} })
    }, 30000) // Ping every 30 seconds
  }

  private stopPingInterval() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  private handleDisconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts)
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`)

      this.reconnectTimer = setTimeout(() => {
        this.reconnectAttempts++
        this.connect().catch(error => {
          console.error("Reconnection failed:", error)
        })
      }, delay)
    } else {
      console.error("Max reconnection attempts reached")
      this.emit("connection:failed", {})
    }
  }

  private handleMessage(message: WebSocketMessage) {
    if (message.type === "pong") {
      return // Ignore pong messages
    }

    this.emit(message.type as WebSocketEvent, message.data)
  }

  send(message: Omit<WebSocketMessage, "timestamp">) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const fullMessage: WebSocketMessage = {
        ...message,
        timestamp: new Date().toISOString(),
      }
      this.ws.send(JSON.stringify(fullMessage))
    } else {
      console.warn("WebSocket not connected, cannot send message:", message)
    }
  }

  joinRoom(roomId: string) {
    this.rooms.add(roomId)
    this.send({
      type: "room:join",
      data: { roomId },
    })
  }

  leaveRoom(roomId: string) {
    this.rooms.delete(roomId)
    this.send({
      type: "room:leave",
      data: { roomId },
    })
  }

  on(event: WebSocketEvent, callback: (data: any) => void) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(callback)

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(event)
      if (listeners) {
        listeners.delete(callback)
        if (listeners.size === 0) {
          this.eventListeners.delete(event)
        }
      }
    }
  }

  private emit(event: WebSocketEvent, data: any) {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in WebSocket event listener for ${event}:`, error)
        }
      })
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  getConnectionState(): string {
    if (!this.ws) return "disconnected"

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return "connecting"
      case WebSocket.OPEN:
        return "connected"
      case WebSocket.CLOSING:
        return "closing"
      case WebSocket.CLOSED:
        return "closed"
      default:
        return "unknown"
    }
  }
}

// Global WebSocket manager instance
let globalWsManager: WebSocketManager | null = null

export function getWebSocketManager(config?: WebSocketConfig): WebSocketManager {
  if (!globalWsManager && config) {
    globalWsManager = new WebSocketManager(config)
  }

  if (!globalWsManager) {
    throw new Error("WebSocket manager not initialized. Call with config first.")
  }

  return globalWsManager
}