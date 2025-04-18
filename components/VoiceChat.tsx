"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, Send, StopCircle, Settings, Loader2 } from "lucide-react";
import { ApiKeyModal } from "@/components/ApiKeyModal";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

interface Message {
  role: "user" | "assistant";
  content: string;
}

// OpenAI voice options
const OPENAI_VOICES = [
  { id: 'alloy', name: 'Alloy' },
  { id: 'echo', name: 'Echo' },
  { id: 'fable', name: 'Fable' },
  { id: 'onyx', name: 'Onyx' },
  { id: 'nova', name: 'Nova' },
  { id: 'shimmer', name: 'Shimmer' },
];

// Constants for audio recording
const TIMESLICE_MS = 100; // Request data every 100ms
const RECORDING_DELAY_MS = 500; // Add a small delay before stopping to capture trailing audio

export function VoiceChat() {
  // Recording states
  const [isPreparingToRecord, setIsPreparingToRecord] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [hasReceivedAudioData, setHasReceivedAudioData] = useState(false);
  
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [selectedVoice, setSelectedVoice] = useState<string>("alloy");
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize audio element
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioRef.current = new Audio();
      audioRef.current.onended = () => {
        setIsPlaying(false);
      };
      
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
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      // Clean up any recording stream on unmount
      if (recordingStream) {
        recordingStream.getTracks().forEach(track => track.stop());
      }
      
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
      }
      
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
    };
  }, [recordingStream]);
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  // Safety timeout for recording preparation
  useEffect(() => {
    if (isPreparingToRecord) {
      // If we're still in "preparing" state after 5 seconds, something went wrong
      const timeout = setTimeout(() => {
        if (isPreparingToRecord && !isRecording) {
          setIsPreparingToRecord(false);
          setError("Recording initialization timed out. Please try again.");
        }
      }, 5000);
      
      return () => clearTimeout(timeout);
    }
  }, [isPreparingToRecord, isRecording]);
  
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
      const assistantMessage: Message = { role: "assistant", content: data.response };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Play the response using OpenAI's TTS
      await playResponseAudio(data.response);
    } catch (err) {
      console.error("Error sending message:", err);
      setError(err instanceof Error ? err.message : "Failed to get response");
    } finally {
      setIsProcessing(false);
    }
  };
  
  const playResponseAudio = async (text: string) => {
    try {
      const response = await fetch("/api/speak", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          voice: selectedVoice,
          apiKey,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate speech");
      }
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("Error playing audio:", err);
      setError(err instanceof Error ? err.message : "Failed to play audio response");
    }
  };
  
  const handleApiKeySubmit = (key: string) => {
    setApiKey(key);
  };
  
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };
  
  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoice(voiceId);
    localStorage.setItem("openai-voice", voiceId);
  };
  
  const toggleRecording = () => {
    if (isPreparingToRecord || isRecording) {
      stopRecording();
    } else {
      startRecording();
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
                <p>{message.content}</p>
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
      
      <div className="border-t border-gray-200 dark:border-gray-800 p-4 backdrop-blur-sm bg-white/30 dark:bg-gray-900/30">
        {transcript && (
          <div className="mb-4 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-sm">{transcript}</p>
          </div>
        )}
        
        {isRecording && hasReceivedAudioData && (
          <div className="mb-4 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
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
          <div className="mb-4 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
            <div className="flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
              <p className="ml-2 text-sm text-gray-500">Preparing microphone...</p>
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <Button 
            variant={recordButtonState.variant}
            size="icon"
            className="rounded-full h-12 w-12"
            onClick={toggleRecording}
            disabled={recordButtonState.disabled}
          >
            {recordButtonState.icon}
          </Button>
          
          <div className="flex-1">
            {isProcessing && (
              <div className="flex justify-center">
                <div className="animate-pulse flex space-x-2">
                  <div className="h-2 w-2 bg-gray-500 dark:bg-gray-400 rounded-full"></div>
                  <div className="h-2 w-2 bg-gray-500 dark:bg-gray-400 rounded-full"></div>
                  <div className="h-2 w-2 bg-gray-500 dark:bg-gray-400 rounded-full"></div>
                </div>
              </div>
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
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={() => sendMessage(transcript)}
            disabled={!transcript.trim() || isProcessing}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default VoiceChat;
