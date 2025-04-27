import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { text, voice, speed, apiKey } = await request.json();

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

    // Default to 'shimmer' voice if none specified
    // Available voices for gpt-4o-mini-tts: alloy, ash, ballad, coral, echo, fable, onyx, nova, sage, shimmer, verse
    const selectedVoice = voice || 'shimmer';
    
    // Default speed is 1.5, can range from 0.25 to 4.0
    const speechSpeed = speed !== undefined ? Number(speed) : 1.5;
    
    console.log(`🔊 TTS Request - Voice: ${selectedVoice}, Speed: ${speechSpeed}, Text length: ${text.length} chars`);

    // Generate speech from text using OpenAI's TTS API with enhanced control
    const mp3Response = await openai.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: selectedVoice,
      input: text,
      speed: speechSpeed,
      // TypeScript doesn't know about this parameter yet, but it's supported by the API
      ...(
        {
          voice_instructions: `Voice Affect: Calm, composed, and reassuring. Competent and in control, instilling trust.
                              Tone: Sincere, empathetic, with genuine concern for the customer and understanding of the situatio .
                              Pacing: Slower during the apology to allow for clarity and processing. Faster when offering solutions to signal action and resolution.
                              Emotions: Calm reassurance, empathy, and gratitude.
                              Pronunciation: Clear, precise: Ensures clarity, especially with key details. Focus on key words like "refund" and "patience. From the deep southern accent" 
                              Pauses: Before and after the apology to give space for processing the apology.`
        } as any
      )
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
