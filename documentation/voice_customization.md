# Voice Customization Guide

## Overview

The AI Voice Assistant application uses OpenAI's Text-to-Speech (TTS) API to convert text responses into spoken audio. The application provides a selection of high-quality voices from OpenAI's voice library, offering a natural and engaging conversational experience.

## Voice Settings

The application provides a settings panel accessible via the gear icon (⚙️) in the chat interface. This panel allows you to customize the voice output:

### Voice Selection

- **Available Voices**: The dropdown menu displays all available OpenAI voices:
  - **Alloy**: A neutral voice with balanced tone
  - **Echo**: A voice with a slightly deeper, more resonant quality
  - **Fable**: A soft, warm voice with a friendly character
  - **Onyx**: A deep, authoritative voice with clear articulation
  - **Nova**: A bright, energetic voice with higher pitch
  - **Shimmer**: A clear, melodic voice with a slight musical quality

- **Default Selection**: The application selects "Alloy" by default.
- **Persistence**: Your voice selection is saved in your browser's localStorage and will be remembered between sessions.

## Technical Implementation

The voice customization is implemented using OpenAI's Text-to-Speech API. Key implementation details:

1. **Voice Processing**: When the AI generates a text response, the application sends this text to OpenAI's TTS API along with the selected voice preference.

2. **Audio Playback**: The API returns an audio stream that is played back through the browser's audio system.

3. **Voice Storage**: The selected voice is stored in the browser's localStorage with the key `openai-voice`.

## Speech-to-Text Implementation

The application also uses OpenAI's Whisper API for transcribing user speech:

1. **Audio Recording**: The application uses the browser's MediaRecorder API to capture audio from the user's microphone.

2. **Transcription**: The recorded audio is sent to OpenAI's Whisper API, which returns a text transcription.

3. **Processing**: The transcribed text is then sent to the chat API for processing.

## API Usage Considerations

- **Rate Limiting**: OpenAI APIs have rate limits that may affect usage during heavy traffic.
- **Costs**: Both the Whisper (speech-to-text) and TTS (text-to-speech) APIs incur costs based on usage.
- **Audio Quality**: The quality of the transcription depends on the clarity of the audio input and environmental noise.

## Browser Compatibility

While the application uses OpenAI's APIs for voice processing, it still relies on browser capabilities for:
- MediaRecorder API for audio recording
- Audio playback capabilities
- Blob and FormData handling for sending audio data

This has been tested across modern browsers, with particular attention to Safari on iOS for our iPhone-optimized interface.

## Troubleshooting

If you encounter issues with voice recording or playback:

1. **Microphone Access**: Ensure you've granted the application permission to access your microphone.

2. **Audio Playback**: Check that your device's volume is turned up and not muted.

3. **API Key**: Verify that you've entered a valid OpenAI API key with access to the Audio APIs.

4. **Network Issues**: Poor network connectivity can affect the performance of the voice features, as they require API calls to OpenAI's servers.
