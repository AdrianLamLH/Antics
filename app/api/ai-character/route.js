import { generateSpeech, characterVoices } from '../../../utils/elevenlabsService';

export async function POST(req) {
  try {
    // 1. EXTRACT REQUEST DATA
    const { 
      image, 
      controls, 
      userMessage, 
      conversationContext,
      characterId,
      characterConfig 
    } = await req.json();
    
    // 2. SET CHARACTER PARAMETERS
    const contextToUse = conversationContext || "";
    const personality = characterConfig?.personality || "Friendly and curious";
    const biography = characterConfig?.biography || "An AI explorer in a virtual world";
    const goals = characterConfig?.goals || "";
    const speechStyle = characterConfig?.speechStyle || "";
    const customInstructions = characterConfig?.customInstructions || "";

    console.log("Received request with controls:", controls);
    
    // 3. BUILD THE PROMPT - Skip command classification
    let characterPrompt = buildUnifiedPrompt({
      personality,
      biography,
      goals,
      speechStyle,
      customInstructions,
      contextToUse,
      controls,
      userMessage
    });
    
    console.log("=== FULL PROMPT TO LLM ===");
    console.log(characterPrompt);
    console.log("=== END PROMPT ===");
    
    // 4. CALL THE LLM (CLAUDE)
    const data = await callClaudeAPI(characterPrompt, image);
    
    // 5. PARSE THE RESPONSE
    const fullText = data.content[0].text;
    console.log("Claude text response:", fullText);
    
    const aiResponse = parseClaudeResponse(fullText);
    
    // 6. VALIDATE ACTIONS
    validateActions(aiResponse, controls, userMessage || "");
    
    // 7. GENERATE TEXT-TO-SPEECH USING ELEVENLABS
    let audioContent = null;
    if (aiResponse.speech) {
      // Get the voice ID based on the character
      const voiceId = characterVoices[characterId] || characterVoices.character1;
      
      // Generate speech
      console.log(`Generating speech for ${characterId} using voice ${voiceId}`);
      audioContent = await generateSpeech(aiResponse.speech, voiceId);
    }
    
    // Add the audio content to the response
    const finalResponse = {
      ...aiResponse,
      audio: audioContent
    };
    
    console.log("Final processed response with audio:", 
      audioContent ? "Audio generated successfully" : "No audio generated");
    
    return new Response(JSON.stringify(finalResponse), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error("Unexpected error in AI character API:", error);
    return new Response(JSON.stringify({
      ...getFallbackResponse(),
      audio: null
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// HELPER FUNCTIONS

function buildUnifiedPrompt({
  personality,
  biography,
  goals,
  speechStyle,
  customInstructions,
  contextToUse,
  controls,
  userMessage
}) {
  // Character introduction
  let prompt = `You are an AI character in a 3D world exploring your surroundings. The user can chat with you and give you commands.

Your personality: ${personality}
Your biography: ${biography}
${goals ? `\nYour goals: ${goals}` : ''}
${speechStyle ? `\nYour speech style: ${speechStyle}` : ''}
${customInstructions ? `\nAdditional instructions: ${customInstructions}` : ''}

RECENT CONVERSATION HISTORY:
${contextToUse || "No previous conversation."}
Remember to maintain continuity with your previous thoughts and actions.`;

  // Response format with clear action instructions
  prompt += `\n\nYour response must follow this exact format:
THOUGHT: Brief internal thought about the user's request (the user won't see this)
SPEECH: Your conversational response to the user
ACTIONS: (Include this section if and only if the user explicitly requested physical actions, otherwise omit it)
actionType value delay
actionType value delay
...

AVAILABLE ACTIONS:
You can perform these actions: ${controls.join(', ')}

ACTION SPECIFICATIONS:
- moveForward: Move forward in the direction you're facing. Value = distance (5-15), Delay = milliseconds (500-1500)
- moveBackward: Move backward. Value = distance (5-15), Delay = milliseconds (500-1500)
- moveLeft: Strafe left. Value = distance (5-15), Delay = milliseconds (500-1500)
- moveRight: Strafe right. Value = distance (5-15), Delay = milliseconds (500-1500)
- turn: NOTE - For turn right, use NEGATIVE values. For turn left, use POSITIVE values. Value = radians (0.3-3.14), Delay = milliseconds (300-1000)
- jump: Jump upward. Value = height (15-25), Delay = milliseconds (800-1200)
- wait: Pause before next action. Value = duration (300-1500), Delay = milliseconds (300-1000)

CRITICAL INSTRUCTIONS:
- ONLY include actions that the user EXPLICITLY requested
- Do NOT add extra actions the user didn't ask for
- Do NOT create actions for vague or ambiguous requests
- If the user's request doesn't clearly specify actions, do NOT include an ACTIONS section
- For turn commands: Right turns use NEGATIVE values (-0.3 to -3.14), left turns use POSITIVE values (0.3 to 3.14)
- Keep action sequences short and direct - only include what was requested
- For conversational exchanges with no explicit action requests, omit the ACTIONS section entirely`;

  // Add examples for better clarity
  prompt += `\n\nEXAMPLES:

For "turn right 90 degrees":
THOUGHT: The user wants me to turn right 90 degrees, which is about -1.57 radians.
SPEECH: I'll turn right 90 degrees for you.
ACTIONS:
turn -1.57 500

For "go forward and then left":
THOUGHT: The user wants me to move forward and then turn left.
SPEECH: I'll move forward and make a left turn.
ACTIONS:
moveForward 10 800
turn 1.57 500

For "jump":
THOUGHT: The user wants me to jump once.
SPEECH: I'll jump for you.
ACTIONS:
jump 20 800

For "Hello, how are you today?":
THOUGHT: The user is just greeting me, so I should respond conversationally. There's no explicit action request.
SPEECH: Hello! I'm doing quite well today. How about yourself?

For "Can you tell me about this place?":
THOUGHT: The user wants my impression of the environment but has not requested any physical actions.
SPEECH: From what I can see, we're in a virtual space with some interesting geometric features. The lighting creates interesting shadows, and there seems to be some structures in the distance.

For "What do you think of this room?":
THOUGHT: The user is asking for my opinion, not requesting any physical actions.
SPEECH: It's an interesting digital environment with clean lines and a sense of open space. The lighting creates a calm atmosphere.`;

  // Add user message
  if (userMessage && userMessage.trim()) {
    prompt += `\n\nThe user has just said to you: "${userMessage}"

REMEMBER: Only generate ACTIONS if the user explicitly asked you to perform physical actions. Otherwise, respond conversationally without any ACTIONS section.`;
  }
  
  return prompt;
}

function validateActions(aiResponse, controls, userMessage) {
  // If there's no clear action command in the user message, remove any actions
  const actionWords = ['move', 'turn', 'go', 'walk', 'jump', 'forward', 'backward', 'left', 'right', 'stop', 'wait'];
  const containsActionRequest = actionWords.some(word => 
    userMessage.toLowerCase().includes(word)
  );
  
  if (!containsActionRequest && aiResponse.actions && aiResponse.actions.length > 0) {
    console.log("No explicit action requested by user, removing generated actions");
    aiResponse.actions = [];
    return;
  }
  
  // Only keep actions with valid types
  if (aiResponse.actions && aiResponse.actions.length > 0) {
    // Keep track of original action count
    const originalCount = aiResponse.actions.length;
    
    aiResponse.actions = aiResponse.actions.filter(action => 
      controls.includes(action.type)
    );
    
    // Log if actions were removed due to invalid types
    if (aiResponse.actions.length < originalCount) {
      console.log(`Removed ${originalCount - aiResponse.actions.length} invalid actions`);
    }
    
    // Apply safe limits to all action values
    aiResponse.actions.forEach(action => {
      // Cap movement values
      if (['moveForward', 'moveBackward', 'moveLeft', 'moveRight'].includes(action.type)) {
        action.value = Math.max(5, Math.min(action.value, 15));
      }
      
      // Cap turn values
      if (action.type === 'turn') {
        // Ensure the value is within bounds but preserve sign
        action.value = Math.sign(action.value) * 
                        Math.min(Math.abs(action.value), 3.14); // Max 180 degrees
      }
      
      // Cap jump values
      if (action.type === 'jump') {
        action.value = Math.max(15, Math.min(action.value, 25));
      }
      
      // Cap all delays
      action.delay = Math.min(Math.max(action.delay, 300), 1500);
    });
    
    // Limit total number of actions to prevent long sequences
    if (aiResponse.actions.length > 3) {
      console.log(`Limiting action sequence from ${aiResponse.actions.length} to 3 actions`);
      aiResponse.actions = aiResponse.actions.slice(0, 3);
    }
  }
}

async function callClaudeAPI(prompt, image) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY, 
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: "claude-3-sonnet-20240229",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: [
            { type: "text", text: prompt },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: image.replace('data:image/jpeg;base64,', '')
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      console.error("Claude API error:", response.status, response.statusText);
      throw new Error(`Claude API returned ${response.status}`);
    }

  return await response.json();
}

function parseClaudeResponse(fullText) {
    const aiResponse = {
      thought: "",
      speech: "",
      actions: []
    };
    
    // Extract thought
    const thoughtMatch = fullText.match(/THOUGHT:(.+?)(?=SPEECH:|$)/s);
    if (thoughtMatch) {
      aiResponse.thought = thoughtMatch[1].trim();
    } else {
    aiResponse.thought = "I need to respond to the user's request.";
    }
    
    // Extract speech
    const speechMatch = fullText.match(/SPEECH:(.+?)(?=ACTIONS:|$)/s);
    if (speechMatch) {
      aiResponse.speech = speechMatch[1].trim();
    } else {
    aiResponse.speech = "I understand what you're asking.";
    }
    
    // Extract actions
    const actionsMatch = fullText.match(/ACTIONS:(.+)$/s);
    aiResponse.actions = [];
    
    if (actionsMatch) {
      const actionsText = actionsMatch[1].trim();
      const actionLines = actionsText.split('\n');
      
      actionLines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) {
          const [type, valueStr, delayStr] = parts;
          
        const value = parseFloat(valueStr);
            const delay = parseInt(delayStr, 10);
            
            if (!isNaN(value) && !isNaN(delay) && delay > 0) {
          aiResponse.actions.push({ type, value, delay });
        }
      }
    });
  }
  
  return aiResponse;
}

function getFallbackResponse() {
  return {
    thought: "I should respond appropriately to the user.",
    speech: "I'm not sure I understood that correctly. Could you tell me what you'd like me to do?",
      actions: [
      { type: "wait", value: 500, delay: 500 }
    ]
  };
}
