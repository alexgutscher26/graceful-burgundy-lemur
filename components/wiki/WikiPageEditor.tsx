"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card } from "@/components/ui/card"
import { toast } from "sonner"
import {
  Save,
  X,
  Eye,
  EyeOff,
  Plus,
  X as XIcon,
  ArrowLeft,
  Bold,
  Italic,
  Code,
  Link,
  List,
  ListOrdered,
  Quote,
  Hash,
  AtSign
} from "lucide-react"

interface WikiPageEditorProps {
  wikiPage?: {
    id: string
    title: string
    content: string
    summary?: string
    tags: string[]
    category?: string
    isPublic: boolean
  }
  onSave: (wikiPage: {
    title: string
    content: string
    summary?: string
    tags: string[]
    category?: string
    isPublic: boolean
  }) => Promise<void>
  onCancel: () => void
  onBack?: () => void
  mode: "create" | "edit"
}

export function WikiPageEditor({
  wikiPage,
  onSave,
  onCancel,
  onBack,
  mode
}: WikiPageEditorProps) {
  const [title, setTitle] = useState(wikiPage?.title || "")
  const [content, setContent] = useState(wikiPage?.content || "")
  const [summary, setSummary] = useState(wikiPage?.summary || "")
  const [tags, setTags] = useState<string[]>(wikiPage?.tags || [])
  const [category, setCategory] = useState(wikiPage?.category || "")
  const [isPublic, setIsPublic] = useState(wikiPage?.isPublic || false)
  const [newTag, setNewTag] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [unsavedChanges, setUnsavedChanges] = useState(false)

  const categories = [
    "Technical",
    "Planning",
    "Support",
    "General",
    "Documentation",
    "Research",
    "Decision",
    "Process"
  ]

  // Track unsaved changes
  useEffect(() => {
    const hasChanges = (
      title !== (wikiPage?.title || "") ||
      content !== (wikiPage?.content || "") ||
      summary !== (wikiPage?.summary || "") ||
      JSON.stringify(tags) !== JSON.stringify(wikiPage?.tags || []) ||
      category !== (wikiPage?.category || "") ||
      isPublic !== (wikiPage?.isPublic || false)
    )

    setUnsavedChanges(hasChanges)
  }, [title, content, summary, tags, category, isPublic, wikiPage])

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Title is required")
      return
    }

    if (!content.trim()) {
      toast.error("Content is required")
      return
    }

    setIsSaving(true)

    try {
      await onSave({
        title: title.trim(),
        content: content.trim(),
        summary: summary.trim() || undefined,
        tags,
        category: category.trim() || undefined,
        isPublic
      })

      toast.success(`Wiki page ${mode === "create" ? "created" : "updated"} successfully!`)
      setUnsavedChanges(false)
    } catch (error) {
      toast.error(`Failed to ${mode} wiki page`)
    } finally {
      setIsSaving(false)
    }
  }

  const addTag = () => {
    const trimmedTag = newTag.trim()
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag])
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const insertMarkdown = (syntax: string, placeholder?: string) => {
    const textarea = document.getElementById("content-textarea") as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end) || placeholder || "text"

    let newText = ""
    switch (syntax) {
      case 'bold':
        newText = `**${selectedText}**`
        break
      case 'italic':
        newText = `*${selectedText}*`
        break
      case 'code':
        newText = `\`${selectedText}\``
        break
      case 'link':
        newText = `[${selectedText}](url)`
        break
      case 'list':
        newText = `- ${selectedText}`
        break
      case 'ordered-list':
        newText = `1. ${selectedText}`
        break
      case 'quote':
        newText = `> ${selectedText}`
        break
      case 'heading':
        newText = `## ${selectedText}`
        break
      case 'mention':
        newText = '@username'
        break
      default:
        return
    }

    const newContent = content.substring(0, start) + newText + content.substring(end)
    setContent(newContent)

    // Restore cursor position
    setTimeout(() => {
      textarea.focus()
      const newPosition = start + newText.length
      textarea.setSelectionRange(newPosition, newPosition)
    }, 0)
  }

  const handleCancel = () => {
    if (unsavedChanges) {
      if (confirm("You have unsaved changes. Are you sure you want to cancel?")) {
        onCancel()
      }
    } else {
      onCancel()
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <h1 className="text-xl font-bold">
                {mode === "create" ? "Create Wiki Page" : "Edit Wiki Page"}
              </h1>
              <div className="text-sm text-muted-foreground">
                {unsavedChanges && "• Unsaved changes"}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              {showPreview ? "Edit" : "Preview"}
            </Button>

            <Button variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>

            <Button
              onClick={handleSave}
              disabled={isSaving || !title.trim() || !content.trim()}
            >
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex">
        <div className="flex-1 flex flex-col">
          {showPreview ? (
            // Preview mode
            <div className="flex-1 p-6 max-w-4xl mx-auto overflow-y-auto">
              <div className="mb-6">
                <h1 className="text-2xl font-bold mb-2">{title || "Untitled"}</h1>
                {summary && (
                  <p className="text-muted-foreground text-lg">{summary}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {category && (
                    <Badge variant="outline">{category}</Badge>
                  )}
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: `<p class="my-4">${content.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-6 mb-3">$1</h3>')
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
                    .replace(/\n/g, '<br />')}</p>`
                }}
              />
            </div>
          ) : (
            // Edit mode
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 max-w-4xl mx-auto space-y-6">
                {/* Title */}
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter wiki page title..."
                    className="mt-1"
                  />
                </div>

                {/* Summary */}
                <div>
                  <Label htmlFor="summary">Summary</Label>
                  <Textarea
                    id="summary"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="Brief summary of this wiki page..."
                    rows={3}
                    className="mt-1"
                  />
                </div>

                {/* Category */}
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tags */}
                <div>
                  <Label>Tags</Label>
                  <div className="mt-1 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Add a tag..."
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        className="flex-1"
                      />
                      <Button size="sm" onClick={addTag} disabled={!newTag.trim()}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="flex items-center space-x-1">
                            <span>{tag}</span>
                            <button
                              onClick={() => removeTag(tag)}
                              className="ml-1 hover:text-destructive"
                            >
                              <XIcon className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Visibility */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="public"
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
                  />
                  <Label htmlFor="public">Make this wiki page public</Label>
                </div>

                {/* Content */}
                <div>
                  <Label htmlFor="content-textarea">Content (Markdown)</Label>
                  <div className="mt-1 border rounded-lg">
                    {/* Toolbar */}
                    <div className="flex items-center space-x-1 p-2 border-b bg-muted/30">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => insertMarkdown('bold')}
                        className="h-8 w-8 p-0"
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => insertMarkdown('italic')}
                        className="h-8 w-8 p-0"
                      >
                        <Italic className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => insertMarkdown('code')}
                        className="h-8 w-8 p-0"
                      >
                        <Code className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => insertMarkdown('link')}
                        className="h-8 w-8 p-0"
                      >
                        <Link className="h-4 w-4" />
                      </Button>
                      <Separator orientation="vertical" className="h-6" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => insertMarkdown('list')}
                        className="h-8 w-8 p-0"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => insertMarkdown('ordered-list')}
                        className="h-8 w-8 p-0"
                      >
                        <ListOrdered className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => insertMarkdown('quote')}
                        className="h-8 w-8 p-0"
                      >
                        <Quote className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => insertMarkdown('heading')}
                        className="h-8 w-8 p-0"
                      >
                        <Hash className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => insertMarkdown('mention')}
                        className="h-8 w-8 p-0"
                      >
                        <AtSign className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Textarea */}
                    <Textarea
                      id="content-textarea"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Write your wiki content in Markdown..."
                      rows={15}
                      className="border-0 focus-visible:ring-0 resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}