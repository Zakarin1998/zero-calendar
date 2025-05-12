"use client"

import type React from "react"

import Link from "next/link"
import { CalendarIcon, ArrowRightIcon, CheckIcon, ExternalLinkIcon, MenuIcon, GithubIcon } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { motion } from "framer-motion"

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
}


export default function Home() {
  const handleScrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault()
    const section = document.getElementById(sectionId)
    if (section) {
      section.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <div className="fixed inset-0 noise-filter pointer-events-none opacity-20"></div>

      <motion.header
        className="py-6 relative z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center rounded-md border border-white/10 bg-white/5 backdrop-blur-sm">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">Zero</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="#features"
              className="text-sm text-gray-400 hover:text-white transition-colors"
              onClick={(e) => handleScrollToSection(e, "features")}
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm text-gray-400 hover:text-white transition-colors"
              onClick={(e) => handleScrollToSection(e, "how-it-works")}
            >
              How It Works
            </Link>
            <Link
              href="https://github.com/Zero-Calendar/zero-calendar"
              target="_blank"
              className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
            >
              <GithubIcon className="h-4 w-4" />
              GitHub
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <ThemeToggle className="bg-transparent border border-white/10" />
            <Link
              href="/auth/signin"
              className="text-sm text-gray-300 hover:text-white transition-colors px-4 py-2 rounded-md hover:bg-white/5"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="neo-brutalism-white px-4 py-2 rounded-md text-sm font-medium hover:translate-y-[-2px] hover:translate-x-[2px] active:translate-y-[1px] active:translate-x-[-1px] transition-all"
            >
              Start free
            </Link>
            <button className="md:hidden p-2 rounded-md border border-white/10 bg-white/5">
              <MenuIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col justify-center relative overflow-hidden py-20 md:py-32">
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="max-w-4xl mx-auto">
            <motion.div
              className="flex flex-col items-start"
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              <motion.div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-sm mb-6 backdrop-blur-sm"
                variants={fadeIn}
              >
                <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse"></span>
                <span>Open Source Calendar</span>
              </motion.div>

              <motion.h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.1]" variants={fadeIn}>
                Your calendar,
                <br />
                <span className="neo-gradient">reimagined with AI</span>
              </motion.h1>

              <motion.p className="text-gray-400 text-lg md:text-xl max-w-2xl mb-10" variants={fadeIn}>
                Zero is an open-source AI-native calendar that manages your schedule intelligently, giving you more time
                for what matters.
              </motion.p>

              <motion.div className="flex flex-col sm:flex-row gap-4" variants={fadeIn}>
                <Link
                  href="/auth/signup"
                  className="neo-brutalism-white px-8 py-4 rounded-md font-medium flex items-center justify-center gap-2 group"
                >
                  Get started
                  <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>

                {/* Update the "See how it works" link in the hero section */}
                <Link
                  href="#how-it-works"
                  className="neo-brutalism-black px-8 py-4 rounded-md font-medium flex items-center justify-center gap-2"
                  onClick={(e) => handleScrollToSection(e, "how-it-works")}
                >
                  See how it works
                  <ExternalLinkIcon className="h-4 w-4" />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Decorative elements */}
        <motion.div
          className="absolute top-1/2 right-0 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-radial from-white/5 to-transparent blur-3xl pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.2 }}
        ></motion.div>
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#0a0a0a] to-transparent pointer-events-none"></div>
      </section>

      {/* Features Section */}
      <motion.section
        id="features"
        className="py-24 relative z-10"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainer}
      >
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            className="flex flex-col md:flex-row justify-between items-start mb-16 gap-10"
            variants={fadeInUp}
          >
            <h2 className="text-3xl md:text-4xl font-bold">
              Why Zero
              <br />
              Calendar?
            </h2>
            <p className="text-gray-400 max-w-xl text-lg">
              Our AI-powered calendar is designed to make scheduling effortless and intuitive, with a focus on
              minimalism and efficiency.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <motion.div className="neo-card hover-lift" variants={fadeInUp}>
              <div className="w-12 h-12 rounded-md flex items-center justify-center mb-6 neo-brutalism-white">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z"
                    stroke="black"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M16 2V6" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M8 2V6" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3 10H21" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Smart Scheduling</h3>
              <p className="text-gray-400 mb-6">
                Our AI understands your preferences and automatically suggests the best times for your meetings.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <div className="h-5 w-5 rounded-sm bg-white/10 flex items-center justify-center">
                    <CheckIcon className="h-3 w-3 text-white" />
                  </div>
                  <span>Conflict detection</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <div className="h-5 w-5 rounded-sm bg-white/10 flex items-center justify-center">
                    <CheckIcon className="h-3 w-3 text-white" />
                  </div>
                  <span>Timezone management</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <div className="h-5 w-5 rounded-sm bg-white/10 flex items-center justify-center">
                    <CheckIcon className="h-3 w-3 text-white" />
                  </div>
                  <span>Preference learning</span>
                </li>
              </ul>
            </motion.div>

            {/* Feature 2 */}
            <motion.div className="neo-card hover-lift" variants={fadeInUp}>
              <div className="w-12 h-12 rounded-md flex items-center justify-center mb-6 neo-brutalism-white">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
                    stroke="black"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">AI Assistant</h3>
              <p className="text-gray-400 mb-6">
                Interact with your calendar using natural language to schedule, reschedule, and find events.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <div className="h-5 w-5 rounded-sm bg-white/10 flex items-center justify-center">
                    <CheckIcon className="h-3 w-3 text-white" />
                  </div>
                  <span>Natural language commands</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <div className="h-5 w-5 rounded-sm bg-white/10 flex items-center justify-center">
                    <CheckIcon className="h-3 w-3 text-white" />
                  </div>
                  <span>Smart suggestions</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <div className="h-5 w-5 rounded-sm bg-white/10 flex items-center justify-center">
                    <CheckIcon className="h-3 w-3 text-white" />
                  </div>
                  <span>Context-aware responses</span>
                </li>
              </ul>
            </motion.div>

            {/* Feature 3 */}
            <motion.div className="neo-card hover-lift" variants={fadeInUp}>
              <div className="w-12 h-12 rounded-md flex items-center justify-center mb-6 neo-brutalism-white">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                    stroke="black"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M2 12H22" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path
                    d="M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2616 12 22C9.49872 19.2616 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2Z"
                    stroke="black"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-3">Seamless Integration</h3>
              <p className="text-gray-400 mb-6">
                Connect with Google Calendar or start fresh with a new calendar. Your schedule, your choice.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <div className="h-5 w-5 rounded-sm bg-white/10 flex items-center justify-center">
                    <CheckIcon className="h-3 w-3 text-white" />
                  </div>
                  <span>Google Calendar sync</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <div className="h-5 w-5 rounded-sm bg-white/10 flex items-center justify-center">
                    <CheckIcon className="h-3 w-3 text-white" />
                  </div>
                  <span>Real-time updates</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-400">
                  <div className="h-5 w-5 rounded-sm bg-white/10 flex items-center justify-center">
                    <CheckIcon className="h-3 w-3 text-white" />
                  </div>
                  <span>Cross-device access</span>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* How It Works Section */}
      <motion.section
        id="how-it-works"
        className="py-24 relative z-10 bg-[#080808]"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={staggerContainer}
      >
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            className="flex flex-col md:flex-row justify-between items-start mb-16 gap-10"
            variants={fadeInUp}
          >
            <h2 className="text-3xl md:text-4xl font-bold">
              How Zero
              <br />
              Works
            </h2>
            <p className="text-gray-400 max-w-xl text-lg">
              Experience the power of AI-driven scheduling in three simple steps.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Step 1 */}
            <motion.div className="relative" variants={fadeInUp}>
              <div className="absolute -left-4 -top-4 w-12 h-12 neo-brutalism-white flex items-center justify-center text-xl font-bold z-10">
                1
              </div>
              <div className="neo-card h-full pt-20">
                <h3 className="text-xl font-bold mb-3">Connect Your Calendars</h3>
                <p className="text-gray-400">
                  Link your existing calendars from Google or Microsoft (soon) to bring all your events into one place.
                </p>
              </div>
            </motion.div>

            {/* Step 2 */}
            <motion.div className="relative" variants={fadeInUp}>
              <div className="absolute -left-4 -top-4 w-12 h-12 neo-brutalism-white flex items-center justify-center text-xl font-bold z-10">
                2
              </div>
              <div className="neo-card h-full pt-20">
                <h3 className="text-xl font-bold mb-3">Set Your Preferences</h3>
                <p className="text-gray-400">
                  Tell Zero when you prefer to take meetings, focus time, and your working hours. Our AI learns from
                  your habits.
                </p>
              </div>
            </motion.div>

            {/* Step 3 */}
            <motion.div className="relative" variants={fadeInUp}>
              <div className="absolute -left-4 -top-4 w-12 h-12 neo-brutalism-white flex items-center justify-center text-xl font-bold z-10">
                3
              </div>
              <div className="neo-card h-full pt-20">
                <h3 className="text-xl font-bold mb-3">Let AI Do The Work</h3>
                <p className="text-gray-400">
                  Zero optimizes your schedule, suggests meeting times, and helps you reclaim your time with smart
                  scheduling.
                </p>
              </div>
            </motion.div>
          </div>

          <motion.div className="mt-16 text-center" variants={fadeInUp}>
            <Link
              href="/auth/signup"
              className="neo-brutalism-white px-8 py-4 rounded-md font-medium inline-flex items-center justify-center gap-2 group"
            >
              Try it yourself
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section
        className="py-24 relative z-10 bg-[#080808]"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeInUp}
      >
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto">
            <div className="neo-card p-10 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to transform your scheduling?</h2>
              <p className="text-gray-400 mb-10 text-lg">
                Join the community of users who have already simplified their calendar management with Zero Calendar.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/auth/signup"
                  className="neo-brutalism-white px-10 py-4 rounded-md text-lg font-medium inline-flex items-center gap-2 group"
                >
                  Get Started
                  <ArrowRightIcon className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="https://github.com/Zero-Calendar/zero-calendar"
                  target="_blank"
                  className="neo-brutalism-black px-10 py-4 rounded-md text-lg font-medium inline-flex items-center gap-2 group"
                >
                  <GithubIcon className="h-5 w-5" />
                  Star on GitHub
                </Link>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="py-12 relative z-10 bg-[#0a0a0a]">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-12">
            <div>
              <h3 className="font-bold mb-4 text-sm uppercase tracking-wider">Product</h3>
              <ul className="space-y-2">
                <li>
                  {/* Update the footer links */}
                  <Link
                    href="#features"
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                    onClick={(e) => handleScrollToSection(e, "features")}
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="#how-it-works"
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                    onClick={(e) => handleScrollToSection(e, "how-it-works")}
                  >
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
                    Integrations
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4 text-sm uppercase tracking-wider">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-sm text-gray-400 hover:text-white transition-colors">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link href="/security" className="text-sm text-gray-400 hover:text-white transition-colors">
                    Security
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4 text-sm uppercase tracking-wider">Open Source</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="https://github.com/Zero-Calendar/zero-calendar"
                    target="_blank"
                    className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                  >
                    <GithubIcon className="h-4 w-4" />
                    GitHub
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
                    Contributing
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
                    License
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/10">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="h-9 w-9 flex items-center justify-center rounded-md border border-white/10 bg-white/5">
                <CalendarIcon className="h-4 w-4" />
              </div>
              <span className="font-bold">Zero Calendar</span>
            </div>

            <div className="flex gap-6">
              <a
                href="https://github.com/Zero-Calendar/zero-calendar"
                target="_blank"
                className="text-gray-400 hover:text-white transition-colors"
                rel="noreferrer"
              >
                <GithubIcon className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div className="text-center mt-8 text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Zero Calendar. Open Source under MIT License.
          </div>
        </div>
      </footer>
    </div>
  )
}
