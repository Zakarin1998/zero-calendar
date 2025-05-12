"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SearchIcon, CalendarIcon, MapPinIcon, TagIcon } from "lucide-react"
import { type CalendarEvent, searchEvents } from "@/lib/calendar"
import { format } from "date-fns"

interface SearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onEventSelect: (event: CalendarEvent) => void
}

export function SearchDialog({ open, onOpenChange, onEventSelect }: SearchDialogProps) {
  const { data: session } = useSession()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<CalendarEvent[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (open && searchQuery.length > 2) {
      performSearch()
    }
  }, [searchQuery, open])

  const performSearch = async () => {
    if (!session?.user?.id || searchQuery.length < 2) return

    setIsSearching(true)
    try {
      const results = await searchEvents(session.user.id, searchQuery)
      setSearchResults(results)
    } catch (error) {
      console.error("Error searching events:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      performSearch()
    }
  }

  const handleEventClick = (event: CalendarEvent) => {
    onEventSelect(event)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Search Events</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mono-400" />
              <Input
                placeholder="Search by title, description, location or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-9"
                autoFocus
              />
            </div>
            <Button onClick={performSearch} disabled={isSearching || searchQuery.length < 2}>
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {searchResults.length === 0 && searchQuery.length > 0 && !isSearching ? (
              <div className="text-center py-8 text-mono-500">No events found matching "{searchQuery}"</div>
            ) : (
              <div className="space-y-2">
                {searchResults.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 border rounded-lg hover:bg-mono-100 dark:hover:bg-mono-800 cursor-pointer transition-colors"
                    onClick={() => handleEventClick(event)}
                  >
                    <div className="font-medium">{event.title}</div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-mono-500">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        <span>{format(new Date(event.start), "MMM d, yyyy h:mm a")}</span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1">
                          <MapPinIcon className="h-3.5 w-3.5" />
                          <span>{event.location}</span>
                        </div>
                      )}
                      {event.category && (
                        <div className="flex items-center gap-1">
                          <TagIcon className="h-3.5 w-3.5" />
                          <span>{event.category}</span>
                        </div>
                      )}
                    </div>
                    {event.description && (
                      <div className="mt-2 text-sm text-mono-600 dark:text-mono-400 line-clamp-2">
                        {event.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
