"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Send,
  Paperclip,
  Smile,
  Code,
  Link,
  File,
  Image,
  Bold,
  Italic
} from "lucide-react"

interface MessageInputProps {
  onSendMessage: (content: string, replyToId?: string) => void
  placeholder?: string
  disabled?: boolean
  replyTo?: {
    id: string
    content: string
    createdBy: {
      name: string
    }
  }
  onCancelReply?: () => void
}

export function MessageInput({
  onSendMessage,
  placeholder = "Type your message...",
  disabled = false,
  replyTo,
  onCancelReply
}: MessageInputProps) {
  const [message, setMessage] = useState("")
  const [isComposing, setIsComposing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [message])

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim(), replyTo?.id)
      setMessage("")

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const insertText = (text: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const beforeText = message.substring(0, start)
    const afterText = message.substring(end)

    const newText = beforeText + text + afterText
    setMessage(newText)

    // Restore cursor position
    setTimeout(() => {
      const newCursorPos = start + text.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
      textarea.focus()
    }, 0)
  }

  const formatSelection = (format: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = message.substring(start, end) || "text"

    let formattedText = ""
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`
        break
      case 'italic':
        formattedText = `*${selectedText}*`
        break
      case 'code':
        formattedText = `\`${selectedText}\``
        break
      case 'link':
        formattedText = `[${selectedText}](url)`
        break
      default:
        return
    }

    insertText(formattedText)
  }

  return (
    <Card className="p-4 space-y-3">
      {/* Reply indicator */}
      {replyTo && (
        <div className="flex items-center justify-between bg-muted/50 p-2 rounded text-sm">
          <div className="flex items-center space-x-2">
            <span className="text-muted-foreground">Replying to</span>
            <span className="font-medium">{replyTo.createdBy.name}</span>
            <span className="text-muted-foreground truncate max-w-xs">
              {replyTo.content.length > 50
                ? replyTo.content.substring(0, 50) + "..."
                : replyTo.content
              }
            </span>
          </div>
          {onCancelReply && (
            <Button variant="ghost" size="sm" onClick={onCancelReply}>
              ×
            </Button>
          )}
        </div>
      )}

      {/* Message input */}
      <div className="flex items-end space-x-2">
        {/* Formatting toolbar */}
        <div className="flex items-center space-x-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Smile className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48" align="start">
              <div className="text-xs text-muted-foreground mb-2">
                Quick formatting
              </div>
              <div className="grid grid-cols-3 gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start h-8 px-2"
                  onClick={() => formatSelection('bold')}
                >
                  <Bold className="h-3 w-3 mr-1" />
                  Bold
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start h-8 px-2"
                  onClick={() => formatSelection('italic')}
                >
                  <Italic className="h-3 w-3 mr-1" />
                  Italic
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start h-8 px-2"
                  onClick={() => formatSelection('code')}
                >
                  <Code className="h-3 w-3 mr-1" />
                  Code
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start h-8 px-2"
                  onClick={() => insertText('@username')}
                >
                  @mention
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start h-8 px-2"
                  onClick={() => insertText('#hashtag')}
                >
                  #tag
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start h-8 px-2"
                  onClick={() => formatSelection('link')}
                >
                  <Link className="h-3 w-3 mr-1" />
                  Link
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Paperclip className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => insertText('```\ncode block\n```')}
          >
            <Code className="h-4 w-4" />
          </Button>
        </div>

        {/* Text input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            maxRows={8}
            className="resize-none min-h-[40px] max-h-[200px]"
          />
        </div>

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={!message.trim() || disabled || isComposing}
          size="sm"
          className="h-10"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Input hints */}
      <div className="text-xs text-muted-foreground">
        Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> to send,{" "}
        <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Shift+Enter</kbd> for new line
      </div>
    </Card>
  )
}