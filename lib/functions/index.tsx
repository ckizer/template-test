"use client";

// Client-side function registry - for rendering function results in the UI
import { renderWeatherData } from './weather';
import { renderQuizData } from './quiz';
import { ReactNode } from 'react';

// Import types from the server file
import type { 
  WeatherData, 
  QuizData, 
  FunctionResult, 
  FunctionCallArgs, 
  FunctionCallData as ServerFunctionCallData 
} from './server';

// Re-export the types
export type { WeatherData, QuizData, FunctionResult, FunctionCallArgs };
export type FunctionCallData = ServerFunctionCallData;

// Function to render the appropriate component based on function name and result
export function renderFunctionResult(functionName: string, result: FunctionResult): ReactNode {
  switch (functionName) {
    case 'get_weather':
      return renderWeatherData(result as WeatherData);
    case 'get_quiz_question':
      return renderQuizData(result as QuizData);
    default:
      return <div>Unknown function result</div>;
  }
}
