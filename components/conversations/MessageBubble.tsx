"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Copy, Edit, Trash2, Download, ExternalLink } from "lucide-react"

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

interface MessageBubbleProps {
  message: Message
  isCurrentUser: boolean
}

export function MessageBubble({ message, isCurrentUser }: MessageBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const formatContent = () => {
    switch (message.contentType) {
      case 'CODE':
        return <CodeBlock content={message.content} />
      case 'LINK':
        return <LinkBlock content={message.content} />
      case 'FILE':
        return <FileBlock content={message.content} />
      case 'IMAGE':
        return <ImageBlock content={message.content} />
      case 'TEXT':
      default:
        return <TextBlock content={message.content} />
    }
  }

  return (
    <Card
      className={`p-3 ${
        isCurrentUser
          ? 'bg-primary text-primary-foreground ml-auto'
          : 'bg-muted'
      }`}
    >
      <div className="space-y-2">
        {formatContent()}
      </div>
    </Card>
  )
}

function TextBlock({ content }: { content: string }) {
  const formatText = (text: string) => {
    // Handle line breaks
    let formatted = text.replace(/\n/g, '<br />')

    // Handle mentions
    formatted = formatted.replace(/@(\w+)/g, '<span class="font-semibold">@$1</span>')

    // Handle hashtags
    formatted = formatted.replace(/#(\w+)/g, '<span class="font-semibold">#$1</span>')

    // Handle URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g
    formatted = formatted.replace(urlRegex, '<a href="$1" class="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')

    // Handle markdown bold
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

    // Handle markdown italic
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>')

    return formatted
  }

  return (
    <div
      className="whitespace-pre-wrap break-words"
      dangerouslySetInnerHTML={{ __html: formatText(content) }}
    />
  )
}

function CodeBlock({ content }: { content: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  // Detect if it's a single line or multi-line code
  const isMultiline = content.includes('\n')

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono opacity-70">
          {isMultiline ? 'Code Block' : 'Inline Code'}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={handleCopy}
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
      <pre className={`text-xs overflow-x-auto p-2 rounded bg-black/20 ${
        isMultiline ? 'whitespace-pre' : 'whitespace-pre-wrap inline'
      }`}>
        <code>{content}</code>
      </pre>
      {copied && (
        <div className="text-xs opacity-70">Copied to clipboard</div>
      )}
    </div>
  )
}

function LinkBlock({ content }: { content: string }) {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const urls = content.match(urlRegex) || []

  if (urls.length === 0) {
    return <TextBlock content={content} />
  }

  return (
    <div className="space-y-2">
      {urls.map((url, index) => (
        <div key={index} className="flex items-center space-x-2">
          <ExternalLink className="h-4 w-4 flex-shrink-0" />
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline break-all"
          >
            {url}
          </a>
        </div>
      ))}
      {/* Show any remaining text that's not a URL */}
      <TextBlock content={content.replace(urlRegex, '').trim()} />
    </div>
  )
}

function FileBlock({ content }: { content: string }) {
  const fileName = content.split('/').pop() || content

  return (
    <div className="flex items-center space-x-2 p-2 border rounded">
      <Download className="h-4 w-4 flex-shrink-0" />
      <span className="text-sm font-medium">{fileName}</span>
      <Button variant="ghost" size="sm" className="ml-auto">
        <Download className="h-4 w-4" />
      </Button>
    </div>
  )
}

function ImageBlock({ content }: { content: string }) {
  return (
    <div className="space-y-2">
      <img
        src={content}
        alt="Shared image"
        className="max-w-full h-auto rounded cursor-pointer"
        onClick={() => window.open(content, '_blank')}
      />
      <div className="text-xs opacity-70">Click to view full size</div>
    </div>
  )
}