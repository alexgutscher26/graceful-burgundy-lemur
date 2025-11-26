"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Calendar,
  MessageSquare,
  Eye,
  MoreHorizontal,
  X
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface WikiPage {
  id: string
  title: string
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

interface WikiSearchProps {
  workspaceId: string
  onWikiPageSelect: (wikiPage: WikiPage) => void
  selectedWikiPageId?: string
  initialWikiPages?: WikiPage[]
}

export function WikiSearch({
  workspaceId,
  onWikiPageSelect,
  selectedWikiPageId,
  initialWikiPages = []
}: WikiSearchProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<"updated" | "created" | "title">("updated")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [wikiPages, setWikiPages] = useState<WikiPage[]>(initialWikiPages)
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

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

  // Load wiki pages
  const loadWikiPages = async () => {
    if (!workspaceId) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        workspaceId,
        limit: "100",
        ...(searchQuery && { search: searchQuery }),
        ...(selectedCategory !== "all" && { category: selectedCategory }),
        ...(selectedTags.length > 0 && { tags: selectedTags.join(",") }),
        ...(sortBy && { sort: sortBy }),
        ...(sortOrder && { order: sortOrder }),
      })

      const response = await fetch(`/api/wiki?${params}`)
      if (response.ok) {
        const data = await response.json()
        setWikiPages(data.wikiPages || [])
      }
    } catch (error) {
      console.error("Error loading wiki pages:", error)
    } finally {
      setLoading(false)
    }
  }

  // Search and filter wiki pages
  const searchWikiPages = async () => {
    loadWikiPages()
  }

  // Get all available tags from wiki pages
  const allTags = Array.from(
    new Set(wikiPages.flatMap(page => page.tags))
  ).sort()

  // Filter wiki pages based on search criteria
  const filteredWikiPages = wikiPages.filter(page => {
    // Search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        page.title.toLowerCase().includes(query) ||
        (page.summary?.toLowerCase().includes(query)) ||
        page.content.toLowerCase().includes(query) ||
        page.tags.some(tag => tag.toLowerCase().includes(query))

      if (!matchesSearch) return false
    }

    // Category filter
    if (selectedCategory !== "all" && page.category !== selectedCategory) {
      return false
    }

    // Tags filter
    if (selectedTags.length > 0) {
      const hasSelectedTags = selectedTags.some(tag => page.tags.includes(tag))
      if (!hasSelectedTags) return false
    }

    return true
  })

  // Sort filtered wiki pages
  const sortedWikiPages = [...filteredWikiPages].sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (sortBy) {
      case "title":
        aValue = a.title.toLowerCase()
        bValue = b.title.toLowerCase()
        break
      case "created":
        aValue = new Date(a.createdAt).getTime()
        bValue = new Date(b.createdAt).getTime()
        break
      case "updated":
      default:
        aValue = new Date(a.updatedAt).getTime()
        bValue = new Date(b.updatedAt).getTime()
        break
    }

    if (sortOrder === "asc") {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("")
    setSelectedCategory("all")
    setSelectedTags([])
    setSortBy("updated")
    setSortOrder("desc")
  }

  // Auto-load wiki pages when dependencies change
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (workspaceId) {
        loadWikiPages()
      }
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [workspaceId, searchQuery, selectedCategory, selectedTags, sortBy, sortOrder])

  return (
    <div className="h-full flex flex-col">
      {/* Search Header */}
      <div className="border-b p-4">
        <div className="space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search wiki pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-10"
            />
            {(searchQuery || selectedCategory !== "all" || selectedTags.length > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant={showFilters ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-1" />
                Filters
                {selectedTags.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1">
                    {selectedTags.length}
                  </Badge>
                )}
              </Button>

              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated">Last Updated</SelectItem>
                  <SelectItem value="created">Date Created</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
              >
                {sortOrder === "desc" ? (
                  <SortDesc className="h-4 w-4" />
                ) : (
                  <SortAsc className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              {sortedWikiPages.length} page{sortedWikiPages.length !== 1 ? "s" : ""} found
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <Card className="p-4 space-y-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedTags(prev =>
                          prev.includes(tag)
                            ? prev.filter(t => t !== tag)
                            : [...prev, tag]
                        )
                      }}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Wiki Pages List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 text-center text-muted-foreground">
            Loading wiki pages...
          </div>
        ) : sortedWikiPages.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                <Search className="h-8 w-8" />
              </div>
            </div>
            <h3 className="text-lg font-medium mb-2">No wiki pages found</h3>
            <p>Try adjusting your search filters or create a new wiki page.</p>
          </div>
        ) : (
          <div className="p-2">
            {sortedWikiPages.map((wikiPage) => (
              <WikiPageCard
                key={wikiPage.id}
                wikiPage={wikiPage}
                isSelected={selectedWikiPageId === wikiPage.id}
                onSelect={() => onWikiPageSelect(wikiPage)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

interface WikiPageCardProps {
  wikiPage: WikiPage
  isSelected: boolean
  onSelect: () => void
}

function WikiPageCard({ wikiPage, isSelected, onSelect }: WikiPageCardProps) {
  const summary = wikiPage.summary || "No summary available"

  return (
    <Card
      className={`p-4 cursor-pointer transition-colors hover:bg-accent ${
        isSelected ? "bg-accent border-primary" : ""
      }`}
      onClick={onSelect}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-base truncate mb-1">
              {wikiPage.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {summary}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 flex-shrink-0 ml-2"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(`/wiki/${wikiPage.id}`, '_blank')
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                View
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(`/dashboard/threads/${wikiPage.threadId}`, '_blank')
                }}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                View Thread
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tags and Category */}
        <div className="flex flex-wrap items-center gap-2">
          {wikiPage.category && (
            <Badge variant="outline" className="text-xs">
              {wikiPage.category}
            </Badge>
          )}
          {wikiPage.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {wikiPage.tags.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{wikiPage.tags.length - 3} more
            </Badge>
          )}
          {wikiPage.isPublic && (
            <Badge variant="default" className="text-xs">
              Public
            </Badge>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center space-x-2">
            <Avatar className="h-4 w-4">
              <AvatarImage src={wikiPage.createdBy.image} />
              <AvatarFallback className="text-xs">
                {wikiPage.createdBy.name?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <span>{wikiPage.createdBy.name}</span>
          </div>

          <div className="flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span>{formatDistanceToNow(new Date(wikiPage.updatedAt), { addSuffix: true })}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}