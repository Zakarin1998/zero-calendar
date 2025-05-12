"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { CalendarIcon, CheckIcon, ArrowRightIcon, ZapIcon, LockIcon, UsersIcon } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

export default function WaitlistPage() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null)
  const [isEmailFocused, setIsEmailFocused] = useState(false)
  const emailInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetch("/api/waitlist")
      .then((res) => res.json())
      .then((data) => {
        setWaitlistCount(data.count || 0)
      })
      .catch(() => {
        setWaitlistCount(0)
      })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !email.includes("@") || !email.includes(".")) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        throw new Error("Failed to join waitlist")
      }

      setSubmitted(true)
      setWaitlistCount((prev) => (prev !== null ? prev + 1 : 1))
      toast({
        title: "You're on the list!",
        description: "We'll notify you when Zero Calendar is ready.",
      })
    } catch (error) {
      toast({
        title: "Something went wrong",
        description: "Please try again later",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      {/* Enhanced animated background with improved gradients */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        {/* Main gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#0a0a0a]"></div>

        {/* Radial gradients for depth */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(75,0,130,0.08),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(128,0,128,0.05),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_80%,rgba(75,0,75,0.07),transparent_50%)]"></div>

        {/* Animated gradient orbs - using purple tones instead of blue */}
        <div className="absolute top-1/4 left-1/4 w-[40vw] h-[40vw] rounded-full bg-gradient-to-br from-purple-900/5 to-fuchsia-900/5 blur-3xl animate-pulse-slow"></div>
        <div
          className="absolute bottom-1/4 right-1/3 w-[35vw] h-[35vw] rounded-full bg-gradient-to-br from-violet-900/5 to-purple-900/5 blur-3xl animate-pulse-slow"
          style={{ animationDelay: "2s", animationDuration: "8s" }}
        ></div>

        {/* Subtle noise texture */}
        <div className="absolute inset-0 noise-filter opacity-20"></div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>

        {/* Subtle vignette effect */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(0,0,0,0.4))]"></div>

        {/* Top and bottom borders */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-700/20 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-700/20 to-transparent"></div>
      </div>

      {/* Header */}
      <header className="py-6 relative z-10">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 flex items-center justify-center rounded-md border border-white/10 bg-white/5 backdrop-blur-sm">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <a
              href="mailto:lucknitelol@proton.me"
              className="px-4 py-2 rounded-md border border-white/10 bg-white/5 backdrop-blur-sm text-sm hover:bg-white/10 transition-colors"
            >
              Contact Us
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6 relative z-10">
        <div className="max-w-2xl mx-auto w-full">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-sm mb-6 backdrop-blur-sm">
              <span className="inline-block w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
              <span>Private Beta Coming Soon</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
              Your time, <span className="neo-gradient">intelligently yours</span>
            </h1>

            <p className="text-lg md:text-xl text-gray-400 mb-10 mx-auto max-w-lg">
              Zero Calendar reimagines scheduling with AI that adapts to you, not the other way around. Open-source,
              privacy-focused, and designed to give you back control of your most valuable asset—time.
            </p>

            {/* Enhanced waitlist form */}
            <motion.div
              className="mb-8 max-w-md mx-auto backdrop-blur-sm p-8 rounded-xl border border-white/10 bg-black/30"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <h3 className="text-xl font-bold mb-4">Join the waitlist</h3>
              <p className="text-gray-400 mb-6 text-sm">
                Be among the first to experience Zero Calendar when we launch.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className={`relative transition-all duration-300 ${isEmailFocused ? "scale-105" : ""}`}>
                  <input
                    ref={emailInputRef}
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setIsEmailFocused(true)}
                    onBlur={() => setIsEmailFocused(false)}
                    disabled={isSubmitting || submitted}
                    className="w-full px-4 py-3.5 rounded-lg bg-black/50 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
                    required
                  />
                  <AnimatePresence>
                    {submitted && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center"
                      >
                        <div className="h-6 w-6 rounded-full bg-purple-500 flex items-center justify-center">
                          <CheckIcon className="h-3.5 w-3.5 text-white" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || submitted}
                  className={`w-full neo-brutalism-white px-6 py-3.5 rounded-lg font-medium text-black flex items-center justify-center gap-2 group transition-all duration-300 ${
                    submitted ? "bg-purple-500 border-purple-600" : ""
                  }`}
                >
                  {isSubmitting ? (
                    "Joining..."
                  ) : submitted ? (
                    <>
                      <CheckIcon className="h-4 w-4" />
                      You're on the list!
                    </>
                  ) : (
                    <>
                      Join the waitlist
                      <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>

              {waitlistCount > 0 && (
                <div className="mt-6 pt-4 border-t border-white/10">
                  <p className="text-center text-gray-400 text-sm">
                    <span className="font-bold text-white">{waitlistCount.toLocaleString()}</span> people have already
                    joined the waitlist
                  </p>
                </div>
              )}
            </motion.div>

            {/* Enhanced feature cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              <motion.div
                className="feature-card backdrop-blur-sm p-6 flex flex-col items-center !bg-black/30 border border-white/10 rounded-xl"
                style={{ backgroundColor: "black" }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 flex items-center justify-center mb-4 ring-1 ring-white/10">
                  <ZapIcon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-medium text-white text-lg mb-2">AI-Powered Scheduling</h3>
                <p className="text-gray-400 text-sm text-center">Let AI handle the complexity of managing your time</p>
              </motion.div>

              <motion.div
                className="feature-card backdrop-blur-sm p-6 flex flex-col items-center !bg-black border border-white/10 rounded-xl"
                style={{ backgroundColor: "black" }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center mb-4 ring-1 ring-white/10">
                  <LockIcon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-medium text-white text-lg mb-2">Privacy-First Design</h3>
                <p className="text-gray-400 text-sm text-center">Your data stays yours, always</p>
              </motion.div>

              <motion.div
                className="feature-card backdrop-blur-sm p-6 flex flex-col items-center !bg-black border border-white/10 rounded-xl"
                style={{ backgroundColor: "black" }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-fuchsia-500/20 to-violet-500/20 flex items-center justify-center mb-4 ring-1 ring-white/10">
                  <UsersIcon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-medium text-white text-lg mb-2">Seamless Collaboration</h3>
                <p className="text-gray-400 text-sm text-center">Work together without the friction</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 relative z-10">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-center items-center gap-4 border-t border-white/10 pt-6">
            <div className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Zero Calendar. Open Source under MIT License.
            </div>
            <div className="flex gap-6">
              <Link href="/privacy" className="text-gray-500 hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-gray-500 hover:text-white transition-colors">
                Terms
              </Link>
              <a
                href="https://github.com/Zero-Calendar/zero-calendar"
                target="_blank"
                rel="noreferrer"
                className="text-gray-500 hover:text-white transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
