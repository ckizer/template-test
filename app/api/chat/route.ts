import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Function to get weather data for a given zipcode
async function getWeatherData(zipcode: string) {
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
    return { error: "Unable to fetch weather data at this time." };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, apiKey } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key is required' },
        { status: 400 }
      );
    }

    // Initialize OpenAI client with the user-provided API key
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Define available functions
    const functions = [
      {
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
      }
    ];

    // Call OpenAI API with function calling enabled
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful, friendly AI voice assistant. Keep responses concise and conversational, optimized for voice playback. When users ask about weather, extract their zipcode and use the get_weather function.',
        },
        { role: 'user', content: message },
      ],
      max_tokens: 1000,
      temperature: 0.7,
      tools: functions.map(func => ({ type: "function", function: func })),
      tool_choice: "auto"
    });

    const responseMessage = completion.choices[0]?.message;
    
    // Check if the model wants to call a function
    if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolCall = responseMessage.tool_calls[0];
      
      if (toolCall.function.name === "get_weather") {
        // Parse the arguments as JSON
        const args = JSON.parse(toolCall.function.arguments);
        const zipcode = args.zipcode;
        
        // Call the weather function with the provided zipcode
        const weatherData = await getWeatherData(zipcode);
        
        // Send the function response back to the model to get a final response
        const secondCompletion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful, friendly AI voice assistant. Keep responses concise and conversational, optimized for voice playback.',
            },
            { role: 'user', content: message },
            responseMessage,
            {
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(weatherData)
            }
          ],
          max_tokens: 1000,
          temperature: 0.7,
        });
        
        const finalResponse = secondCompletion.choices[0]?.message?.content || 'Sorry, I couldn\'t generate a response.';
        return NextResponse.json({ response: finalResponse });
      }
    }

    // If no function was called, return the regular response
    const response = responseMessage?.content || 'Sorry, I couldn\'t generate a response.';
    return NextResponse.json({ response });
  } catch (error: unknown) {
    console.error('Error processing chat request:', error);
    
    // Type guard for error with status property
    const apiError = error as { status?: number; message?: string };
    
    // Handle OpenAI API specific errors
    if (apiError.status === 401) {
      return NextResponse.json(
        { error: 'Invalid API key. Please check your OpenAI API key and try again.' },
        { status: 401 }
      );
    }
    
    if (apiError.status === 429) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: apiError.message || 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
}
