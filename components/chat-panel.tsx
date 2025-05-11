"use client"

import { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { SendIcon, XIcon, ZapIcon, MicIcon, ImageIcon, AnchorIcon as AttachmentIcon } from "lucide-react"
import { streamCalendarQuery } from "@/lib/ai"
import { useToast } from "@/hooks/use-toast"

interface ChatPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onToolExecution?: (result: any) => void
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

export function ChatPanel({ open, onOpenChange, onToolExecution }: ChatPanelProps) {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi there! I'm your AI calendar assistant. How can I help you today?",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentResponse, setCurrentResponse] = useState("")
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages, currentResponse])

  const handleSendMessage = async () => {
    if (!input.trim() || !session?.user?.id) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setCurrentResponse("")

    try {
      // Stream the response
      streamCalendarQuery(input, session.user.id, (chunk) => {
        setCurrentResponse((prev) => prev + chunk)
      }).then(async (result) => {
        const fullText = await result.text

        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: fullText,
        }

        setMessages((prev) => [...prev, assistantMessage])
        setCurrentResponse("")

        // Check for tool execution patterns in the response
        const toolCallRegex =
          /I'll (create|update|delete|find|reschedule) (an event|your event|available times|events)/i
        if (toolCallRegex.test(fullText)) {
          // Notify parent component that a tool execution might be needed
          if (onToolExecution) {
            onToolExecution({
              message: fullText,
              query: input,
            })
          }
        }
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process your request. Please try again.",
        variant: "destructive",
      })
      setCurrentResponse("")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col w-full sm:max-w-md p-0 gap-0 border-mono-200 dark:border-mono-700 shadow-glow">
        <SheetHeader className="border-b border-mono-200 dark:border-mono-700 p-4">
          <SheetTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-mono-900 text-mono-50 dark:bg-mono-50 dark:text-mono-900">
                <ZapIcon className="h-4 w-4" />
              </div>
              <span className="font-medium">AI Calendar Assistant</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-lg hover:bg-mono-100 dark:hover:bg-mono-800"
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 p-4 custom-scrollbar" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={message.role === "user" ? "user-message" : "ai-message"}>{message.content}</div>
              </div>
            ))}
            {currentResponse && (
              <div className="flex justify-start">
                <div className="ai-message animate-fade-in">{currentResponse}</div>
              </div>
            )}
            {isLoading && !currentResponse && (
              <div className="flex justify-start">
                <div className="ai-typing">
                  <div className="ai-typing-dot"></div>
                  <div className="ai-typing-dot"></div>
                  <div className="ai-typing-dot"></div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-mono-200 dark:border-mono-700 p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="space-y-2"
          >
            <div className="rounded-lg border border-mono-200 dark:border-mono-700 bg-mono-50 dark:bg-mono-900 p-2 flex flex-col">
              <Input
                placeholder="Ask about your calendar..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
              />
              <div className="flex justify-between items-center pt-2">
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-mono-500 hover:bg-mono-100 dark:hover:bg-mono-800"
                    disabled={isLoading}
                  >
                    <MicIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-mono-500 hover:bg-mono-100 dark:hover:bg-mono-800"
                    disabled={isLoading}
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-mono-500 hover:bg-mono-100 dark:hover:bg-mono-800"
                    disabled={isLoading}
                  >
                    <AttachmentIcon className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!input.trim() || isLoading}
                  className="h-8 rounded-lg bg-mono-900 text-mono-50 hover:bg-mono-800 dark:bg-mono-50 dark:text-mono-900 dark:hover:bg-mono-200"
                >
                  <SendIcon className="h-4 w-4 mr-1" />
                  Send
                </Button>
              </div>
            </div>
            <div className="text-xs text-mono-500 dark:text-mono-400 text-center">
              Zero Calendar AI can schedule meetings, find events, and manage your calendar
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
