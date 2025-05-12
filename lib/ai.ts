import { generateText, streamText } from "ai"
import { groq } from "@ai-sdk/groq"
import { calendarTools, generateAISystemPrompt } from "./ai-tools"

const calendarToolSchemas = {
  getEvents: {
    description: "Get events between two dates",
    parameters: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "Start date in ISO format" },
        endDate: { type: "string", description: "End date in ISO format" },
      },
      required: ["startDate", "endDate"],
    },
  },
  getTodayEvents: {
    description: "Get all events for today",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  createEvent: {
    description: "Create a new event with conflict checking",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Event title" },
        startTime: { type: "string", description: "Start time in ISO format" },
        endTime: { type: "string", description: "End time in ISO format" },
        description: { type: "string", description: "Event description (optional)" },
        location: { type: "string", description: "Event location (optional)" },
        color: { type: "string", description: "Event color (optional)" },
      },
      required: ["title", "startTime", "endTime"],
    },
  },
  updateEvent: {
    description: "Update an existing event with conflict checking",
    parameters: {
      type: "object",
      properties: {
        eventId: { type: "string", description: "ID of the event to update" },
        updates: {
          type: "object",
          properties: {
            title: { type: "string", description: "New event title (optional)" },
            description: { type: "string", description: "New event description (optional)" },
            start: { type: "string", description: "New start time in ISO format (optional)" },
            end: { type: "string", description: "New end time in ISO format (optional)" },
            location: { type: "string", description: "New event location (optional)" },
            color: { type: "string", description: "New event color (optional)" },
          },
        },
      },
      required: ["eventId", "updates"],
    },
  },
  deleteEvent: {
    description: "Delete an event",
    parameters: {
      type: "object",
      properties: {
        eventId: { type: "string", description: "ID of the event to delete" },
      },
      required: ["eventId"],
    },
  },
  findEvents: {
    description: "Search for events by title or description",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
    },
  },
  findAvailableTimeSlots: {
    description: "Find available time slots on a specific date",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date in ISO format" },
        durationMinutes: { type: "number", description: "Duration in minutes" },
      },
      required: ["date", "durationMinutes"],
    },
  },
  checkForConflicts: {
    description: "Check if a time slot conflicts with existing events",
    parameters: {
      type: "object",
      properties: {
        startTime: { type: "string", description: "Start time in ISO format" },
        endTime: { type: "string", description: "End time in ISO format" },
        buffer: { type: "number", description: "Buffer time in minutes (optional)" },
      },
      required: ["startTime", "endTime"],
    },
  },
  analyzeBusyTimes: {
    description: "Analyze calendar for busy times and patterns",
    parameters: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "Start date in ISO format" },
        endDate: { type: "string", description: "End date in ISO format" },
      },
      required: ["startDate", "endDate"],
    },
  },
  findOptimalMeetingTime: {
    description: "Find optimal meeting times",
    parameters: {
      type: "object",
      properties: {
        participantIds: { type: "array", items: { type: "string" }, description: "List of participant IDs" },
        durationMinutes: { type: "number", description: "Meeting duration in minutes" },
        startDate: { type: "string", description: "Start date in ISO format" },
        endDate: { type: "string", description: "End date in ISO format" },
      },
      required: ["participantIds", "durationMinutes", "startDate", "endDate"],
    },
  },
  rescheduleEvent: {
    description: "Reschedule an event",
    parameters: {
      type: "object",
      properties: {
        eventId: { type: "string", description: "ID of the event to reschedule" },
        newStartTime: { type: "string", description: "New start time in ISO format" },
        newEndTime: { type: "string", description: "New end time in ISO format" },
      },
      required: ["eventId", "newStartTime", "newEndTime"],
    },
  },
}

const specializedPrompts = {
  scheduling: `You are Zero, a scheduling assistant. Focus on helping the user create, update, and manage their calendar events efficiently. 
  When scheduling, always check for conflicts and suggest alternative times if needed. 
  Consider the user's working hours and existing commitments.
  Provide clear confirmations after scheduling actions.`,

  analysis: `You are Zero, a calendar analysis expert. Help the user understand their time usage patterns and productivity.
  When analyzing the calendar, look for patterns like meeting frequency, duration, and distribution.
  Suggest optimizations for better time management and work-life balance.
  Present insights clearly with specific metrics when possible.`,

  availability: `You are Zero, an availability assistant. Help the user find free time slots for new commitments.
  When checking availability, consider existing events, preferred working hours, and buffer times.
  Suggest optimal meeting times based on the user's typical schedule patterns.
  Be precise about available time slots with clear start and end times.`,

  management: `You are Zero, a calendar management assistant. Help the user organize and optimize their calendar.
  When managing the calendar, focus on categorization, prioritization, and organization.
  Suggest ways to group similar events, optimize recurring meetings, and reduce scheduling conflicts.
  Help the user maintain a well-structured and efficient calendar.`,

  default: `You are Zero, a helpful calendar assistant. Help the user manage their schedule, find information about events, and optimize their time.
  Use the available calendar tools to provide accurate and helpful responses.
  Always prioritize the user's preferences and existing commitments when making suggestions.`,
}

async function executeToolCall(userId: string, toolName: string, args: any) {
  if (!calendarTools[toolName as keyof typeof calendarTools]) {
    throw new Error(`Tool ${toolName} not found`)
  }

  try {
    let argsArray: any[] = []

    switch (toolName) {
      case "getEvents":
        argsArray = [userId, args.startDate, args.endDate]
        break
      case "getTodayEvents":
        argsArray = [userId]
        break
      case "createEvent":
        argsArray = [userId, args.title, args.startTime, args.endTime, args.description, args.location, args.color]
        break
      case "updateEvent":
        argsArray = [userId, args.eventId, args.updates]
        break
      case "deleteEvent":
        argsArray = [userId, args.eventId]
        break
      case "findEvents":
        argsArray = [userId, args.query]
        break
      case "findAvailableTimeSlots":
        argsArray = [userId, args.date, args.durationMinutes]
        break
      case "checkForConflicts":
        argsArray = [userId, args.startTime, args.endTime, args.buffer]
        break
      case "analyzeBusyTimes":
        argsArray = [userId, args.startDate, args.endDate]
        break
      case "findOptimalMeetingTime":
        argsArray = [userId, args.participantIds, args.durationMinutes, args.startDate, args.endDate]
        break
      case "rescheduleEvent":
        argsArray = [userId, args.eventId, args.newStartTime, args.newEndTime]
        break
      default:
        throw new Error(`Unknown tool: ${toolName}`)
    }

    return await calendarTools[toolName](...argsArray)
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error)
    return {
      error: true,
      message: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function processCalendarQuery(query: string, userId: string, conversationHistory = "") {
  const baseSystemPrompt = generateAISystemPrompt(userId)

  const metaPrompt = `
${baseSystemPrompt}

You have access to different specialized modes to better assist the user. Based on the user's query, select the most appropriate mode:

1. SCHEDULING MODE: ${specializedPrompts.scheduling}
2. ANALYSIS MODE: ${specializedPrompts.analysis}
3. AVAILABILITY MODE: ${specializedPrompts.availability}
4. MANAGEMENT MODE: ${specializedPrompts.management}
5. DEFAULT MODE: ${specializedPrompts.default}

First, determine which mode is most appropriate for the user's query, then respond accordingly.
`

  try {
    const fullPrompt = conversationHistory ? `${conversationHistory}\n\nUser: ${query}` : query

    const initialResponse = await generateText({
      model: groq("meta-llama/llama-4-maverick-17b-128e-instruct"),
      prompt: fullPrompt,
      system: metaPrompt,
      temperature: 0.7,
      maxTokens: 800,
      tools: calendarToolSchemas,
    })

    if (initialResponse.toolCalls && initialResponse.toolCalls.length > 0) {
      const toolResults = await Promise.all(
        initialResponse.toolCalls.map(async (call) => {
          const result = await executeToolCall(userId, call.name, call.arguments)
          return {
            tool: call.name,
            args: call.arguments,
            result,
          }
        }),
      )

      const finalResponse = await generateText({
        model: groq("meta-llama/llama-4-maverick-17b-128e-instruct"),
        prompt: `${fullPrompt}\n\nTool results: ${JSON.stringify(
          toolResults,
          null,
          2,
        )}\n\nBased on these results, provide a helpful response to the user.`,
        system: metaPrompt,
        temperature: 0.7,
        maxTokens: 800,
      })

      return finalResponse.text
    }

    return initialResponse.text
  } catch (error) {
    console.error("Error processing calendar query:", error)
    return "I'm sorry, I encountered an error while processing your request. Please try again."
  }
}

export async function streamCalendarQuery(
  query: string,
  userId: string,
  onChunk: (chunk: string) => void,
  conversationHistory = "",
) {
  const baseSystemPrompt = generateAISystemPrompt(userId)

  const metaPrompt = `
${baseSystemPrompt}

You have access to different specialized modes to better assist the user. Based on the user's query, select the most appropriate mode:

1. SCHEDULING MODE: ${specializedPrompts.scheduling}
2. ANALYSIS MODE: ${specializedPrompts.analysis}
3. AVAILABILITY MODE: ${specializedPrompts.availability}
4. MANAGEMENT MODE: ${specializedPrompts.management}
5. DEFAULT MODE: ${specializedPrompts.default}

First, determine which mode is most appropriate for the user's query, then respond accordingly.
`

  try {
    const fullPrompt = conversationHistory ? `${conversationHistory}\n\nUser: ${query}` : query

    const initialResponse = await generateText({
      model: groq("meta-llama/llama-4-maverick-17b-128e-instruct"),
      prompt: fullPrompt,
      system: metaPrompt,
      temperature: 0.7,
      maxTokens: 800,
      tools: calendarToolSchemas,
    })

    if (initialResponse.toolCalls && initialResponse.toolCalls.length > 0) {
      onChunk("I'm checking your calendar... ")

      const toolResults = await Promise.all(
        initialResponse.toolCalls.map(async (call) => {
          const result = await executeToolCall(userId, call.name, call.arguments)
          return {
            tool: call.name,
            args: call.arguments,
            result,
          }
        }),
      )

      await streamText({
        model: groq("meta-llama/llama-4-maverick-17b-128e-instruct"),
        prompt: `${fullPrompt}\n\nTool results: ${JSON.stringify(
          toolResults,
          null,
          2,
        )}\n\nBased on these results, provide a helpful response to the user.`,
        system: metaPrompt,
        temperature: 0.7,
        maxTokens: 1000,
        onChunk: ({ chunk }) => {
          if (chunk.type === "text-delta") {
            onChunk(chunk.text)
          }
        },
      })

      return { success: true }
    }

    onChunk(initialResponse.text)
    return { success: true }
  } catch (error) {
    console.error("Error streaming calendar query:", error)
    onChunk("I'm sorry, I encountered an error while processing your request. Please try again.")
    return { success: false, error }
  }
}

export async function executeAIToolCall(userId: string, tool: string, args: any[]) {
  if (!calendarTools[tool as keyof typeof calendarTools]) {
    throw new Error(`Tool ${tool} not found`)
  }

  if (args[0] !== userId) {
    args.unshift(userId)
  }

  try {
    return await calendarTools[tool](...args)
  } catch (error) {
    console.error(`Error executing tool ${tool}:`, error)
    throw error
  }
}
