# OpenAI Voice API Integration Plan

## Overview

This document outlines the plan to update our AI Voice Assistant application to use OpenAI's voice models for both speech-to-text and text-to-speech functionality, replacing the browser-native APIs currently in use. The application will leverage the existing OpenAI API key that users provide for chat functionality.

## 1. Backend API Updates

### 1.1 Create Speech-to-Text API Endpoint

Create a new API endpoint at `/app/api/transcribe/route.ts` that will:
- Accept audio data from the frontend
- Send the audio to OpenAI's Whisper API for transcription
- Return the transcribed text to the frontend

```typescript
// Implementation outline
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const apiKey = formData.get('apiKey') as string;
    const audioFile = formData.get('audio') as File;
    
    const openai = new OpenAI({ apiKey });
    
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
    });
    
    return NextResponse.json({ text: transcription.text });
  } catch (error) {
    // Error handling
  }
}
```

### 1.2 Create Text-to-Speech API Endpoint

Create a new API endpoint at `/app/api/speak/route.ts` that will:
- Accept text and voice parameters from the frontend
- Send the text to OpenAI's TTS API to generate audio
- Return the audio data to the frontend

```typescript
// Implementation outline
export async function POST(request: NextRequest) {
  try {
    const { text, voice, apiKey } = await request.json();
    
    const openai = new OpenAI({ apiKey });
    
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: voice || "alloy",
      input: text,
    });
    
    const buffer = await mp3.arrayBuffer();
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error) {
    // Error handling
  }
}
```

## 2. Frontend Updates

### 2.1 Audio Recording Component

Update the VoiceChat component to:
- Record audio using the MediaRecorder API
- Send the recorded audio to our transcribe endpoint
- Display the transcribed text

```typescript
// Implementation outline
const startRecording = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream);
  const audioChunks: BlobPart[] = [];
  
  mediaRecorder.ondataavailable = (event) => {
    audioChunks.push(event.data);
  };
  
  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    await transcribeAudio(audioBlob);
  };
  
  mediaRecorder.start();
  setMediaRecorder(mediaRecorder);
  setIsRecording(true);
};
```

### 2.2 Transcription Function

Create a function to send the recorded audio to our transcribe endpoint:

```typescript
// Implementation outline
const transcribeAudio = async (audioBlob: Blob) => {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('apiKey', apiKey);
    
    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) throw new Error('Transcription failed');
    
    const data = await response.json();
    setTranscript(data.text);
  } catch (error) {
    setError('Failed to transcribe audio');
  }
};
```

### 2.3 Text-to-Speech Playback

Update the function that handles playing back the AI response:

```typescript
// Implementation outline
const playResponse = async (text: string) => {
  try {
    const response = await fetch('/api/speak', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice: selectedVoice,
        apiKey,
      }),
    });
    
    if (!response.ok) throw new Error('Speech generation failed');
    
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();
  } catch (error) {
    setError('Failed to generate speech');
  }
};
```

### 2.4 Voice Selection Component

Update the voice selection component to use OpenAI's available voices:

```typescript
// Available OpenAI voices
const openAIVoices = [
  { id: 'alloy', name: 'Alloy' },
  { id: 'echo', name: 'Echo' },
  { id: 'fable', name: 'Fable' },
  { id: 'onyx', name: 'Onyx' },
  { id: 'nova', name: 'Nova' },
  { id: 'shimmer', name: 'Shimmer' },
];
```

## 3. Implementation Steps

1. **Update Dependencies**
   - Ensure the latest OpenAI SDK is installed: `npm install openai@^4.0.0`

2. **Create Backend API Endpoints**
   - Implement the transcribe endpoint
   - Implement the speak endpoint
   - Add proper error handling and validation

3. **Update Frontend Components**
   - Modify the VoiceChat component to use MediaRecorder
   - Implement audio recording and sending to the backend
   - Update the voice selection to use OpenAI voices
   - Implement audio playback from the OpenAI TTS API

4. **Testing**
   - Test the audio recording functionality
   - Test the transcription with various audio inputs
   - Test the text-to-speech with different voices
   - Verify end-to-end flow works correctly

5. **Documentation Updates**
   - Update the voice customization documentation
   - Document the OpenAI voice integration
   - Update the implementation plan

## 4. API Usage Considerations

- **Rate Limiting**: OpenAI APIs have rate limits that should be considered
- **Costs**: Both the Whisper and TTS APIs incur costs based on usage
- **File Size**: Limit audio file sizes to reduce costs and improve performance
- **Error Handling**: Implement robust error handling for API failures

## 5. Browser Compatibility

While we're moving away from browser-native speech APIs, we still need to ensure compatibility with:
- MediaRecorder API for audio recording
- Audio playback capabilities
- Blob and FormData handling

This should be tested across modern browsers, with particular attention to Safari on iOS for our iPhone-optimized interface.
