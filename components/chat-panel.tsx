"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Loader2, XCircle, DownloadIcon } from "lucide-react"
import { streamCalendarQuery } from "@/lib/ai"

type Message = {
  role: "user" | "assistant"
  content: string
}

interface ChatPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onToolExecution?: (result: any) => void
}

export function ChatPanel({ open, onOpenChange, onToolExecution }: ChatPanelProps) {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm Zero. How can I help you today?",
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const savedMessages = localStorage.getItem("chatMessages")
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages)
        if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
          setMessages(parsedMessages)
        }
      } catch (error) {
        console.error("Error parsing saved messages:", error)
      }
    }
  }, [])

  useEffect(() => {
    if (messages.length > 1) {
      localStorage.setItem("chatMessages", JSON.stringify(messages))
    }
  }, [messages])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const getConversationHistory = () => {
    const recentMessages = messages.slice(-10)
    return recentMessages.map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`).join("\n\n")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !session?.user?.id) return

    const userMessage = input.trim()
    setInput("")

    setMessages((prev) => [...prev, { role: "user", content: userMessage }])

    setIsLoading(true)

    setMessages((prev) => [...prev, { role: "assistant", content: "" }])

    try {
      const conversationHistory = getConversationHistory()

      await streamCalendarQuery(
        userMessage,
        session.user.id as string,
        (chunk) => {
          setMessages((prev) => {
            const newMessages = [...prev]
            const lastMessage = newMessages[newMessages.length - 1]
            if (lastMessage.role === "assistant") {
              lastMessage.content += chunk
            }
            return newMessages
          })
        },
        conversationHistory,
      )

      if (onToolExecution) {
        onToolExecution({ success: true })
      }
    } catch (error) {
      console.error("Error streaming response:", error)
      setMessages((prev) => {
        const newMessages = [...prev]
        const lastMessage = newMessages[newMessages.length - 1]
        if (lastMessage.role === "assistant") {
          lastMessage.content = "I'm sorry, I encountered an error. Please try again."
        }
        return newMessages
      })
    } finally {
      setIsLoading(false)
    }
  }

  const clearConversation = () => {
    setMessages([
      {
        role: "assistant",
        content: "Hi! I'm Zero. How can I help you today?",
      },
    ])
    localStorage.removeItem("chatMessages")
  }

  const downloadConversation = () => {
    const conversationText = messages
      .map((msg) => `${msg.role === "user" ? "You" : "Assistant"}: ${msg.content}`)
      .join("\n\n")

    const blob = new Blob([conversationText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `calendar-conversation-${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-y-0 right-0 w-full max-w-md border-l border-border bg-background shadow-lg">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <h2 className="text-lg font-semibold">Calendar Assistant</h2>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={downloadConversation} title="Download conversation">
                <DownloadIcon className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={clearConversation} title="Clear conversation">
                <XCircle className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your calendar..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
