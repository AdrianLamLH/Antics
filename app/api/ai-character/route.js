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
    
    // 3. DETERMINE COMMAND TYPE
    const commandType = getCommandType(userMessage);
    console.log(`Command type detected: ${commandType}`);
    
    // 4. BUILD THE PROMPT
    let characterPrompt = buildBasePrompt({
      personality,
      biography,
      goals,
      speechStyle,
      customInstructions,
      contextToUse,
      controls,
      commandType,
      userMessage
    });
    
    console.log("=== FULL PROMPT TO LLM ===");
    console.log(characterPrompt);
    console.log("=== END PROMPT ===");
    
    // 5. CALL THE LLM (CLAUDE)
    const data = await callClaudeAPI(characterPrompt, image);
    
    // 6. PARSE THE RESPONSE
    const fullText = data.content[0].text;
    console.log("Claude text response:", fullText);
    
    const aiResponse = parseClaudeResponse(fullText);
    
    // 7. PROCESS ACTIONS BASED ON COMMAND TYPE
    processActions(aiResponse, commandType, userMessage, controls);
    
    // 8. GENERATE TEXT-TO-SPEECH USING ELEVENLABS
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

function getCommandType(userMessage) {
  if (!userMessage) return "chat";
  
  const msg = userMessage.toLowerCase();
  
  // Single action commands
  if (msg.match(/^(turn|rotate) (right|left|around|clockwise|counterclockwise)/i)) {
    return "turn";
  }
  
  if (msg.match(/^jump/i)) {
    return "jump";
  }
  
  if (msg.match(/^wait/i) || msg.match(/^stay/i) || msg.match(/^stop/i)) {
    return "wait";
  }
  
  // Movement commands
  if (msg.match(/^(walk|move|go) (forward|forwards|ahead|straight)/i)) {
    return "moveForward";
  }
  
  if (msg.match(/^(walk|move|go) (backward|backwards|back)/i)) {
    return "moveBackward";
  }
  
  if (msg.match(/^(walk|move|go) (left)/i)) {
    return "moveLeft";
  }
  
  if (msg.match(/^(walk|move|go) (right)/i)) {
    return "moveRight";
  }
  
  // Compound commands
  if (msg.includes(" and ") || msg.includes(" then ") || 
      msg.includes("after") || msg.match(/multiple|several|sequence/i)) {
    return "compound";
  }
  
  // Exploratory commands
  if (msg.match(/explore|look around|search|investigate|check/i)) {
    return "exploratory";
  }
  
  // Default to chat if no command pattern is matched
  return "chat";
}

function buildBasePrompt({
  personality,
  biography,
  goals,
  speechStyle,
  customInstructions,
  contextToUse,
  controls,
  commandType,
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

  // Basic response format
  prompt += `\n\nYour response must follow this exact format:
THOUGHT: Brief internal thought about the user's request
SPEECH: Your conversational response to the user
ACTIONS: (only include this section for movement commands)
actionType value delay`;

  // Command-specific instructions
  prompt += `\n\nYou can perform these actions: ${controls.join(', ')}`;
  
  // Select appropriate guidelines based on command type
  if (commandType === "turn") {
    prompt += buildTurnPrompt();
  } else if (commandType === "jump" || commandType === "wait") {
    prompt += buildSimpleActionPrompt(commandType);
  } else if (commandType === "moveForward" || commandType === "moveBackward" || 
             commandType === "moveLeft" || commandType === "moveRight") {
    prompt += buildMovementPrompt(commandType);
  } else if (commandType === "compound") {
    prompt += buildCompoundPrompt();
  } else if (commandType === "exploratory") {
    prompt += buildExploratoryPrompt();
  } else {
    prompt += buildChatPrompt();
  }
  
  // Add user message
  if (userMessage && userMessage.trim()) {
    prompt += `\n\nThe user has just said to you: "${userMessage}"`;
  }
  
  return prompt;
}

function buildTurnPrompt() {
  return `\n\nTURN COMMAND GUIDELINES:
- Extract the exact turn direction (right/left) and angle if specified
- For right turns, use positive values (turning clockwise)
- For left turns, use negative values (turning counter-clockwise)
- Use standard values: 90° = 1.57, 180° = 3.14, 45° = 0.78
- Only include a single turn action with no additional movements
- Default to 90° (1.57 radians) if no specific angle is mentioned

EXAMPLE:
For "turn right 90 degrees":
ACTIONS:
turn 1.57 500

For "turn left":
ACTIONS:
turn -1.57 500`;
}

function buildSimpleActionPrompt(type) {
  return `\n\nSIMPLE ACTION GUIDELINES:
- Include exactly one ${type} action
- No additional movements before or after
- Use appropriate values (${type === 'jump' ? '15-25 for jump height' : '300-1000 ms for wait time'})

EXAMPLE:
For "${type}":
ACTIONS:
${type} ${type === 'jump' ? '20' : '500'} ${type === 'jump' ? '800' : '500'}`;
}

function buildMovementPrompt(direction) {
  return `\n\nMOVEMENT GUIDELINES:
- Use only ${direction} actions (no turns or other movements)
- Include 2-3 actions of the same type with different distances
- Maintain a straight line pattern

EXAMPLE:
For "${direction.replace('move', 'walk')}":
ACTIONS:
${direction} 10 800
${direction} 8 700
${direction} 12 900`;
}

function buildCompoundPrompt() {
  return `\n\nCOMPOUND COMMAND GUIDELINES:
- Follow the exact sequence requested by the user
- Include only the actions mentioned in the user's request
- Use appropriate values for each action type
- Order matters: execute actions in the order mentioned

EXAMPLE:
For "walk forward then turn right":
ACTIONS:
moveForward 10 800
turn 1.57 500

For "jump and then move left":
ACTIONS:
jump 20 800
wait 300 300
moveLeft 10 800`;
}

function buildExploratoryPrompt() {
  return `\n\nEXPLORATORY COMMAND GUIDELINES:
- Create a short sequence of diverse actions (3-5 total)
- Include a mix of movements and turns to simulate exploration
- Maintain realistic movement patterns
- Add short waits between major actions to simulate looking around

EXAMPLE:
For "explore the area":
ACTIONS:
moveForward 10 800
turn 0.7 500
wait 500 500
moveForward 8 700
turn -0.5 500`;
}

function buildChatPrompt() {
  return `\n\nCHAT RESPONSE GUIDELINES:
- Respond conversationally to the user's message
- Do NOT include any ACTIONS section
- Only include THOUGHT and SPEECH sections
- Keep your character's personality and background in mind

EXAMPLE:
For "Tell me about this place":
THOUGHT: The user wants to know about this environment. I should describe what I can see.
SPEECH: This appears to be a virtual landscape with interesting geometric features. The lighting creates dramatic shadows on the surfaces around us.`;
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

function processActions(aiResponse, commandType, userMessage, controls) {
  // Validate all actions have valid types
  aiResponse.actions = aiResponse.actions.filter(action => 
    controls.includes(action.type)
  );
  
  // Process based on command type
  if (commandType === "turn") {
    processTurnCommand(aiResponse, userMessage);
  } else if (commandType === "jump" || commandType === "wait") {
    processSimpleCommand(aiResponse, commandType);
  } else if (["moveForward", "moveBackward", "moveLeft", "moveRight"].includes(commandType)) {
    processMovementCommand(aiResponse, commandType);
  } else if (commandType === "exploratory" && aiResponse.actions.length === 0) {
    // Only add default exploratory actions if none were generated
    addDefaultExploratoryActions(aiResponse);
  }
  
  // Cap all action values for safety
  capActionValues(aiResponse.actions);
}

function processTurnCommand(aiResponse, userMessage) {
  // Extract angle if present
  let angle = 1.57; // Default 90 degrees
  const angleMatch = userMessage.match(/(\d+)\s*degree/i);
  if (angleMatch) {
    angle = parseInt(angleMatch[1]) * Math.PI / 180;
  }
  
  // Determine direction
  const isRight = !userMessage.toLowerCase().includes('left');
  
  // INVERT THE DIRECTION to fix the reversed turning
  // if isRight is true, we want to turn left in the physics system (negative angle)
  // if isRight is false, we want to turn right in the physics system (positive angle)
  if (isRight) angle = -angle;
  else angle = Math.abs(angle);
  
  // Replace all actions with a single turn
  aiResponse.actions = [{
    type: 'turn',
    value: angle,
    delay: 500
  }];
}

function processSimpleCommand(aiResponse, commandType) {
  // Replace all actions with a single action of the correct type
  const defaultValues = {
    'jump': { value: 20, delay: 800 },
    'wait': { value: 500, delay: 500 }
  };
  
  aiResponse.actions = [{
    type: commandType,
    ...defaultValues[commandType]
  }];
}

function processMovementCommand(aiResponse, commandType) {
  // Ensure we only have the correct movement type
  aiResponse.actions = aiResponse.actions.filter(a => a.type === commandType);
  
  // If we have fewer than 2 actions, add more
  if (aiResponse.actions.length < 2) {
    const defaultDistances = [10, 8, 12];
    const defaultDelays = [800, 700, 900];
    
    // Keep existing action if there is one
    const existingAction = aiResponse.actions[0];
    aiResponse.actions = [];
    
    if (existingAction) {
      aiResponse.actions.push(existingAction);
    }
    
    // Add more actions to reach at least 2
    for (let i = aiResponse.actions.length; i < 2; i++) {
              aiResponse.actions.push({
        type: commandType,
        value: defaultDistances[i % defaultDistances.length],
        delay: defaultDelays[i % defaultDelays.length]
              });
            }
          }
        }

function addDefaultExploratoryActions(aiResponse) {
  aiResponse.actions = [
    { type: "moveForward", value: 10, delay: 800 },
    { type: "turn", value: 0.7, delay: 500 },
    { type: "wait", value: 300, delay: 300 },
    { type: "moveForward", value: 8, delay: 700 }
  ];
}

function capActionValues(actions) {
  actions.forEach(action => {
    // Cap movement values
    if (['moveForward', 'moveBackward', 'moveLeft', 'moveRight'].includes(action.type)) {
      action.value = Math.max(5, Math.min(action.value, 15));
    }
    
    // Cap turn values
    if (action.type === 'turn') {
      action.value = Math.sign(action.value) * 
                      Math.min(Math.abs(action.value), 3.14); // Max 180 degrees
    }
    
    // Cap jump values
    if (action.type === 'jump') {
      action.value = Math.max(15, Math.min(action.value, 25));
    }
    
    // Cap all delays
    action.delay = Math.min(action.delay, 1500);
  });
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
