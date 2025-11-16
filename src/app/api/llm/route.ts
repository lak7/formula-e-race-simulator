import { NextRequest, NextResponse } from 'next/server';

// Mock LLM responses based on model type
// Real-time decision making for different AI models
async function getChatGPTDecision(context: any): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = `You are ChatGPT, an AI Formula E driver in real-time race. Make your immediate driving decision based on this context:

Speed: ${context.vehicle?.speed || 0} km/h
Battery: ${Math.round((context.battery || 1) * 100)}%
Tire Wear: ${Math.round((context.tireWear || 0) * 100)}%
Weather: ${context.weather?.type || 'clear'}
Track Segment: ${context.segment?.type || 'straight'}
Cars Ahead: ${context.surroundings?.ahead?.length || 0}
Cars Behind: ${context.surroundings?.behind?.length || 0}

Respond with ONLY a JSON object:
{
  "throttle": number between 0 and 1,
  "braking": number between 0 and 1,
  "steering": number between -1 and 1,
  "drsActivation": boolean,
  "overtakingDecision": "conservative"|"calculated"|"aggressive",
  "pitDecision": "none"|"now"|"next_lap",
  "energyManagement": "conservative"|"balanced"|"aggressive",
  "riskLevel": number between 0 and 1
}

Be balanced and adaptable. Focus on race pace while managing resources effectively.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_completion_tokens: 200,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const decisionText = data.choices[0].message.content.trim();
  const jsonMatch = decisionText.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) {
    throw new Error('No valid JSON found in OpenAI response');
  }

  return JSON.parse(jsonMatch[0]);
}

async function getGeminiDecision(context: any): Promise<any> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('Google AI API key not configured');
  }

  const prompt = `You are Gemini, an AI Formula E driver in real-time race. Make your immediate driving decision based on this context:

Speed: ${context.vehicle?.speed || 0} km/h
Battery: ${Math.round((context.battery || 1) * 100)}%
Tire Wear: ${Math.round((context.tireWear || 0) * 100)}%
Weather: ${context.weather?.type || 'clear'}
Track Segment: ${context.segment?.type || 'straight'}
Cars Ahead: ${context.surroundings?.ahead?.length || 0}
Cars Behind: ${context.surroundings?.behind?.length || 0}

Respond with ONLY a JSON object:
{
  "throttle": number between 0 and 1,
  "braking": number between 0 and 1,
  "steering": number between -1 and 1,
  "drsActivation": boolean,
  "overtakingDecision": "conservative"|"calculated"|"aggressive",
  "pitDecision": "none"|"now"|"next_lap",
  "energyManagement": "conservative"|"balanced"|"aggressive",
  "riskLevel": number between 0 and 1
}

Be aggressive and opportunistic. Focus on overtaking and speed while managing resources efficiently.`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('No candidates returned from Gemini API');
  }
  
  const decisionText = data.candidates[0].content.parts[0].text.trim();
  const jsonMatch = decisionText.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) {
    throw new Error('No valid JSON found in Gemini response');
  }

  return JSON.parse(jsonMatch[0]);
}

async function getQwenDecision(context: any): Promise<any> {
  // Fallback to rule-based decision for Qwen (can be implemented later)
  return {
    throttle: 0.75,
    braking: 0.12,
    steering: 0.04,
    drsActivation: false,
    overtakingDecision: 'opportunistic',
    pitDecision: 'none',
    energyManagement: 'aggressive',
    riskLevel: 0.5
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle test connection
    if (body.test) {
      // Test API connectivity for all configured models
      const tests = [];
      
      if (process.env.OPENAI_API_KEY) {
        try {
          const response = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
          });
          tests.push({ model: 'ChatGPT', status: response.ok ? 'ok' : 'error' });
        } catch (error) {
          tests.push({ model: 'ChatGPT', status: 'error' });
        }
      }
      
      if (process.env.GOOGLE_AI_API_KEY) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_AI_API_KEY}`);
          tests.push({ model: 'Gemini', status: response.ok ? 'ok' : 'error' });
        } catch (error) {
          tests.push({ model: 'Gemini', status: 'error' });
        }
      }
      
      return NextResponse.json({ 
        status: 'ok', 
        message: 'API connection test completed',
        models: tests.length > 0 ? tests : [{ model: 'Mock', status: 'ok' }]
      });
    }
    
    // Get model type and context from request
    const modelType = body.modelType || 'ChatGPT';
    const context = body.context || {};
    
    console.log(`Real-time LLM API call for ${modelType}:`, context);
    
    let decision;
    
    switch (modelType.toLowerCase()) {
      case 'chatgpt':
      case 'openai':
        decision = await getChatGPTDecision(context);
        break;
      case 'gemini':
      case 'google':
        decision = await getGeminiDecision(context);
        break;
      case 'qwen':
      case 'alibaba':
        decision = await getQwenDecision(context);
        break;
      default:
        // Fallback to rule-based decision
        decision = {
          throttle: 0.7,
          braking: 0.1,
          steering: 0.0,
          drsActivation: true,
          overtakingDecision: 'calculated',
          pitDecision: 'none',
          energyManagement: 'balanced',
          riskLevel: 0.5
        };
    }
    
    console.log(`Real-time LLM API (${modelType}) decision:`, decision);
    
    return NextResponse.json({ decision });
  } catch (error) {
    console.error('LLM API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Return fallback decision on error
    const fallbackDecision = {
      throttle: 0.7,
      braking: 0.1,
      steering: 0.0,
      drsActivation: true,
      overtakingDecision: 'calculated',
      pitDecision: 'none',
      energyManagement: 'balanced',
      riskLevel: 0.5
    };
    
    return NextResponse.json({ 
      error: errorMessage,
      decision: fallbackDecision // Provide fallback to keep race running
    }, { status: 500 });
  }
}
