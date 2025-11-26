"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Edit,
  Share,
  Download,
  MoreHorizontal,
  Eye,
  Calendar,
  User,
  Tag,
  Folder,
  MessageSquare,
  ArrowLeft
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface WikiPageViewerProps {
  wikiPage: {
    id: string
    title: string
    content: string
    summary?: string
    tags: string[]
    category?: string
    isPublic: boolean
    createdAt: string
    updatedAt: string
    createdBy: {
      id: string
      name: string
      email: string
      image?: string
    }
    threadId: string
    conversation: {
      id: string
      title: string
    }
  }
  onEdit?: () => void
  onBack?: () => void
  onGoToThread?: (threadId: string) => void
  currentUser?: {
    id: string
    name: string
  }
}

export function WikiPageViewer({
  wikiPage,
  onEdit,
  onBack,
  onGoToThread,
  currentUser
}: WikiPageViewerProps) {
  const [content, setContent] = useState(wikiPage.content)
  const [showSource, setShowSource] = useState(false)

  const canEdit = currentUser?.id === wikiPage.createdBy.id

  const formatMarkdown = (text: string) => {
    // Basic markdown rendering for display
    return text
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-6 mb-3">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-8 mb-4">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-10 mb-5">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>')
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-muted p-3 rounded-lg overflow-x-auto my-4"><code>$2</code></pre>')
      .replace(/^\> (.+)$/gim, '<blockquote class="border-l-4 border-muted-foreground/30 pl-4 my-4 italic text-muted-foreground">$1</blockquote>')
      .replace(/^\- (.+)$/gim, '<li class="ml-4">• $1</li>')
      .replace(/^\d+\. (.+)$/gim, '<li class="ml-4">$1</li>')
      .replace(/\n\n/g, '</p><p class="my-4">')
      .replace(/\n/g, '<br />')
  }

  const renderContent = () => {
    if (showSource) {
      return (
        <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
          {content}
        </pre>
      )
    }

    return (
      <div
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: `<p class="my-4">${formatMarkdown(content)}</p>` }}
      />
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <h1 className="text-xl font-bold">{wikiPage.title}</h1>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>Updated {formatDistanceToNow(new Date(wikiPage.updatedAt), { addSuffix: true })}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <User className="h-3 w-3" />
                  <span>{wikiPage.createdBy.name}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {canEdit && onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowSource(!showSource)}>
                  {showSource ? <Eye className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
                  {showSource ? 'View Rendered' : 'View Source'}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share className="h-4 w-4 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onGoToThread?.(wikiPage.threadId)}
                  className="text-blue-600"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  View Original Thread
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-2">
          {wikiPage.category && (
            <Badge variant="outline" className="flex items-center space-x-1">
              <Folder className="h-3 w-3" />
              <span>{wikiPage.category}</span>
            </Badge>
          )}

          {wikiPage.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="flex items-center space-x-1">
              <Tag className="h-3 w-3" />
              <span>{tag}</span>
            </Badge>
          ))}

          {wikiPage.isPublic && (
            <Badge variant="default">Public</Badge>
          )}
        </div>

        {/* Summary */}
        {wikiPage.summary && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="text-sm font-medium mb-1">Summary</div>
            <div className="text-sm text-muted-foreground">{wikiPage.summary}</div>
          </div>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 max-w-4xl mx-auto">
          {renderContent()}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Created {formatDistanceToNow(new Date(wikiPage.createdAt), { addSuffix: true })} •
            Generated from thread discussion
          </div>
          {onGoToThread && (
            <Button
              variant="link"
              size="sm"
              onClick={() => onGoToThread(wikiPage.threadId)}
              className="text-blue-600 hover:text-blue-700"
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              View Thread
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}