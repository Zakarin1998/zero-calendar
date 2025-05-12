"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { KeyboardIcon } from "lucide-react"
import type { ShortcutAction } from "@/hooks/use-keyboard-shortcuts"

interface KeyboardShortcutsDialogProps {
  shortcuts: ShortcutAction[]
}

export function KeyboardShortcutsDialog({ shortcuts }: KeyboardShortcutsDialogProps) {
  const [open, setOpen] = useState(false)

  const formatShortcut = (shortcut: ShortcutAction) => {
    const parts = []
    if (shortcut.ctrlKey) parts.push("Ctrl")
    if (shortcut.altKey) parts.push("Alt")
    if (shortcut.shiftKey) parts.push("Shift")
    if (shortcut.metaKey) parts.push("⌘")
    parts.push(shortcut.key.toUpperCase())
    return parts.join(" + ")
  }

  const categories = {
    navigation: shortcuts.filter(
      (s) => s.description.toLowerCase().includes("navigate") || s.description.toLowerCase().includes("view"),
    ),
    events: shortcuts.filter((s) => s.description.toLowerCase().includes("event")),
    ui: shortcuts.filter(
      (s) =>
        !s.description.toLowerCase().includes("navigate") &&
        !s.description.toLowerCase().includes("view") &&
        !s.description.toLowerCase().includes("event"),
    ),
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="rounded-lg h-9 w-9 bg-mono-100 dark:bg-mono-800"
        aria-label="Keyboard shortcuts"
      >
        <KeyboardIcon className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
            <DialogDescription>
              Use these keyboard shortcuts to quickly navigate and manage your calendar.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Navigation</h3>
              <div className="space-y-2">
                {categories.navigation.map((shortcut, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-mono-600 dark:text-mono-400">{shortcut.description}</span>
                    <kbd className="px-2 py-1 text-xs font-semibold bg-mono-100 dark:bg-mono-800 rounded border border-mono-200 dark:border-mono-700">
                      {formatShortcut(shortcut)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-lg">Events</h3>
              <div className="space-y-2">
                {categories.events.map((shortcut, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-mono-600 dark:text-mono-400">{shortcut.description}</span>
                    <kbd className="px-2 py-1 text-xs font-semibold bg-mono-100 dark:bg-mono-800 rounded border border-mono-200 dark:border-mono-700">
                      {formatShortcut(shortcut)}
                    </kbd>
                  </div>
                ))}
              </div>

              <h3 className="font-medium text-lg mt-6">UI Controls</h3>
              <div className="space-y-2">
                {categories.ui.map((shortcut, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-mono-600 dark:text-mono-400">{shortcut.description}</span>
                    <kbd className="px-2 py-1 text-xs font-semibold bg-mono-100 dark:bg-mono-800 rounded border border-mono-200 dark:border-mono-700">
                      {formatShortcut(shortcut)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-mono-50 dark:bg-mono-900 p-4 rounded-lg mt-2">
            <p className="text-sm text-mono-500">
              Tip: Press{" "}
              <kbd className="px-1 py-0.5 text-xs bg-mono-100 dark:bg-mono-800 rounded border border-mono-200 dark:border-mono-700">
                ?
              </kbd>{" "}
              at any time to show this shortcuts dialog.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
