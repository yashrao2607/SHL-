import { NextRequest, NextResponse } from 'next/server';
import { processChat, type ChatMessage, type ChatResponse } from '@/lib/assessment-engine';

// ---------------------------------------------------------------------------
// POST /api/chat
// ---------------------------------------------------------------------------

interface ChatRequestBody {
  messages: ChatMessage[];
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: ChatRequestBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          reply: 'Invalid request format. Please send a JSON body with a "messages" array.',
          recommendations: [],
          end_of_conversation: false,
        } satisfies ChatResponse,
        { status: 400 }
      );
    }

    // Validate messages array exists
    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json(
        {
          reply: 'A "messages" array is required. Each message should have "role" and "content" fields.',
          recommendations: [],
          end_of_conversation: false,
        } satisfies ChatResponse,
        { status: 400 }
      );
    }

    // Validate each message has role and content
    const validRoles = new Set(['user', 'assistant']);
    const validatedMessages: ChatMessage[] = [];

    for (const msg of body.messages) {
      if (!msg.role || !msg.content) {
        return NextResponse.json(
          {
            reply: 'Each message must have both "role" and "content" fields.',
            recommendations: [],
            end_of_conversation: false,
          } satisfies ChatResponse,
          { status: 400 }
        );
      }

      if (!validRoles.has(msg.role)) {
        return NextResponse.json(
          {
            reply: `Invalid message role: "${msg.role}". Only "user" and "assistant" roles are accepted.`,
            recommendations: [],
            end_of_conversation: false,
          } satisfies ChatResponse,
          { status: 400 }
        );
      }

      validatedMessages.push({
        role: msg.role,
        content: String(msg.content).slice(0, 2000), // Limit message length
      });
    }

    // Limit conversation length to prevent abuse
    if (validatedMessages.length > 30) {
      // Keep only the last 30 messages
      validatedMessages.splice(0, validatedMessages.length - 30);
    }

    // Process the chat through the assessment engine
    const response: ChatResponse = await processChat(validatedMessages);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Chat API error:', error);

    // Return a safe fallback response
    return NextResponse.json(
      {
        reply: "I'm experiencing a technical issue right now. Please try again in a moment.",
        recommendations: [],
        end_of_conversation: false,
      } satisfies ChatResponse,
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    {
      error: 'Method not allowed. Use POST to send chat messages.',
    },
    { status: 405 }
  );
}
