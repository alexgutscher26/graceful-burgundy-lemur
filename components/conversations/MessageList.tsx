"use client"

import { useState, useRef, useEffect } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageBubble } from "./MessageBubble"
import { Reply, MoreHorizontal } from "lucide-react"

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

interface MessageListProps {
  messages: Message[]
  onReply?: (messageId: string) => void
  currentUser?: {
    id: string
    name: string
    image?: string
  }
}

export function MessageList({
  messages,
  onReply,
  currentUser
}: MessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }
  }, [messages, autoScroll])

  const handleScroll = () => {
    if (!scrollAreaRef.current) return

    const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
    if (!scrollElement) return

    const { scrollTop, scrollHeight, clientHeight } = scrollElement
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50

    setAutoScroll(isAtBottom)
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-muted-foreground">
          <div className="mb-4">
            <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
              <Reply className="h-8 w-8" />
            </div>
          </div>
          <h3 className="text-lg font-medium mb-2">No messages yet</h3>
          <p>Be the first to start the conversation!</p>
        </div>
      </div>
    )
  }

  return (
    <ScrollArea
      ref={scrollAreaRef}
      className="flex-1"
      onScroll={handleScroll}
    >
      <div className="p-4 space-y-4">
        {messages.map((message, index) => {
          const isSameUserAsPrevious = index > 0 &&
            messages[index - 1].createdBy.id === message.createdBy.id
          const showAvatar = !isSameUserAsPrevious || message.replyToId

          return (
            <MessageWrapper
              key={message.id}
              message={message}
              showAvatar={showAvatar}
              isCurrentUser={currentUser?.id === message.createdBy.id}
              onReply={onReply}
            />
          )
        })}
      </div>
    </ScrollArea>
  )
}

interface MessageWrapperProps {
  message: Message
  showAvatar: boolean
  isCurrentUser: boolean
  onReply?: (messageId: string) => void
}

function MessageWrapper({
  message,
  showAvatar,
  isCurrentUser,
  onReply
}: MessageWrapperProps) {
  const [showActions, setShowActions] = useState(false)

  return (
    <div
      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {!isCurrentUser && showAvatar && (
        <Avatar className="h-8 w-8 mr-3 mt-1 flex-shrink-0">
          <AvatarImage src={message.createdBy.image} />
          <AvatarFallback>
            {message.createdBy.name?.[0] || '?'}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={`max-w-[70%] ${isCurrentUser ? 'text-right' : 'text-left'}`}>
        {/* Reply indicator */}
        {message.replyTo && (
          <div className="mb-2 ml-2">
            <div className="text-xs text-muted-foreground mb-1">
              Replying to {message.replyTo.createdBy.name}
            </div>
            <div className="bg-muted/50 border-l-2 border-muted-foreground/30 p-2 rounded-r text-sm">
              {message.replyTo.content.length > 100
                ? message.replyTo.content.substring(0, 100) + "..."
                : message.replyTo.content
              }
            </div>
          </div>
        )}

        {/* Message content */}
        <div className="relative">
          <MessageBubble
            message={message}
            isCurrentUser={isCurrentUser}
          />

          {/* Message actions */}
          {showActions && (
            <div className={`absolute ${isCurrentUser ? 'left-0 -ml-12' : 'right-0 -mr-12'} top-2 flex flex-col space-y-1`}>
              {onReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onReply(message.id)}
                >
                  <Reply className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Timestamp and edited indicator */}
          <div className={`mt-1 text-xs text-muted-foreground ${isCurrentUser ? 'text-right' : 'text-left'}`}>
            <span>
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
            {message.editedAt && (
              <span className="ml-2">
                (edited {new Date(message.editedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })})
              </span>
            )}
          </div>
        </div>
      </div>

      {isCurrentUser && showAvatar && (
        <Avatar className="h-8 w-8 ml-3 mt-1 flex-shrink-0">
          <AvatarImage src={message.createdBy.image} />
          <AvatarFallback>
            {message.createdBy.name?.[0] || '?'}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}