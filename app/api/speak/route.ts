import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { text, voice, apiKey } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
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

    // Default to 'alloy' voice if none specified
    const selectedVoice = voice || 'alloy';

    // Generate speech from text using OpenAI's TTS API
    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: selectedVoice,
      input: text,
    });

    // Convert the response to an ArrayBuffer
    const buffer = await mp3Response.arrayBuffer();

    // Return the audio as a streaming response
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.byteLength.toString(),
      },
    });
  } catch (error: unknown) {
    console.error('Error processing text-to-speech request:', error);
    
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
