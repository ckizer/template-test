import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { createReadStream } from 'fs';

// Create temp directory for audio files if it doesn't exist
const ensureTempDir = async () => {
  const tempDir = join(process.cwd(), 'temp');
  if (!existsSync(tempDir)) {
    await mkdir(tempDir, { recursive: true });
  }
  return tempDir;
};

// Get file extension from MIME type
const getFileExtension = (mimeType: string): string => {
  const mimeToExt: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/mp4': 'mp4',
    'audio/mp3': 'mp3',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/flac': 'flac'
  };
  
  // Handle MIME types with codecs
  const baseMimeType = mimeType.split(';')[0].trim();
  return mimeToExt[baseMimeType] || 'webm'; // Default to webm if unknown
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const apiKey = formData.get('apiKey');
    const audioFile = formData.get('audio');

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json(
        { error: 'OpenAI API key is required' },
        { status: 400 }
      );
    }

    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    // Initialize OpenAI client with the user-provided API key
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Get the content type and appropriate file extension
    const contentType = audioFile.type || 'audio/webm';
    const fileExt = getFileExtension(contentType);
    
    // Save audio file to temp directory with correct extension
    const tempDir = await ensureTempDir();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = join(tempDir, fileName);
    
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    await writeFile(filePath, buffer);

    // Log file information for debugging
    console.log(`Audio file saved to ${filePath}, size: ${buffer.length} bytes, type: ${contentType}`);

    try {
      // Send audio to OpenAI for transcription
      const transcription = await openai.audio.transcriptions.create({
        file: createReadStream(filePath),
        model: 'whisper-1',
        response_format: 'json',
        language: 'en'
      });

      console.log('Transcription successful:', transcription.text);
      return NextResponse.json({ text: transcription.text });
    } catch (transcriptionError) {
      console.error('Transcription error details:', transcriptionError);
      
      // Return more detailed error information
      const apiError = transcriptionError as { 
        status?: number; 
        message?: string; 
        response?: { 
          status: number; 
          data?: unknown; 
        } 
      };
      
      if (apiError.response?.status === 400) {
        return NextResponse.json(
          { error: `Invalid file format. Supported formats: ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm']` },
          { status: 400 }
        );
      }
      
      throw transcriptionError; // Re-throw for the outer catch block to handle
    }
  } catch (error: unknown) {
    console.error('Error processing transcription request:', error);
    
    // Type guard for error with status property
    const apiError = error as { 
      status?: number; 
      message?: string; 
      response?: { 
        status: number; 
        data?: unknown; 
      } 
    };
    
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
