"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, Send, StopCircle, Settings } from "lucide-react";
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

export function VoiceChat() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [selectedVoice, setSelectedVoice] = useState<string>("alloy");
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
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
    };
  }, []);
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  const startRecording = async () => {
    try {
      if (!apiKey) {
        setIsApiKeyModalOpen(true);
        return;
      }
      
      setError("");
      audioChunksRef.current = [];
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
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
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await transcribeAudio(audioBlob);
        
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Error starting recording:", err);
      setError("Could not access microphone. Please check your browser permissions.");
      setIsRecording(false);
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
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
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };
  
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
        
        {isRecording && (
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
        
        <div className="flex items-center gap-2">
          <Button 
            variant={isRecording ? "destructive" : "default"}
            size="icon"
            className="rounded-full h-12 w-12"
            onClick={toggleRecording}
            disabled={isProcessing}
          >
            {isRecording ? <StopCircle className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
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
