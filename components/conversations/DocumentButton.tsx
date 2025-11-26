"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import {
  FileText,
  Settings,
  Clock,
  MessageSquare,
  CheckCircle,
  AlertCircle
} from "lucide-react"

interface DocumentButtonProps {
  threadId: string
  isDocumented: boolean
  onDocumentedChange: (documented: boolean) => void
  threadSettings?: {
    autoConvert: boolean
    convertAfter?: number
    convertWhen?: string
  }
  onSettingsChange?: (settings: {
    autoConvert: boolean
    convertAfter?: number
    convertWhen?: string
  }) => void
}

export function DocumentButton({
  threadId,
  isDocumented,
  onDocumentedChange,
  threadSettings = { autoConvert: false },
  onSettingsChange
}: DocumentButtonProps) {
  const [isConverting, setIsConverting] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [autoConvert, setAutoConvert] = useState(threadSettings.autoConvert)
  const [convertAfter, setConvertAfter] = useState(threadSettings.convertAfter?.toString() || "10")
  const [convertWhenHours, setConvertWhenHours] = useState("24")
  const [convertType, setConvertType] = useState<'messages' | 'time'>('messages')

  const handleConvertToWiki = async () => {
    if (isDocumented) {
      toast.info("This thread is already documented")
      return
    }

    setIsConverting(true)

    try {
      const response = await fetch(`/api/threads/${threadId}/convert-to-wiki`, {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        toast.success("Thread converted to wiki page successfully!")
        onDocumentedChange(true)
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to convert thread to wiki")
      }
    } catch (error) {
      console.error("Error converting thread to wiki:", error)
      toast.error("Failed to convert thread to wiki")
    } finally {
      setIsConverting(false)
    }
  }

  const handleSaveSettings = async () => {
    const updateData: any = {
      autoConvert,
    }

    if (convertType === 'messages') {
      updateData.convertAfter = parseInt(convertAfter)
      updateData.convertWhen = null
    } else {
      updateData.convertAfter = null
      const convertWhen = new Date()
      convertWhen.setHours(convertWhen.getHours() + parseInt(convertWhenHours))
      updateData.convertWhen = convertWhen.toISOString()
    }

    try {
      const response = await fetch(`/api/threads/${threadId}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success("Auto-convert settings updated!")
        onSettingsChange?.(updateData)
        setSettingsDialogOpen(false)
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to update settings")
      }
    } catch (error) {
      console.error("Error updating thread settings:", error)
      toast.error("Failed to update settings")
    }
  }

  return (
    <div className="flex items-center space-x-2">
      {/* Main Document Button */}
      {isDocumented ? (
        <Badge variant="default" className="cursor-pointer">
          <CheckCircle className="h-3 w-3 mr-1" />
          Documented
        </Badge>
      ) : (
        <Button
          onClick={handleConvertToWiki}
          disabled={isConverting}
          variant={threadSettings.autoConvert ? "secondary" : "default"}
          size="sm"
        >
          <FileText className="h-4 w-4 mr-1" />
          {isConverting ? "Converting..." : "Mark as Document"}
        </Button>
      )}

      {/* Settings Button */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="end">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="auto-convert" className="text-sm font-medium">
                Auto-convert
              </Label>
              <Switch
                id="auto-convert"
                checked={autoConvert}
                onCheckedChange={(checked) => setAutoConvert(checked)}
              />
            </div>

            {autoConvert && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="text-sm font-medium">Convert when:</div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="convert-messages"
                        checked={convertType === 'messages'}
                        onChange={() => setConvertType('messages')}
                        className="w-3 h-3"
                      />
                      <Label htmlFor="convert-messages" className="text-sm">
                        <MessageSquare className="h-3 w-3 inline mr-1" />
                        After messages
                      </Label>
                    </div>

                    {convertType === 'messages' && (
                      <div className="ml-5 flex items-center space-x-2">
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={convertAfter}
                          onChange={(e) => setConvertAfter(e.target.value)}
                          className="w-16 h-8 text-sm"
                        />
                        <span className="text-sm text-muted-foreground">messages</span>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="convert-time"
                        checked={convertType === 'time'}
                        onChange={() => setConvertType('time')}
                        className="w-3 h-3"
                      />
                      <Label htmlFor="convert-time" className="text-sm">
                        <Clock className="h-3 w-3 inline mr-1" />
                        After time
                      </Label>
                    </div>

                    {convertType === 'time' && (
                      <div className="ml-5 flex items-center space-x-2">
                        <Input
                          type="number"
                          min="1"
                          max="168"
                          value={convertWhenHours}
                          onChange={(e) => setConvertWhenHours(e.target.value)}
                          className="w-16 h-8 text-sm"
                        />
                        <span className="text-sm text-muted-foreground">hours</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button size="sm" onClick={handleSaveSettings}>
                    Save Settings
                  </Button>
                </div>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Status indicator */}
      {threadSettings.autoConvert && !isDocumented && (
        <Badge variant="outline" className="text-xs">
          <AlertCircle className="h-3 w-3 mr-1" />
          Auto
        </Badge>
      )}
    </div>
  )
}