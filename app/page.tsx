"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { VoiceChat } from '@/components/VoiceChat'
import { Card, CardContent } from '@/components/ui/card'

export default function Home() {
  const [showChat, setShowChat] = useState(false)

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md">
        {!showChat ? (
          <Card className="backdrop-blur-xl bg-white/30 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800 shadow-xl">
            <CardContent className="flex flex-col items-center justify-center p-8 space-y-8">
              <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AI Voice Assistant
              </h1>
              
              <p className="text-center text-gray-600 dark:text-gray-300">
                Start a conversation with your AI voice assistant. Just tap the button below and speak naturally.
              </p>
              
              <Button 
                size="lg" 
                className="w-full text-lg py-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg"
                onClick={() => setShowChat(true)}
              >
                Start Conversation
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="backdrop-blur-xl bg-white/30 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800 shadow-xl h-[80vh]">
            <CardContent className="p-4 h-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Voice Chat</h2>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowChat(false)}
                >
                  Back
                </Button>
              </div>
              <div className="h-[calc(100%-3rem)]">
                <VoiceChat />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
