"use client"

import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { SunIcon, MoonIcon } from "lucide-react"
import { useEffect, useState } from "react"

interface ThemeToggleProps {
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export function ThemeToggle({ variant = "ghost", size = "icon", className = "" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <Button variant={variant} size={size} className={`h-9 w-9 rounded-md ${className}`} disabled />
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
      className={`h-9 w-9 rounded-md ${className}`}
    >
      {theme === "dark" ? (
        <SunIcon className="h-4 w-4 transition-all" />
      ) : (
        <MoonIcon className="h-4 w-4 transition-all" />
      )}
    </Button>
  )
}
