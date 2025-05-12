"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  MessageCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  CheckSquareIcon,
  UsersIcon,
  PlusIcon,
  ChevronDownIcon,
  LockIcon,
} from "lucide-react"
import { ChatPanel } from "./chat-panel"
import { cn } from "@/lib/utils"
import { Badge } from "./ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [showChat, setShowChat] = useState(false)

  return (
    <>
      <div className={`relative border-r bg-card transition-all duration-300 ${collapsed ? "w-16" : "w-64"}`}>
        <div className="flex h-12 items-center justify-between border-b px-4">
          {!collapsed && <span className="font-medium">Calendars</span>}
          <Button
            variant="ghost"
            size="icon"
            className={collapsed ? "ml-auto" : ""}
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeftIcon className="h-4 w-4" />}
          </Button>
        </div>
        <ScrollArea className="h-[calc(100vh-7rem)]">
          <div className="px-3 py-2">
            {!collapsed ? (
              <>
                <div className="mb-4">
                  <Button variant="ghost" className="w-full justify-start mb-1 font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Calendar
                  </Button>
                  <Button variant="ghost" className="w-full justify-start mb-1 font-normal">
                    <CheckSquareIcon className="mr-2 h-4 w-4" />
                    Tasks
                  </Button>
                  <Button variant="ghost" className="w-full justify-start font-normal">
                    <UsersIcon className="mr-2 h-4 w-4" />
                    People
                  </Button>
                </div>
                <Separator className="my-4" />
                <div className="space-y-1">
                  <div className="flex items-center justify-between py-1 px-2">
                    <div className="flex items-center text-sm font-medium">
                      <ChevronDownIcon className="h-4 w-4 mr-1" />
                      My Calendars
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <PlusIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-1 ml-2">
                    <div className="flex items-center py-1 px-2 rounded-md hover:bg-muted cursor-pointer">
                      <span className="mr-2 h-3 w-3 rounded-full bg-blue-500" />
                      <span className="text-sm">Personal</span>
                    </div>
                    <div className="flex items-center py-1 px-2 rounded-md hover:bg-muted cursor-pointer">
                      <span className="mr-2 h-3 w-3 rounded-full bg-green-500" />
                      <span className="text-sm">Work</span>
                    </div>
                    <div className="flex items-center py-1 px-2 rounded-md hover:bg-muted cursor-pointer">
                      <span className="mr-2 h-3 w-3 rounded-full bg-purple-500" />
                      <span className="text-sm">Family</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-1 mt-4">
                  <div className="flex items-center justify-between py-1 px-2">
                    <div className="flex items-center text-sm font-medium">
                      <ChevronDownIcon className="h-4 w-4 mr-1" />
                      Shared Calendars
                    </div>
                  </div>
                  <div className="ml-2 py-2 px-2">
                    <div className="flex items-center gap-2">
                      <LockIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground italic">Coming soon</span>
                      <Badge variant="outline" className="text-xs bg-muted text-muted-foreground ml-1">
                        Beta
                      </Badge>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center space-y-4 mt-4">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <CalendarIcon className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <CheckSquareIcon className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <UsersIcon className="h-5 w-5" />
                </Button>
                <Separator className="w-8" />
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <div className="h-3 w-3 rounded-full bg-purple-500" />
                <Separator className="w-8" />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex flex-col items-center gap-1">
                        <LockIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Soon</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Shared calendars coming soon</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
          <Button
            variant="outline"
            size={collapsed ? "icon" : "default"}
            className={cn(
              collapsed ? "h-10 w-10" : "w-[calc(100%-2rem)]",
              "gap-2 transition-all duration-300 rounded-full",
            )}
            onClick={() => setShowChat(true)}
          >
            <MessageCircleIcon className="h-4 w-4" />
            {!collapsed && <span>AI Assistant</span>}
          </Button>
        </div>
      </div>
      <ChatPanel open={showChat} onOpenChange={setShowChat} />
    </>
  )
}
