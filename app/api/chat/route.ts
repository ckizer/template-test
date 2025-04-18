import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { message, apiKey } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key is required' },
        { status: 400 }
      );
    }

    // Initialize OpenAI client with the user-provided API key
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful, friendly AI voice assistant. Keep responses concise and conversational, optimized for voice playback.',
        },
        { role: 'user', content: message },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || 'Sorry, I couldn\'t generate a response.';

    return NextResponse.json({ response });
  } catch (error: unknown) {
    console.error('Error processing chat request:', error);
    
    // Type guard for error with status property
    const apiError = error as { status?: number; message?: string };
    
    // Handle OpenAI API specific errors
    if (apiError.status === 401) {
      return NextResponse.json(
        { error: 'Invalid API key. Please check your OpenAI API key and try again.' },
        { status: 401 }
      );
    }
    
    if (apiError.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: apiError.message || 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
}
