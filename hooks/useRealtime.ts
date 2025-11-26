"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { getWebSocketManager, WebSocketManager, WebSocketEvent } from "@/lib/websocket"

interface UseRealtimeOptions {
  workspaceId: string
  token: string
  wsUrl?: string
  autoConnect?: boolean
}

interface RealtimeState {
  connected: boolean
  connecting: boolean
  error: string | null
}

export function useRealtime({
  workspaceId,
  token,
  wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001",
  autoConnect = true
}: UseRealtimeOptions) {
  const [state, setState] = useState<RealtimeState>({
    connected: false,
    connecting: false,
    error: null,
  })

  const wsManagerRef = useRef<WebSocketManager | null>(null)
  const subscriptionsRef = useRef<Map<string, Set<Function>>>(new Map())

  const updateState = useCallback((updates: Partial<RealtimeState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  const connect = useCallback(async () => {
    if (wsManagerRef.current?.isConnected()) {
      return
    }

    updateState({ connecting: true, error: null })

    try {
      if (!wsManagerRef.current) {
        wsManagerRef.current = getWebSocketManager({
          url: wsUrl,
          token,
        })
      }

      await wsManagerRef.current.connect()

      // Join workspace room
      wsManagerRef.current.joinRoom(`workspace:${workspaceId}`)

      updateState({ connected: true, connecting: false })
    } catch (error) {
      console.error("Failed to connect to WebSocket:", error)
      updateState({
        connected: false,
        connecting: false,
        error: error instanceof Error ? error.message : "Connection failed"
      })
    }
  }, [workspaceId, token, wsUrl, updateState])

  const disconnect = useCallback(() => {
    if (wsManagerRef.current) {
      wsManagerRef.current.leaveRoom(`workspace:${workspaceId}`)
      wsManagerRef.current.disconnect()
      wsManagerRef.current = null
    }

    updateState({ connected: false, connecting: false, error: null })
  }, [workspaceId, updateState])

  const subscribe = useCallback((event: WebSocketEvent, callback: Function) => {
    if (!wsManagerRef.current) {
      console.warn("WebSocket manager not initialized")
      return () => {}
    }

    const unsubscribe = wsManagerRef.current.on(event, callback)

    // Track subscription for cleanup
    if (!subscriptionsRef.current.has(event)) {
      subscriptionsRef.current.set(event, new Set())
    }
    subscriptionsRef.current.get(event)!.add(callback)

    return unsubscribe
  }, [])

  const subscribeToThread = useCallback((threadId: string, callback: Function) => {
    if (!wsManagerRef.current) {
      console.warn("WebSocket manager not initialized")
      return () => {}
    }

    // Join thread-specific room
    wsManagerRef.current.joinRoom(`thread:${threadId}`)

    // Set up event listeners for this thread
    const unsubscribes = [
      wsManagerRef.current.on("thread:message:new", (data) => {
        if (data.threadId === threadId) {
          callback({ type: "newMessage", data })
        }
      }),
      wsManagerRef.current.on("thread:message:edit", (data) => {
        if (data.threadId === threadId) {
          callback({ type: "editMessage", data })
        }
      }),
      wsManagerRef.current.on("thread:message:delete", (data) => {
        if (data.threadId === threadId) {
          callback({ type: "deleteMessage", data })
        }
      }),
      wsManagerRef.current.on("thread:update", (data) => {
        if (data.threadId === threadId) {
          callback({ type: "threadUpdate", data })
        }
      }),
    ]

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe())
      if (wsManagerRef.current) {
        wsManagerRef.current.leaveRoom(`thread:${threadId}`)
      }
    }
  }, [])

  const sendTypingIndicator = useCallback((threadId: string, isTyping: boolean) => {
    if (!wsManagerRef.current?.isConnected()) return

    wsManagerRef.current.send({
      type: "user:typing",
      data: { threadId, isTyping },
      roomId: `thread:${threadId}`,
    })
  }, [])

  const markMessagesAsRead = useCallback((threadId: string, messageIds: string[]) => {
    if (!wsManagerRef.current?.isConnected()) return

    wsManagerRef.current.send({
      type: "messages:read",
      data: { threadId, messageIds },
      roomId: `thread:${threadId}`,
    })
  }, [])

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [autoConnect, connect, disconnect])

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      subscriptionsRef.current.forEach((callbacks, event) => {
        callbacks.forEach(callback => {
          // Note: Actual cleanup is handled by wsManager.unsubscribe returned by wsManager.on
        })
      })
      subscriptionsRef.current.clear()
    }
  }, [])

  return {
    connected: state.connected,
    connecting: state.connecting,
    error: state.error,
    connect,
    disconnect,
    subscribe,
    subscribeToThread,
    sendTypingIndicator,
    markMessagesAsRead,
    wsManager: wsManagerRef.current,
  }
}

// Hook for thread-specific real-time updates
export function useThreadRealtime(threadId: string, options: UseRealtimeOptions) {
  const [events, setEvents] = useState<any[]>([])
  const realtime = useRealtime(options)

  useEffect(() => {
    if (!threadId || !realtime.connected) return

    const unsubscribe = realtime.subscribeToThread(threadId, (event: any) => {
      setEvents(prev => [...prev, { ...event, timestamp: new Date() }])
    })

    return unsubscribe
  }, [threadId, realtime.connected, realtime.subscribeToThread])

  const clearEvents = useCallback(() => {
    setEvents([])
  }, [])

  return {
    ...realtime,
    events,
    clearEvents,
  }
}

// Hook for user presence
export function useUserPresence(options: UseRealtimeOptions) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [typingUsers, setTypingUsers] = useState<Map<string, Date>>(new Map())
  const realtime = useRealtime(options)

  useEffect(() => {
    if (!realtime.connected) return

    const unsubscribes = [
      realtime.subscribe("user:online", (data: { userId: string }) => {
        setOnlineUsers(prev => new Set(prev).add(data.userId))
      }),
      realtime.subscribe("user:offline", (data: { userId: string }) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev)
          newSet.delete(data.userId)
          return newSet
        })
      }),
      realtime.subscribe("user:typing", (data: { userId: string; threadId: string; isTyping: boolean }) => {
        setTypingUsers(prev => {
          const newMap = new Map(prev)
          if (data.isTyping) {
            newMap.set(data.userId, new Date())
          } else {
            newMap.delete(data.userId)
          }
          return newMap
        })
      }),
    ]

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe())
    }
  }, [realtime.connected, realtime.subscribe])

  // Clean up old typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      setTypingUsers(prev => {
        const newMap = new Map()
        prev.forEach((timestamp, userId) => {
          if (now.getTime() - timestamp.getTime() < 3000) { // 3 seconds
            newMap.set(userId, timestamp)
          }
        })
        return newMap
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const isUserTyping = useCallback((userId: string) => {
    return typingUsers.has(userId)
  }, [typingUsers])

  const getTypingUsers = useCallback((threadId?: string) => {
    // Note: In a real implementation, you'd want to filter by threadId
    return Array.from(typingUsers.keys())
  }, [typingUsers])

  return {
    ...realtime,
    onlineUsers,
    typingUsers,
    isUserTyping,
    getTypingUsers,
  }
}