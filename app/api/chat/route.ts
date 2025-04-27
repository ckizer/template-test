import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { functionConfigs, executeFunction, FunctionCallArgs } from '@/lib/functions/server';

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

    // Call OpenAI API with function calling enabled
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful, friendly AI voice assistant. Keep responses concise and conversational, optimized for voice playback. When users ask about weather, extract their zipcode and use the get_weather function. When users mention quiz questions or ask for a quiz, use the get_quiz_question function.',
        },
        { role: 'user', content: message },
      ],
      max_tokens: 1000,
      temperature: 0.7,
      tools: functionConfigs.map(func => ({
        type: "function",
        function: {
          name: func.name,
          description: func.description,
          parameters: func.parameters
        }
      })),
      tool_choice: "auto"
    });

    const responseMessage = completion.choices[0]?.message;
    
    // Check if the model wants to call a function
    if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolCall = responseMessage.tool_calls[0];
      
      console.log(" FUNCTION CALL DETECTED:", toolCall.function.name);
      console.log(" FUNCTION ARGUMENTS:", toolCall.function.arguments);
      
      // Parse the arguments as JSON
      const args = JSON.parse(toolCall.function.arguments) as FunctionCallArgs;
      
      // Execute the appropriate function
      try {
        console.log(` EXECUTING FUNCTION: ${toolCall.function.name}`);
        
        // Call the function with the provided arguments
        const functionResult = await executeFunction(toolCall.function.name, args);
        
        console.log(" FUNCTION RESULT:", JSON.stringify(functionResult));
        
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
              content: JSON.stringify(functionResult)
            }
          ],
          max_tokens: 1000,
          temperature: 0.7,
        });
        
        const finalResponse = secondCompletion.choices[0]?.message?.content || 'Sorry, I couldn\'t generate a response.';
        
        // Add a prefix to indicate that a function was called
        const functionPrefix = toolCall.function.name === 'get_weather' 
          ? '[Weather data retrieved]' 
          : toolCall.function.name === 'get_quiz_question'
            ? '[Quiz question retrieved]'
            : '[Function executed]';
            
        const enhancedResponse = `${functionPrefix} ${finalResponse}`;
        console.log(" FINAL RESPONSE WITH FUNCTION DATA:", enhancedResponse);
        
        return NextResponse.json({ 
          response: enhancedResponse,
          functionCalled: {
            name: toolCall.function.name,
            args: args,
            result: functionResult
          }
        });
      } catch (error) {
        const functionError = error as Error;
        console.error(" ERROR EXECUTING FUNCTION:", functionError);
        return NextResponse.json({ 
          response: `I'm sorry, I encountered an error while trying to process your request. ${functionError.message}`,
          functionCalled: null
        });
      }
    }

    // If no function was called, return the regular response
    const response = responseMessage?.content || 'Sorry, I couldn\'t generate a response.';
    console.log(" REGULAR RESPONSE (NO FUNCTION CALLED)");
    return NextResponse.json({ response, functionCalled: null });
  } catch (error) {
    const apiError = error as Error;
    console.error(" ERROR IN CHAT API:", apiError);
    return NextResponse.json(
      { error: `Error processing request: ${apiError.message}` },
      { status: 500 }
    );
  }
}
