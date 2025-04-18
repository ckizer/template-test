"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApiKeySubmit: (apiKey: string) => void;
}

export function ApiKeyModal({ isOpen, onClose, onApiKeySubmit }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  
  // Check if API key exists in localStorage on component mount
  useEffect(() => {
    const storedApiKey = localStorage.getItem("openai-api-key");
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
  }, []);

  const handleSubmit = () => {
    if (!apiKey.trim()) {
      setError("Please enter a valid API key");
      return;
    }
    
    if (!apiKey.startsWith("sk-")) {
      setError("API key should start with 'sk-'");
      return;
    }
    
    // Store API key in localStorage
    localStorage.setItem("openai-api-key", apiKey);
    onApiKeySubmit(apiKey);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md backdrop-blur-xl bg-white/30 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-xl">OpenAI API Key</DialogTitle>
          <DialogDescription>
            Enter your OpenAI API key to use the voice chat feature. 
            Your key is stored locally in your browser and never sent to our servers.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setError("");
              }}
              className="bg-white/50 dark:bg-gray-800/50"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ApiKeyModal;
