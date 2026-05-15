import { NextRequest, NextResponse } from 'next/server';
import { processChat, extractState, classifyIntent, type ChatMessage, type ChatResponse } from '@/lib/assessment-engine';

// ---------------------------------------------------------------------------
// POST /api/chat
// ---------------------------------------------------------------------------

interface ChatRequestBody {
  messages: ChatMessage[];
}

export async function POST(request: NextRequest) {
  const startTime = performance.now();

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
        { status: 400, headers: { 'X-Response-Time': `${(performance.now() - startTime).toFixed(1)}ms` } }
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
        { status: 400, headers: { 'X-Response-Time': `${(performance.now() - startTime).toFixed(1)}ms` } }
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
          { status: 400, headers: { 'X-Response-Time': `${(performance.now() - startTime).toFixed(1)}ms` } }
        );
      }

      if (!validRoles.has(msg.role)) {
        return NextResponse.json(
          {
            reply: `Invalid message role: "${msg.role}". Only "user" and "assistant" roles are accepted.`,
            recommendations: [],
            end_of_conversation: false,
          } satisfies ChatResponse,
          { status: 400, headers: { 'X-Response-Time': `${(performance.now() - startTime).toFixed(1)}ms` } }
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

    // ---- Pre-processing logging ----
    const lastUserMsg = [...validatedMessages].reverse().find((m) => m.role === 'user');
    const preState = extractState(validatedMessages);
    const preIntent = lastUserMsg
      ? classifyIntent(lastUserMsg.content, preState, validatedMessages.length)
      : 'clarify';

    console.log(`[Chat API] Intent: ${preIntent} | Messages: ${validatedMessages.length} | Role: "${preState.role}" | Skills: [${preState.technical_skills.join(', ')}]`);

    // Process the chat through the assessment engine
    const response: ChatResponse = await processChat(validatedMessages);

    // ---- Post-processing logging ----
    const elapsed = performance.now() - startTime;
    console.log(`[Chat API] Intent: ${preIntent} | Recommendations: ${response.recommendations.length} | Duration: ${elapsed.toFixed(0)}ms`);

    return NextResponse.json(response, {
      headers: {
        'X-Response-Time': `${elapsed.toFixed(1)}ms`,
      },
    });
  } catch (error) {
    const elapsed = performance.now() - startTime;
    console.error('[Chat API] Error:', error, `| Duration: ${elapsed.toFixed(0)}ms`);

    // Return a safe fallback response with helpful error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('Timeout');
    const isNetwork = errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch');

    let reply: string;
    if (isTimeout) {
      reply = "I'm sorry, the request took too long to process. Please try again with a shorter message or fewer conversation turns.";
    } else if (isNetwork) {
      reply = "I'm experiencing a connectivity issue right now. Please try again in a moment.";
    } else {
      reply = "I'm experiencing a technical issue right now. Please try again in a moment.";
    }

    return NextResponse.json(
      {
        reply,
        recommendations: [],
        end_of_conversation: false,
      } satisfies ChatResponse,
      {
        status: 500,
        headers: {
          'X-Response-Time': `${elapsed.toFixed(1)}ms`,
        },
      }
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
