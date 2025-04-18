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
import { Slider } from "@/components/ui/slider";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Voice {
  name: string;
  voiceURI: string;
  lang: string;
}

export function VoiceChat() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [speechPitch, setSpeechPitch] = useState<number>(1.0);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Initialize speech recognition and synthesis
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Check if browser supports speech recognition
      if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map(result => result[0])
            .map(result => result.transcript)
            .join("");
          setTranscript(transcript);
        };
        
        recognitionRef.current.onerror = (event) => {
          console.error("Speech recognition error", event.error);
          setError(`Microphone error: ${event.error}`);
          setIsListening(false);
        };
      } else {
        setError("Your browser does not support speech recognition");
      }
      
      // Initialize speech synthesis
      if ("speechSynthesis" in window) {
        synthesisRef.current = window.speechSynthesis;
        
        // Load available voices
        const loadVoices = () => {
          const voices = synthesisRef.current?.getVoices() || [];
          const voiceList = voices.map(voice => ({
            name: voice.name,
            voiceURI: voice.voiceURI,
            lang: voice.lang
          }));
          setAvailableVoices(voiceList);
          
          // Set default voice if available
          if (voiceList.length > 0) {
            // Try to find a voice with English language
            const englishVoice = voiceList.find(voice => voice.lang.includes('en'));
            const defaultVoice = englishVoice || voiceList[0];
            setSelectedVoice(defaultVoice.voiceURI);
            
            // Save to localStorage
            localStorage.setItem("selected-voice", defaultVoice.voiceURI);
            localStorage.setItem("speech-rate", "1.0");
            localStorage.setItem("speech-pitch", "1.0");
          }
        };
        
        // Chrome loads voices asynchronously
        if (synthesisRef.current.onvoiceschanged !== undefined) {
          synthesisRef.current.onvoiceschanged = loadVoices;
        }
        
        // Initial load of voices
        loadVoices();
        
        // Load saved preferences
        const savedVoice = localStorage.getItem("selected-voice");
        const savedRate = localStorage.getItem("speech-rate");
        const savedPitch = localStorage.getItem("speech-pitch");
        
        if (savedVoice) setSelectedVoice(savedVoice);
        if (savedRate) setSpeechRate(parseFloat(savedRate));
        if (savedPitch) setSpeechPitch(parseFloat(savedPitch));
      } else {
        setError("Your browser does not support speech synthesis");
      }
      
      // Check for stored API key
      const storedApiKey = localStorage.getItem("openai-api-key");
      if (storedApiKey) {
        setApiKey(storedApiKey);
      } else {
        setIsApiKeyModalOpen(true);
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    };
  }, []);
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  const toggleListening = () => {
    if (!apiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }
    
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      
      if (transcript.trim()) {
        sendMessage(transcript);
      }
    } else {
      setTranscript("");
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
      setIsListening(true);
      setError("");
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
      
      // Speak the response with selected voice
      if (synthesisRef.current) {
        const utterance = new SpeechSynthesisUtterance(data.response);
        
        // Set selected voice
        const voices = synthesisRef.current.getVoices();
        const voice = voices.find(v => v.voiceURI === selectedVoice);
        if (voice) {
          utterance.voice = voice;
        }
        
        // Set rate and pitch
        utterance.rate = speechRate;
        utterance.pitch = speechPitch;
        
        synthesisRef.current.speak(utterance);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setError(err instanceof Error ? err.message : "Failed to get response");
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleApiKeySubmit = (key: string) => {
    setApiKey(key);
  };
  
  const stopSpeaking = () => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
    }
  };
  
  const handleVoiceChange = (voiceURI: string) => {
    setSelectedVoice(voiceURI);
    localStorage.setItem("selected-voice", voiceURI);
  };
  
  const handleRateChange = (value: number[]) => {
    const rate = value[0];
    setSpeechRate(rate);
    localStorage.setItem("speech-rate", rate.toString());
  };
  
  const handlePitchChange = (value: number[]) => {
    const pitch = value[0];
    setSpeechPitch(pitch);
    localStorage.setItem("speech-pitch", pitch.toString());
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
        {isListening && (
          <div className="mb-4 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-sm">{transcript || "Listening..."}</p>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <Button 
            variant={isListening ? "destructive" : "default"}
            size="icon"
            className="rounded-full h-12 w-12"
            onClick={toggleListening}
            disabled={isProcessing}
          >
            {isListening ? <StopCircle className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
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
                  <Label htmlFor="voice-select">Voice</Label>
                  <Select 
                    value={selectedVoice} 
                    onValueChange={handleVoiceChange}
                  >
                    <SelectTrigger id="voice-select">
                      <SelectValue placeholder="Select a voice" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVoices.map((voice) => (
                        <SelectItem key={voice.voiceURI} value={voice.voiceURI}>
                          {voice.name} ({voice.lang})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="rate-slider">Rate: {speechRate.toFixed(1)}</Label>
                  </div>
                  <Slider
                    id="rate-slider"
                    min={0.5}
                    max={2}
                    step={0.1}
                    value={[speechRate]}
                    onValueChange={handleRateChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label htmlFor="pitch-slider">Pitch: {speechPitch.toFixed(1)}</Label>
                  </div>
                  <Slider
                    id="pitch-slider"
                    min={0.5}
                    max={2}
                    step={0.1}
                    value={[speechPitch]}
                    onValueChange={handlePitchChange}
                  />
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
            onClick={stopSpeaking}
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
