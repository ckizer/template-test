# Voice Customization Guide

## Overview

The AI Voice Assistant application uses the Web Speech API's SpeechSynthesis interface to convert text responses from the OpenAI API into spoken audio. By default, the application selects an English voice if available, or falls back to the first available voice on your device.

## Voice Settings

The application provides a settings panel accessible via the gear icon (⚙️) in the chat interface. This panel allows you to customize the following aspects of the voice output:

### 1. Voice Selection

- **Available Voices**: The dropdown menu displays all voices available on your device, showing both the voice name and language code.
- **Default Selection**: The application attempts to select an English voice by default.
- **Persistence**: Your voice selection is saved in your browser's localStorage and will be remembered between sessions.

### 2. Speech Rate

- **Adjustable Range**: The speech rate can be adjusted from 0.5× (slower) to 2.0× (faster).
- **Default Value**: 1.0 (normal speed)
- **Use Case**: Slower rates may improve clarity, while faster rates can help process longer responses more quickly.

### 3. Speech Pitch

- **Adjustable Range**: The pitch can be adjusted from 0.5 (lower) to 2.0 (higher).
- **Default Value**: 1.0 (normal pitch)
- **Use Case**: Adjusting the pitch can help distinguish the AI voice from other audio sources or make it more pleasant to listen to based on personal preference.

## Technical Implementation

The voice customization is implemented using the Web Speech API's SpeechSynthesis interface. Key implementation details:

1. **Voice Loading**: Voices are loaded asynchronously, particularly in Chrome browsers which use the `onvoiceschanged` event.

2. **Voice Storage**: Selected voice, rate, and pitch settings are stored in the browser's localStorage with the following keys:
   - `selected-voice`: The voiceURI of the selected voice
   - `speech-rate`: The speech rate value (0.5 to 2.0)
   - `speech-pitch`: The speech pitch value (0.5 to 2.0)

3. **Voice Application**: When generating speech, the application:
   - Retrieves the selected voice by matching its URI
   - Applies the stored rate and pitch settings
   - Creates a new SpeechSynthesisUtterance with these settings

## Browser Compatibility

The Web Speech API has varying levels of support across browsers:

- **Chrome/Edge**: Excellent support for both speech synthesis and recognition
- **Safari**: Good support for speech synthesis, limited support for recognition
- **Firefox**: Limited support for speech synthesis, may require enabling in about:config
- **Mobile Browsers**: Support varies, but generally works well in Safari on iOS and Chrome on Android

## Troubleshooting

If you encounter issues with voice selection or playback:

1. **No Voices Available**: Some browsers require user interaction before allowing access to the speech synthesis API. Try clicking elsewhere in the application first.

2. **Voice Changes Not Applied**: If changing voices doesn't seem to work, try stopping any current speech playback first.

3. **No Sound**: Check that your device's volume is turned up and not muted.

4. **Voice Quality Issues**: Try different voices, as quality can vary significantly between the built-in options on different operating systems.
