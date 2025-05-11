import { generateText, streamText } from "ai"
import { groq } from "@ai-sdk/groq"
import { calendarTools, generateAISystemPrompt } from "./ai-tools"

export async function processCalendarQuery(query: string, userId: string) {
  const systemPrompt = generateAISystemPrompt(userId)

  const { text } = await generateText({
    model: groq("llama3-70b-8192"),
    prompt: query,
    system: systemPrompt,
    temperature: 0.7,
    maxTokens: 500,
  })

  return text
}

export async function streamCalendarQuery(query: string, userId: string, onChunk: (chunk: string) => void) {
  const systemPrompt = generateAISystemPrompt(userId)

  const result = streamText({
    model: groq("llama3-70b-8192"),
    prompt: query,
    system: systemPrompt,
    temperature: 0.7,
    maxTokens: 1000,
    onChunk: ({ chunk }) => {
      if (chunk.type === "text-delta") {
        onChunk(chunk.text)
      }
    },
  })

  return result
}

// Function to execute AI tool calls
export async function executeAIToolCall(userId: string, tool: string, args: any[]) {
  if (!calendarTools[tool as keyof typeof calendarTools]) {
    throw new Error(`Tool ${tool} not found`)
  }

  // Add userId as the first argument if it's not already included
  if (args[0] !== userId) {
    args.unshift(userId)
  }

  try {
    // @ts-ignore - We've already checked that the tool exists
    return await calendarTools[tool](...args)
  } catch (error) {
    console.error(`Error executing tool ${tool}:`, error)
    throw error
  }
}
