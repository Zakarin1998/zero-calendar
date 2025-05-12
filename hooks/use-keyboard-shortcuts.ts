"use client"

import { useEffect, useRef } from "react"
import { useToast } from "@/hooks/use-toast"

export type ShortcutAction = {
  key: string
  description: string
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
  metaKey?: boolean
  action: () => void
  global?: boolean
}

export function useKeyboardShortcuts(shortcuts: ShortcutAction[], enabled = true) {
  const { toast } = useToast()
  const shortcutsRef = useRef<ShortcutAction[]>(shortcuts)

  useEffect(() => {
    shortcutsRef.current = shortcuts
  }, [shortcuts])

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target instanceof HTMLElement && event.target.isContentEditable)
      ) {
        return
      }

      for (const shortcut of shortcutsRef.current) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const ctrlMatch = !!shortcut.ctrlKey === event.ctrlKey
        const altMatch = !!shortcut.altKey === event.altKey
        const shiftMatch = !!shortcut.shiftKey === event.shiftKey
        const metaMatch = !!shortcut.metaKey === event.metaKey

        if (keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch) {
          event.preventDefault()
          shortcut.action()

          toast({
            title: "Shortcut executed",
            description: shortcut.description,
            duration: 2000,
          })

          break
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [enabled, toast])

  return {
    getShortcutsList: () => shortcutsRef.current,
  }
}
