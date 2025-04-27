"use client";

// Quiz function UI component
import React from 'react';
import type { QuizData } from './server';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Component to render quiz data
export function renderQuizData(quizData: QuizData): React.ReactNode {
  return (
    <Card className="mt-1 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/30">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-bold text-red-700 dark:text-red-400">Quiz Question</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 text-sm">
        <p className="font-medium mb-2">{quizData.question}</p>
        <ul className="list-disc pl-5 mb-2">
          {quizData.options.map((option, index) => (
            <li key={index} className="mb-1">{option}</li>
          ))}
        </ul>
        {quizData.explanation && (
          <p className="text-gray-600 dark:text-gray-400 italic mt-2 text-xs">{quizData.explanation}</p>
        )}
      </CardContent>
    </Card>
  );
}
