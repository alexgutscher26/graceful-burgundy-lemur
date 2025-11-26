"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThreadSidebar } from "./ThreadSidebar"
import { MessageList } from "./MessageList"
import { MessageInput } from "./MessageInput"
import { DocumentButton } from "./DocumentButton"
import {
  MessageCircle,
  Search,
  Plus,
  Settings,
  MoreHorizontal
} from "lucide-react"

interface Thread {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  isDocumented: boolean
  autoConvert: boolean
  messageCount: number
  createdBy: {
    id: string
    name: string
    email: string
    image?: string
  }
  lastMessage?: {
    id: string
    content: string
    createdAt: string
    createdBy: {
      id: string
      name: string
      image?: string
    }
  }
}

interface Message {
  id: string
  content: string
  contentType: "TEXT" | "CODE" | "FILE" | "IMAGE" | "LINK"
  createdAt: string
  updatedAt: string
  editedAt?: string
  replyToId?: string
  replyTo?: {
    id: string
    content: string
    createdAt: string
    createdBy: {
      id: string
      name: string
    }
  }
  createdBy: {
    id: string
    name: string
    image?: string
  }
}

interface Conversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
  threadCount: number
  lastActivity: string
}

interface ConversationDashboardProps {
  workspaceId: string
  initialConversation?: Conversation
}

export function ConversationDashboard({
  workspaceId,
  initialConversation
}: ConversationDashboardProps) {
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null)
  const [threads, setThreads] = useState<Thread[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showDocumentedOnly, setShowDocumentedOnly] = useState(false)

  // Load threads for the conversation
  const loadThreads = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/conversations/${initialConversation?.id || 'default'}/threads?${new URLSearchParams({
          ...(searchQuery && { search: searchQuery }),
          ...(showDocumentedOnly && { isDocumented: 'true' }),
          limit: '50'
        })}`
      )

      if (response.ok) {
        const data = await response.json()
        setThreads(data.threads || [])
      }
    } catch (error) {
      console.error("Error loading threads:", error)
    } finally {
      setLoading(false)
    }
  }

  // Load messages for selected thread
  const loadMessages = async (threadId: string) => {
    try {
      const response = await fetch(`/api/threads/${threadId}`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.thread.messages || [])
      }
    } catch (error) {
      console.error("Error loading messages:", error)
    }
  }

  // Handle thread selection
  const handleThreadSelect = (thread: Thread) => {
    setSelectedThread(thread)
    loadMessages(thread.id)
  }

  // Handle new thread creation
  const handleNewThread = async (title: string) => {
    try {
      const response = await fetch(`/api/conversations/${initialConversation?.id || 'default'}/threads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      })

      if (response.ok) {
        const data = await response.json()
        setThreads(prev => [data.thread, ...prev])
        setSelectedThread(data.thread)
        loadMessages(data.thread.id)
      }
    } catch (error) {
      console.error("Error creating thread:", error)
    }
  }

  // Handle message sending
  const handleSendMessage = async (content: string, replyToId?: string) => {
    if (!selectedThread) return

    try {
      const response = await fetch(`/api/threads/${selectedThread.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          contentType: 'TEXT',
          replyToId,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => [...prev, data.message])

        // Update thread in sidebar
        setThreads(prev => prev.map(thread =>
          thread.id === selectedThread.id
            ? {
                ...thread,
                messageCount: thread.messageCount + 1,
                updatedAt: new Date().toISOString(),
                lastMessage: {
                  id: data.message.id,
                  content: data.message.content,
                  createdAt: data.message.createdAt,
                  createdBy: data.message.createdBy,
                }
              }
            : thread
        ))
      }
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  // Load initial data
  useEffect(() => {
    if (initialConversation) {
      loadThreads()
    }
  }, [initialConversation, searchQuery, showDocumentedOnly])

  return (
    <div className="flex h-full">
      {/* Thread Sidebar */}
      <ThreadSidebar
        threads={threads}
        selectedThreadId={selectedThread?.id}
        onThreadSelect={handleThreadSelect}
        onNewThread={handleNewThread}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showDocumentedOnly={showDocumentedOnly}
        onShowDocumentedOnlyChange={setShowDocumentedOnly}
        loading={loading}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {selectedThread ? (
          <>
            {/* Thread Header */}
            <div className="border-b p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div>
                    <h2 className="text-lg font-semibold">{selectedThread.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedThread.messageCount} messages •
                      Created by {selectedThread.createdBy.name}
                    </p>
                  </div>
                  {selectedThread.isDocumented && (
                    <Badge variant="secondary" className="ml-2">
                      Documented
                    </Badge>
                  )}
                  {selectedThread.autoConvert && (
                    <Badge variant="outline" className="ml-2">
                      Auto-convert
                    </Badge>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <DocumentButton
                    threadId={selectedThread.id}
                    isDocumented={selectedThread.isDocumented}
                    onDocumentedChange={(documented) => {
                      setSelectedThread(prev => prev ? { ...prev, isDocumented: documented } : null)
                    }}
                  />
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 flex">
              <MessageList
                messages={messages}
                onReply={(messageId) => {
                  // Handle reply
                }}
              />
            </div>

            {/* Message Input */}
            <div className="border-t p-4">
              <MessageInput onSendMessage={handleSendMessage} />
            </div>
          </>
        ) : (
          // Empty state
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a thread</h3>
              <p className="text-muted-foreground mb-4">
                Choose a thread from the sidebar to view and participate in the conversation.
              </p>
              <Button onClick={() => handleNewThread("New Discussion Thread")}>
                <Plus className="h-4 w-4 mr-2" />
                Start a new thread
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}