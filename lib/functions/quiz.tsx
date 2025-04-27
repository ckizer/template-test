"use client";

// Quiz function UI component
import React from 'react';
import type { QuizData } from './server';

// Component to render quiz data
export function renderQuizData(quizData: QuizData): React.ReactNode {
  return (
    <div className="mt-1 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm">
      <h2 className="font-bold text-red-700 dark:text-red-400 mb-2">Quiz Question</h2>
      <p className="font-medium mb-2">{quizData.question}</p>
      <ul className="list-disc pl-5 mb-2">
        {quizData.options.map((option, index) => (
          <li key={index} className="mb-1">{option}</li>
        ))}
      </ul>
      {quizData.explanation && (
        <p className="text-gray-600 dark:text-gray-400 italic mt-2">{quizData.explanation}</p>
      )}
    </div>
  );
}
