import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
        mono: ["var(--font-geist-mono)"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Extended monochrome palette
        mono: {
          50: "hsl(var(--mono-50))",
          100: "hsl(var(--mono-100))",
          200: "hsl(var(--mono-200))",
          300: "hsl(var(--mono-300))",
          400: "hsl(var(--mono-400))",
          500: "hsl(var(--mono-500))",
          600: "hsl(var(--mono-600))",
          700: "hsl(var(--mono-700))",
          800: "hsl(var(--mono-800))",
          900: "hsl(var(--mono-900))",
          950: "hsl(var(--mono-950))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "slide-in-right": {
          from: { transform: "translateX(20px)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "slide-in-left": {
          from: { transform: "translateX(-20px)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "slide-in-up": {
          from: { transform: "translateY(20px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "slide-in-down": {
          from: { transform: "translateY(-20px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "scale-up": {
          from: { transform: "scale(0.95)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        "scale-down": {
          from: { transform: "scale(1.05)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        "border-pulse": {
          "0%, 100%": { borderColor: "hsla(var(--border), 0.3)" },
          "50%": { borderColor: "hsla(var(--border), 1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-out": "fade-out 0.3s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-in-left": "slide-in-left 0.3s ease-out",
        "slide-in-up": "slide-in-up 0.3s ease-out",
        "slide-in-down": "slide-in-down 0.3s ease-out",
        "pulse-slow": "pulse 3s infinite",
        shimmer: "shimmer 2s infinite linear",
        "scale-up": "scale-up 0.2s ease-out",
        "scale-down": "scale-down 0.2s ease-out",
        "border-pulse": "border-pulse 2s infinite",
      },
      boxShadow: {
        subtle: "0 2px 10px rgba(0, 0, 0, 0.05)",
        "subtle-dark": "0 2px 10px rgba(0, 0, 0, 0.2)",
        highlight: "inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
        "highlight-bottom": "inset 0 -1px 0 0 rgba(255, 255, 255, 0.1)",
        inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)",
        "inner-dark": "inset 0 2px 4px 0 rgba(0, 0, 0, 0.2)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
