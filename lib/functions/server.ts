// Server-side function definitions for OpenAI API
// This file contains only the function configurations and data types
// No React or client-side code should be included here

// Define the weather data interface
export interface WeatherData {
  location: string;
  temperature: string;
  condition: string;
  humidity: string;
  windSpeed: string;
  error?: string;
}

// Define the quiz data interface
export interface QuizData {
  question: string;
  options: string[];
  correctAnswer?: string;
  explanation?: string;
}

// Define a union type for all function result types
export type FunctionResult = WeatherData | QuizData;

// Define a type for function call arguments
export interface FunctionCallArgs {
  [key: string]: string | number | boolean;
}

// Define a type for function call data
export interface FunctionCallData {
  name: string;
  args: FunctionCallArgs;
  result: FunctionResult;
}

// Weather function configuration for OpenAI
export const weatherFunctionConfig = {
  name: "get_weather",
  description: "Get the current weather for a specific location by zipcode",
  parameters: {
    type: "object",
    properties: {
      zipcode: {
        type: "string",
        description: "The US zipcode to get weather for, e.g. 90210"
      }
    },
    required: ["zipcode"]
  }
};

// Quiz function configuration for OpenAI
export const quizFunctionConfig = {
  name: "get_quiz_question",
  description: "Get a quiz question to test the user's knowledge",
  parameters: {
    type: "object",
    properties: {},
    required: []
  }
};

// Define the registry of all available functions
export const functionConfigs = [
  weatherFunctionConfig,
  quizFunctionConfig
];

// Function to get weather data for a given zipcode
export async function getWeatherData(zipcode: string): Promise<WeatherData> {
  try {
    // This is a placeholder - you would replace this with a real weather API call
    // Example using OpenWeatherMap API:
    // const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?zip=${zipcode},us&appid=${process.env.WEATHER_API_KEY}&units=imperial`);
    // const data = await response.json();
    
    // For demonstration, returning mock data
    return {
      location: `${zipcode}`,
      temperature: "72°F",
      condition: "Partly Cloudy",
      humidity: "45%",
      windSpeed: "8 mph"
    };
  } catch (error) {
    console.error("Error fetching weather data:", error);
    return { 
      location: zipcode,
      temperature: "Unknown",
      condition: "Error",
      humidity: "Unknown",
      windSpeed: "Unknown",
      error: "Unable to fetch weather data at this time." 
    };
  }
}

// Function to get a quiz question
export async function getQuizQuestion(): Promise<QuizData> {
  try {
    // This is a placeholder - you would replace this with a real quiz API call
    // For demonstration, returning a mock quiz question
    return {
      question: "What is the capital of France?",
      options: ["London", "Berlin", "Paris", "Madrid"],
      correctAnswer: "Paris",
      explanation: "Paris is the capital and most populous city of France."
    };
  } catch (error) {
    console.error("Error fetching quiz question:", error);
    return { 
      question: "Error loading quiz",
      options: ["Try again later"],
      explanation: "Unable to fetch quiz data at this time."
    };
  }
}

// Function to execute the appropriate function based on name and args
export async function executeFunction(name: string, args: FunctionCallArgs): Promise<FunctionResult> {
  console.log(`Executing function: ${name} with args:`, args);
  
  switch (name) {
    case 'get_weather':
      return await getWeatherData(args.zipcode as string);
    case 'get_quiz_question':
      return await getQuizQuestion();
    default:
      throw new Error(`Unknown function: ${name}`);
  }
}
