"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, Send, StopCircle, Settings, Loader2, Volume2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiKeyModal } from "@/components/ApiKeyModal";

// Define a type for weather data
interface WeatherData {
  location: string;
  temperature: string;
  condition: string;
  humidity: string;
  windSpeed: string;
  error?: string;
}

// Define a type for function call arguments
interface FunctionCallArgs {
  zipcode: string;
  [key: string]: string | number | boolean;
}

// Define a type for function call data
interface FunctionCallData {
  name: string;
  args: FunctionCallArgs;
  result: WeatherData | Record<string, unknown>;
}

// Define a type for our messages
interface Message {
  role: "user" | "assistant";
  content: string;
  functionCalled?: FunctionCallData | null;
}

// OpenAI voice options for gpt-4o-mini-tts
const OPENAI_VOICES = [
  { id: 'alloy', name: 'Alloy' },
  { id: 'ash', name: 'Ash' },
  { id: 'ballad', name: 'Ballad' },
  { id: 'coral', name: 'Coral' },
  { id: 'echo', name: 'Echo' },
  { id: 'fable', name: 'Fable' },
  { id: 'onyx', name: 'Onyx' },
  { id: 'nova', name: 'Nova' },
  { id: 'sage', name: 'Sage' },
  { id: 'shimmer', name: 'Shimmer' },
  { id: 'verse', name: 'Verse' },
];

// Constants for audio recording
const TIMESLICE_MS = 100; // Request data every 100ms
const RECORDING_DELAY_MS = 500; // Add a small delay before stopping to capture trailing audio

export default function VoiceChat() {
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isPreparingToRecord, setIsPreparingToRecord] = useState(false);
  const [hasReceivedAudioData, setHasReceivedAudioData] = useState(false);
  
  const [transcript, setTranscript] = useState("");
  const [textInput, setTextInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! How can I assist you today?" }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string>("alloy");
  const [speechSpeed, setSpeechSpeed] = useState<number>(1.0);
  
  // Audio queue state
  const [audioQueue, setAudioQueue] = useState<string[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Initialize audio element and load saved preferences
  useEffect(() => {
    // Create audio element if it doesn't exist
    audioRef.current = new Audio();
    
    // Check for stored API key
    const storedApiKey = localStorage.getItem("openai-api-key");
    if (storedApiKey) {
      setApiKey(storedApiKey);
    } else {
      setIsApiKeyModalOpen(true);
    }
    
    // Load saved voice preference
    const savedVoice = localStorage.getItem("openai-voice");
    if (savedVoice) {
      setSelectedVoice(savedVoice);
    }
    
    // Load saved speech speed
    const savedSpeed = localStorage.getItem("openai-speech-speed");
    if (savedSpeed) {
      setSpeechSpeed(parseFloat(savedSpeed));
    }
    
    // Cleanup function
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      
      // Clean up any recording stream on unmount
      if (recordingStream) {
        recordingStream.getTracks().forEach(track => track.stop());
      }
      
      // Clear any timeouts
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
      }
      
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
    };
  }, [recordingStream]);
  
  // Handle audio queue processing
  useEffect(() => {
    const playNextInQueue = async () => {
      // Only process if we're not already playing and we have items in the queue
      if (!isPlaying && audioQueue.length > 0 && audioRef.current) {
        try {
          const text = audioQueue[0];
          console.log(`Playing audio: "${text.substring(0, 30)}..."`);
          
          // Set playing state
          setIsPlaying(true);
          
          // Get audio from API
          const response = await fetch("/api/speak", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text,
              voice: selectedVoice,
              speed: speechSpeed,
              apiKey,
            }),
          });
          
          if (!response.ok) {
            throw new Error("Failed to generate speech");
          }
          
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          
          // Set up audio element
          audioRef.current.src = audioUrl;
          
          // Set up event listeners for this playback
          const onEnded = () => {
            console.log("Audio playback ended");
            setIsPlaying(false);
            // Remove the item we just played
            setAudioQueue(prev => prev.slice(1));
            // Clean up event listeners
            if (audioRef.current) {
              audioRef.current.removeEventListener('ended', onEnded);
              audioRef.current.removeEventListener('error', onError);
            }
          };
          
          const onError = () => {
            console.error("Audio playback error");
            setIsPlaying(false);
            setError("Failed to play audio response");
            // Remove the failed item
            setAudioQueue(prev => prev.slice(1));
            // Clean up event listeners
            if (audioRef.current) {
              audioRef.current.removeEventListener('ended', onEnded);
              audioRef.current.removeEventListener('error', onError);
            }
          };
          
          // Add event listeners
          audioRef.current.addEventListener('ended', onEnded, { once: true });
          audioRef.current.addEventListener('error', onError, { once: true });
          
          // Play the audio
          await audioRef.current.play();
          
        } catch (error) {
          console.error("Error playing audio:", error);
          setIsPlaying(false);
          setError("Failed to play audio response");
          // Remove the failed item
          setAudioQueue(prev => prev.slice(1));
        }
      }
    };
    
    playNextInQueue();
  }, [audioQueue, isPlaying, apiKey, selectedVoice, speechSpeed]);
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Safety timeout for recording preparation
  useEffect(() => {
    if (isPreparingToRecord) {
      const timeout = setTimeout(() => {
        if (isPreparingToRecord) {
          console.log("Recording preparation timed out");
          setIsPreparingToRecord(false);
          setError("Microphone access timed out. Please try again.");
        }
      }, 5000); // 5 second timeout
      
      return () => clearTimeout(timeout);
    }
  }, [isPreparingToRecord]);
  
  const startRecording = async () => {
    try {
      if (!apiKey) {
        setIsApiKeyModalOpen(true);
        return;
      }
      
      setError("");
      audioChunksRef.current = [];
      setHasReceivedAudioData(false);
      
      // Set preparing state to show loading indicator
      setIsPreparingToRecord(true);
      
      // Get audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      setRecordingStream(stream);
      
      // Try to use a supported MIME type with fallbacks for browser compatibility
      let mimeType = 'audio/webm; codecs=opus';
      
      // Check if the browser supports the preferred MIME type
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        // Fallback options in order of preference
        const fallbackTypes = [
          'audio/webm',
          'audio/ogg; codecs=opus',
          'audio/mp4',
          'audio/wav'
        ];
        
        for (const type of fallbackTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            mimeType = type;
            console.log(`Using fallback MIME type: ${mimeType}`);
            break;
          }
        }
      }
      
      // Create MediaRecorder with the supported MIME type
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType: mimeType
      });
      
      // Request data frequently to ensure we capture everything
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          
          // Only set this flag once we've actually received audio data
          if (!hasReceivedAudioData) {
            setHasReceivedAudioData(true);
            console.log("First audio data chunk received");
          }
        }
      };
      
      // When recording starts
      mediaRecorder.onstart = () => {
        console.log("MediaRecorder started");
        setIsRecording(true);
        setIsPreparingToRecord(false);
      };
      
      // When recording stops, process the audio
      mediaRecorder.onstop = async () => {
        // Make sure we have audio data
        if (audioChunksRef.current.length === 0) {
          setError("No audio data captured. Please try again.");
          setIsRecording(false);
          setHasReceivedAudioData(false);
          return;
        }
        
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        // Log the audio size for debugging
        console.log(`Audio recording complete: ${audioBlob.size} bytes`);
        
        // Only process if we have a meaningful amount of audio data
        if (audioBlob.size > 100) {
          await transcribeAudio(audioBlob);
        } else {
          setError("Recording too short. Please try again and speak clearly.");
        }
        
        // Clean up the media stream
        if (recordingStream) {
          recordingStream.getTracks().forEach(track => track.stop());
          setRecordingStream(null);
        }
        
        // Reset recording states
        setIsRecording(false);
        setHasReceivedAudioData(false);
      };
      
      // Start recording with timeslice to get frequent ondataavailable events
      mediaRecorder.start(TIMESLICE_MS);
      mediaRecorderRef.current = mediaRecorder;
      
      // Set a timeout to check if we've received any audio data
      recordingTimeoutRef.current = setTimeout(() => {
        if (!hasReceivedAudioData && mediaRecorderRef.current) {
          console.log("No audio data received yet, requesting data");
          mediaRecorderRef.current.requestData();
        }
      }, 1000);
      
    } catch (err) {
      console.error("Error starting recording:", err);
      setError("Could not access microphone. Please check your browser permissions.");
      setIsPreparingToRecord(false);
      setIsRecording(false);
      setHasReceivedAudioData(false);
    }
  };
  
  const stopRecording = () => {
    // Clear any existing timeouts
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
    
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    
    // If we're still preparing, just cancel the operation
    if (isPreparingToRecord && !isRecording) {
      setIsPreparingToRecord(false);
      
      // Clean up any stream that might have been created
      if (recordingStream) {
        recordingStream.getTracks().forEach(track => track.stop());
        setRecordingStream(null);
      }
      return;
    }
    
    // Add a small delay before stopping to capture trailing audio
    stopTimeoutRef.current = setTimeout(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          // Request one final chunk of data
          mediaRecorderRef.current.requestData();
          
          // Then stop the recording
          mediaRecorderRef.current.stop();
        } catch (err) {
          console.error("Error stopping recording:", err);
          setIsRecording(false);
          setHasReceivedAudioData(false);
        }
      } else {
        setIsRecording(false);
        setHasReceivedAudioData(false);
      }
    }, RECORDING_DELAY_MS);
  };
  
  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      setIsProcessing(true);
      
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('apiKey', apiKey);
      
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to transcribe audio");
      }
      
      const data = await response.json();
      setTranscript(data.text);
      
      if (data.text.trim()) {
        await sendMessage(data.text);
      } else {
        setIsProcessing(false);
        setError("No speech detected. Please try again and speak clearly.");
      }
    } catch (err) {
      console.error("Error transcribing audio:", err);
      setError(err instanceof Error ? err.message : "Failed to transcribe audio");
      setIsProcessing(false);
    }
  };
  
  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    const newMessage: Message = { role: "user", content: text };
    setMessages(prev => [...prev, newMessage]);
    setTranscript("");
    setTextInput(""); // Clear text input after sending
    setIsProcessing(true);
    
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          apiKey: apiKey,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get response");
      }
      
      const data = await response.json();
      const assistantMessage: Message = { 
        role: "assistant", 
        content: data.response,
        functionCalled: data.functionCalled
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Add response to audio queue
      console.log(`Adding to audio queue: "${data.response.substring(0, 30)}..."`);
      setAudioQueue(prev => [...prev, data.response]);
    } catch (err) {
      console.error("Error sending message:", err);
      setError(err instanceof Error ? err.message : "Failed to get response");
    } finally {
      setIsProcessing(false);
    }
  };
  
  const replayMessage = (content: string) => {
    console.log(`Replaying message: "${content.substring(0, 30)}..."`);
    // Add the message to the audio queue to be played
    setAudioQueue(prev => [...prev, content]);
  };
  
  const handleApiKeySubmit = (key: string) => {
    setApiKey(key);
  };
  
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      setIsPlaying(false);
      
      // Clear the audio queue
      setAudioQueue([]);
    }
  };
  
  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoice(voiceId);
    localStorage.setItem("openai-voice", voiceId);
  };
  
  const handleSpeedChange = (value: string) => {
    const speed = parseFloat(value);
    setSpeechSpeed(speed);
    localStorage.setItem("openai-speech-speed", value);
  };
  
  const toggleRecording = () => {
    if (isPreparingToRecord || isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };
  
  const handleTextInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      sendMessage(textInput);
    }
  };
  
  // Determine the button state and appearance
  const getRecordButtonState = () => {
    if (isPreparingToRecord) {
      return {
        variant: "outline" as const,
        icon: <Loader2 className="h-6 w-6 animate-spin" />,
        disabled: false
      };
    } else if (isRecording) {
      return {
        variant: "destructive" as const,
        icon: <StopCircle className="h-6 w-6" />,
        disabled: false
      };
    } else {
      return {
        variant: "default" as const,
        icon: <Mic className="h-6 w-6" />,
        disabled: isProcessing
      };
    }
  };
  
  const recordButtonState = getRecordButtonState();
  
  return (
    <div className="flex flex-col h-full max-w-md mx-auto">
      <ApiKeyModal 
        isOpen={isApiKeyModalOpen} 
        onClose={() => setIsApiKeyModalOpen(false)} 
        onApiKeySubmit={handleApiKeySubmit} 
      />
      
      <Card className="flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 dark:text-gray-400 text-center">
                Tap the microphone button and start speaking to begin a conversation
              </p>
            </div>
          ) : (
            messages.map((message, index) => (
              <Card key={index} className={`${
                message.role === "user" 
                  ? "ml-auto bg-primary text-primary-foreground" 
                  : "mr-auto bg-muted"
              } max-w-[80%]`}>
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p>{message.content}</p>
                      
                      {message.functionCalled && (
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-xs">
                          <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium">
                            <span className="mr-1">🔧</span> Function called: {message.functionCalled.name}
                          </div>
                          {message.functionCalled.name === "get_weather" && (
                            <div className="mt-1 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
                              <p><strong>Location:</strong> {(message.functionCalled.result as WeatherData).location}</p>
                              <p><strong>Temperature:</strong> {(message.functionCalled.result as WeatherData).temperature}</p>
                              <p><strong>Condition:</strong> {(message.functionCalled.result as WeatherData).condition}</p>
                              <p><strong>Humidity:</strong> {(message.functionCalled.result as WeatherData).humidity}</p>
                              <p><strong>Wind:</strong> {(message.functionCalled.result as WeatherData).windSpeed}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {message.role === "assistant" && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 ml-2 -mt-1 -mr-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        onClick={() => replayMessage(message.content)}
                        title="Replay this message"
                      >
                        <Volume2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {error && (
          <div className="bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-2 text-sm rounded-md mx-4 mb-2">
            {error}
          </div>
        )}
        
        <div className="border-t border-gray-200 dark:border-gray-800 backdrop-blur-sm bg-white/30 dark:bg-gray-900/30">
          {transcript && (
            <div className="mx-4 mt-4 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <p className="text-sm">{transcript}</p>
            </div>
          )}
          
          {isRecording && hasReceivedAudioData && (
            <div className="mx-4 mt-4 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <div className="flex items-center justify-center">
                <div className="relative w-4 h-4">
                  <div className="absolute w-full h-full rounded-full bg-red-500 animate-ping opacity-75"></div>
                  <div className="absolute w-full h-full rounded-full bg-red-500"></div>
                </div>
                <p className="ml-2 text-sm">Recording...</p>
              </div>
            </div>
          )}
          
          {isPreparingToRecord && !isRecording && (
            <div className="mx-4 mt-4 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <div className="flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                <p className="ml-2 text-sm text-gray-500">Preparing microphone...</p>
              </div>
            </div>
          )}
          
          <form onSubmit={handleTextInputSubmit} className="flex items-center gap-2 p-4">
            <Button 
              type="button"
              variant={recordButtonState.variant}
              size="icon"
              className="rounded-full h-12 w-12 flex-shrink-0"
              onClick={toggleRecording}
              disabled={recordButtonState.disabled}
            >
              {recordButtonState.icon}
            </Button>
            
            <div className="flex-1 relative">
              {isProcessing ? (
                <div className="flex justify-center">
                  <div className="animate-pulse flex space-x-2">
                    <div className="h-2 w-2 bg-gray-500 dark:bg-gray-400 rounded-full"></div>
                    <div className="h-2 w-2 bg-gray-500 dark:bg-gray-400 rounded-full"></div>
                    <div className="h-2 w-2 bg-gray-500 dark:bg-gray-400 rounded-full"></div>
                  </div>
                </div>
              ) : (
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Type a message..."
                  className="w-full rounded-full border border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isProcessing}
                />
              )}
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full">
                  <Settings className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-4">
                  <h4 className="font-medium">Voice Settings</h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="voice-select">OpenAI Voice</Label>
                    <Select 
                      value={selectedVoice} 
                      onValueChange={handleVoiceChange}
                    >
                      <SelectTrigger id="voice-select">
                        <SelectValue placeholder="Select a voice" />
                      </SelectTrigger>
                      <SelectContent>
                        {OPENAI_VOICES.map((voice) => (
                          <SelectItem key={voice.id} value={voice.id}>
                            {voice.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="speed-select">Speech Speed</Label>
                    <Select 
                      value={speechSpeed.toString()} 
                      onValueChange={handleSpeedChange}
                    >
                      <SelectTrigger id="speed-select">
                        <SelectValue placeholder="Select speed" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0.5">Slow (0.5x)</SelectItem>
                        <SelectItem value="0.75">Slower (0.75x)</SelectItem>
                        <SelectItem value="1.0">Normal (1.0x)</SelectItem>
                        <SelectItem value="1.25">Faster (1.25x)</SelectItem>
                        <SelectItem value="1.5">Fast (1.5x)</SelectItem>
                        <SelectItem value="2.0">Very Fast (2.0x)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    Voice settings are saved automatically.
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={stopAudio}
              disabled={!isPlaying}
            >
              <MicOff className="h-4 w-4" />
            </Button>
            
            <Button
              type="submit"
              variant="outline"
              size="icon"
              className="rounded-full flex-shrink-0"
              disabled={(!textInput.trim() && !transcript.trim()) || isProcessing}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
