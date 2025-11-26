"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Search,
  Plus,
  MessageSquare,
  FileText,
  Settings,
  Filter
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

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

interface ThreadSidebarProps {
  threads: Thread[]
  selectedThreadId?: string
  onThreadSelect: (thread: Thread) => void
  onNewThread: (title: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  showDocumentedOnly: boolean
  onShowDocumentedOnlyChange: (show: boolean) => void
  loading: boolean
}

export function ThreadSidebar({
  threads,
  selectedThreadId,
  onThreadSelect,
  onNewThread,
  searchQuery,
  onSearchChange,
  showDocumentedOnly,
  onShowDocumentedOnlyChange,
  loading
}: ThreadSidebarProps) {
  const [newThreadTitle, setNewThreadTitle] = useState("")
  const [newThreadDialogOpen, setNewThreadDialogOpen] = useState(false)

  const handleCreateThread = () => {
    if (newThreadTitle.trim()) {
      onNewThread(newThreadTitle.trim())
      setNewThreadTitle("")
      setNewThreadDialogOpen(false)
    }
  }

  return (
    <div className="w-80 border-r flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Threads</h2>
          <Dialog open={newThreadDialogOpen} onOpenChange={setNewThreadDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Thread</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="thread-title">Thread Title</Label>
                  <Input
                    id="thread-title"
                    placeholder="Enter thread title..."
                    value={newThreadTitle}
                    onChange={(e) => setNewThreadTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateThread()}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setNewThreadDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateThread} disabled={!newThreadTitle.trim()}>
                    Create Thread
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search threads..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filters */}
        <div className="mt-3 flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="documented-filter" className="text-sm">
              Documented only
            </Label>
            <Switch
              id="documented-filter"
              checked={showDocumentedOnly}
              onCheckedChange={onShowDocumentedOnlyChange}
            />
          </div>
        </div>
      </div>

      {/* Thread List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 text-center text-muted-foreground">
            Loading threads...
          </div>
        ) : threads.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            {showDocumentedOnly
              ? "No documented threads found"
              : searchQuery
              ? "No threads found matching your search"
              : "No threads yet. Create the first one!"
            }
          </div>
        ) : (
          <div className="p-2">
            {threads.map((thread) => (
              <ThreadItem
                key={thread.id}
                thread={thread}
                isSelected={selectedThreadId === thread.id}
                onClick={() => onThreadSelect(thread)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

interface ThreadItemProps {
  thread: Thread
  isSelected: boolean
  onClick: () => void
}

function ThreadItem({ thread, isSelected, onClick }: ThreadItemProps) {
  const messagePreview = thread.lastMessage?.content || ""
  const previewLength = 60
  const truncatedPreview = messagePreview.length > previewLength
    ? messagePreview.substring(0, previewLength) + "..."
    : messagePreview

  return (
    <div
      className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-accent ${
        isSelected ? "bg-accent" : ""
      }`}
      onClick={onClick}
    >
      {/* Thread Title and Badges */}
      <div className="flex items-start justify-between mb-1">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate">{thread.title}</h3>
        </div>
        <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
          {thread.isDocumented && (
            <Badge variant="secondary" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              Doc
            </Badge>
          )}
          {thread.autoConvert && (
            <Badge variant="outline" className="text-xs">
              <Settings className="h-3 w-3 mr-1" />
              Auto
            </Badge>
          )}
        </div>
      </div>

      {/* Message Preview */}
      {truncatedPreview && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
          {truncatedPreview}
        </p>
      )}

      {/* Thread Metadata */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <Avatar className="h-4 w-4">
              <AvatarImage src={thread.lastMessage?.createdBy.image} />
              <AvatarFallback className="text-xs">
                {thread.lastMessage?.createdBy.name?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <span className="truncate max-w-20">
              {thread.lastMessage?.createdBy.name || thread.createdBy.name}
            </span>
          </div>
          <span>•</span>
          <span>{thread.messageCount} messages</span>
        </div>

        <div className="flex items-center space-x-1">
          <MessageSquare className="h-3 w-3" />
          <span>{formatDistanceToNow(new Date(thread.updatedAt), { addSuffix: true })}</span>
        </div>
      </div>
    </div>
  )
}