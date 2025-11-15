import { NextRequest, NextResponse } from 'next/server';

// Type definitions for driver strategy
interface DriverStrategy {
  aggression: number;
  tireManagement: number;
  fuelManagement: number;
  overtakingSkill: number;
  defensiveSkill: number;
  wetWeatherSkill: number;
  drsUsage: number;
  pitStrategy: {
    initialTire: string;
    targetLaps: number;
    fuelLoad: number;
  };
}

// OpenAI API integration
async function generateOpenAIStrategy(trackInfo: string): Promise<DriverStrategy> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `You are ChatGPT, an AI Formula E driver. Given this track information: ${trackInfo}
                            
Generate your racing strategy as a JSON object with these exact fields:
{
  "aggression": number between 0.1 and 1.0,
  "tireManagement": number between 0.1 and 1.0,
  "fuelManagement": number between 0.1 and 1.0,
  "overtakingSkill": number between 0.1 and 1.0,
  "defensiveSkill": number between 0.1 and 1.0,
  "wetWeatherSkill": number between 0.1 and 1.0,
  "drsUsage": number between 0.1 and 1.0,
  "pitStrategy": {
    "initialTire": "soft" or "medium" or "hard",
    "targetLaps": number between 15 and 35,
    "fuelLoad": number between 0.5 and 1.0
  }
}

Be balanced and adaptable. Focus on race pace while managing resources effectively. Look for strategic overtaking opportunities. Return ONLY the JSON object, no explanations.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5.1',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_completion_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API response error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${response.statusText}. Response: ${errorText}`);
    }

    const data = await response.json();
    console.log('OpenAI API response:', JSON.stringify(data, null, 2));
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No choices returned from OpenAI API');
    }
    
    const strategyText = data.choices[0].message.content.trim();
    
    // Extract JSON from response
    const jsonMatch = strategyText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`No valid JSON found in OpenAI response. Response: ${strategyText}`);
    }
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('OpenAI strategy generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`OpenAI API Error: ${errorMessage}. Please check your API key and network connection.`);
  }
}

// Google Gemini API integration
async function generateGeminiStrategy(trackInfo: string): Promise<DriverStrategy> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('Google AI API key not configured');
  }

  const prompt = `You are Gemini, an AI Formula E driver. Given this track information: ${trackInfo}
Generate your racing strategy as a JSON object with these exact fields:
{
  "aggression": number between 0.1 and 1.0,
  "tireManagement": number between 0.1 and 1.0,
  "fuelManagement": number between 0.1 and 1.0,
  "overtakingSkill": number between 0.1 and 1.0,
  "defensiveSkill": number between 0.1 and 1.0,
  "wetWeatherSkill": number between 0.1 and 1.0,
  "drsUsage": number between 0.1 and 1.0,
  "pitStrategy": {
    "initialTire": "soft" or "medium" or "hard",
    "targetLaps": number between 15 and 35,
    "fuelLoad": number between 0.5 and 1.0
  }
}

Be aggressive and opportunistic. Focus on overtaking and speed while managing resources efficiently. Return ONLY the JSON object, no explanations.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API response error:', errorText);
      throw new Error(`Gemini API error: ${response.status} - ${response.statusText}. Response: ${errorText}`);
    }

    const data = await response.json();
    console.log('Gemini API response:', JSON.stringify(data, null, 2));
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No candidates returned from Gemini API');
    }
    
    const strategyText = data.candidates[0].content.parts[0].text.trim();
    
    // Extract JSON from response
    const jsonMatch = strategyText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`No valid JSON found in Gemini response. Response: ${strategyText}`);
    }
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Gemini strategy generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Gemini API Error: ${errorMessage}. Please check your API key and network connection.`);
  }
}

// Qwen API integration (via Groq)
async function generateQwenStrategy(trackInfo: string): Promise<DriverStrategy> {
  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) {
    throw new Error('Qwen API key not configured');
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen/qwen3-32b',
        messages: [
          { 
            role: 'system', 
            content: 'You are a JSON API. Respond only with valid JSON objects. No explanations.' 
          },
          { 
            role: 'user', 
            content: `Generate Formula E strategy for: ${trackInfo}. Conservative style, tire preservation, fuel efficiency. 
            Return JSON with: aggression(0.1-1.0), tireManagement(0.1-1.0), fuelManagement(0.1-1.0), overtakingSkill(0.1-1.0), defensiveSkill(0.1-1.0), wetWeatherSkill(0.1-1.0), drsUsage(0.1-1.0), pitStrategy{initialTire(soft/medium/hard), targetLaps(15-35), fuelLoad(0.5-1.0)}` 
          }
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Qwen API response error:', errorText);
      throw new Error(`Qwen API error: ${response.status} - ${response.statusText}. Response: ${errorText}`);
    }

    const data = await response.json();
    console.log('Qwen API response:', JSON.stringify(data, null, 2));
    
    if (!data.choices || data.choices.length === 0) {
      throw new Error('No choices returned from Qwen API');
    }
    
    const strategyText = data.choices[0].message.content.trim();
    console.log('Raw Qwen response text:', strategyText);
    
    // Try to parse as JSON directly first
    try {
      return JSON.parse(strategyText);
    } catch {
      // If direct parsing fails, try to extract JSON
      const jsonMatches = strategyText.match(/\{[\s\S]*?\}/g);
      if (!jsonMatches || jsonMatches.length === 0) {
        throw new Error(`No valid JSON found in Qwen response. Response: ${strategyText}`);
      }
      
      // Use the last JSON match (most likely to be complete)
      const jsonStr = jsonMatches[jsonMatches.length - 1];
      console.log('Extracted JSON:', jsonStr);
      
      return JSON.parse(jsonStr);
    }
  } catch (error) {
    console.error('Qwen strategy generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Qwen API Error: ${errorMessage}. Please check your API key and network connection.`);
  }
}

// Main API route handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trackInfo, aiModel } = body;

    if (!trackInfo || !aiModel) {
      return NextResponse.json(
        { error: 'Missing trackInfo or aiModel in request' },
        { status: 400 }
      );
    }

    let strategy: DriverStrategy;

    switch (aiModel.toLowerCase()) {
      case 'chatgpt':
      case 'openai':
        strategy = await generateOpenAIStrategy(trackInfo);
        break;
      case 'gemini':
      case 'google':
        strategy = await generateGeminiStrategy(trackInfo);
        break;
      case 'qwen':
      case 'alibaba':
        strategy = await generateQwenStrategy(trackInfo);
        break;
      default:
        return NextResponse.json(
          { error: `Unsupported AI model: ${aiModel}. Use 'chatgpt', 'gemini', or 'qwen'` },
          { status: 400 }
        );
    }

    // Validate the strategy object
    if (!strategy || typeof strategy !== 'object') {
      throw new Error('Invalid strategy object returned from AI');
    }

    // Validate required fields
    const requiredFields = ['aggression', 'tireManagement', 'fuelManagement', 'overtakingSkill', 'defensiveSkill', 'wetWeatherSkill', 'drsUsage', 'pitStrategy'];
    for (const field of requiredFields) {
      if (!(field in strategy)) {
        throw new Error(`Missing required field in strategy: ${field}`);
      }
    }

    // Validate pitStrategy fields
    const pitStrategyFields = ['initialTire', 'targetLaps', 'fuelLoad'];
    for (const field of pitStrategyFields) {
      if (!(field in strategy.pitStrategy)) {
        throw new Error(`Missing required field in pitStrategy: ${field}`);
      }
    }

    return NextResponse.json({ strategy });
  } catch (error) {
    console.error('AI Strategy generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// Handle GET requests
export async function GET() {
  return NextResponse.json(
    { message: 'AI Strategy API is running. Use POST with trackInfo and aiModel (chatgpt or gemini).' },
    { status: 200 }
  );
}
