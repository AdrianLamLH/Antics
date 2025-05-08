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
      characterConfig,
      characterPositions 
    } = await req.json();
    
    // 2. SET CHARACTER PARAMETERS
    const contextToUse = conversationContext || "";
    const personality = characterConfig?.personality || "Friendly and curious";
    const biography = characterConfig?.biography || "An AI explorer in a virtual world";
    const goals = characterConfig?.goals || "";
    const speechStyle = characterConfig?.speechStyle || "";
    const customInstructions = characterConfig?.customInstructions || "";

    console.log("Received request with controls:", controls);
    
    // 3. BUILD THE PROMPT - Include character positions
    let characterPrompt = buildUnifiedPrompt({
      personality,
      biography,
      goals,
      speechStyle,
      customInstructions,
      contextToUse,
      controls,
      userMessage,
      characterId,
      characterPositions
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
    
    // 7. SANITIZE RESPONSE (NEW STEP)
    const sanitizedResponse = sanitizeResponse(aiResponse);
    
    // 8. GENERATE TEXT-TO-SPEECH USING ELEVENLABS
    let audioContent = null;
    if (sanitizedResponse.speech) {
      // Get the voice ID based on the character
      const voiceId = characterVoices[characterId] || characterVoices.character1;
      
      // Generate speech
      console.log(`Generating speech for ${characterId} using voice ${voiceId}`);
      audioContent = await generateSpeech(sanitizedResponse.speech, voiceId);
    }
    
    // Add the audio content to the response
    const finalResponse = {
      ...sanitizedResponse,
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
  userMessage,
  characterId,
  characterPositions
}) {
  // Character introduction
  let prompt = `You are an AI character in a 3D world exploring your surroundings. The user can chat with you and give you commands.

Your personality: ${personality}
Your biography: ${biography}
${goals ? `\nYour goals: ${goals}` : ''}
${speechStyle ? `\nYour speech style: ${speechStyle}` : ''}
${customInstructions ? `\nAdditional instructions: ${customInstructions}` : ''}`;

  // Add character positions information if available
  if (characterPositions) {
    // Figure out which character this is and which is the other one
    const thisCharacter = characterId;
    const otherCharacter = thisCharacter === 'character1' ? 'character2' : 'character1';
    
    // Get position data
    const thisPosition = characterPositions[thisCharacter];
    const otherPosition = characterPositions[otherCharacter];
    
    // Calculate distance between characters
    let distance = 0;
    let direction = "";
    
    if (thisPosition && otherPosition) {
      // Calculate Euclidean distance in 3D space (ignoring Y/height)
      const dx = otherPosition.x - thisPosition.x;
      const dz = otherPosition.z - thisPosition.z;
      distance = Math.sqrt(dx*dx + dz*dz);
      
      // Determine rough direction (in world coordinates)
      if (Math.abs(dx) > Math.abs(dz)) {
        // X-axis is dominant
        direction = dx > 0 ? "to your right" : "to your left";
      } else {
        // Z-axis is dominant
        direction = dz > 0 ? "in front of you" : "behind you";
      }
      
      // Add this information to the prompt
      prompt += `\n\nPOSITION INFORMATION:
You are character ${thisCharacter === 'character1' ? '1' : '2'}.
Your coordinates are: x=${thisPosition.x.toFixed(1)}, z=${thisPosition.z.toFixed(1)}
The other character's coordinates are: x=${otherPosition.x.toFixed(1)}, z=${otherPosition.z.toFixed(1)}
The other character is approximately ${distance.toFixed(1)} units away from you ${direction}.

If the user asks you to move toward or approach the other character, you should use the appropriate moveForward, moveBackward, moveLeft, moveRight, and turn actions to navigate in that direction. Use the position data to determine the correct direction and distance.`;
    }
  }

  // Enhanced context awareness but enforcing brevity
  prompt += `\n\nCONTEXT AWARENESS INSTRUCTIONS:
- Be aware of what you can see in your visual field
- Notice the other character's position and what they've said
- Reference recent conversation topics
- Track changes in your environment
- Consider your character's personality and goals`;

  prompt += `\n\nRECENT CONVERSATION HISTORY:
${contextToUse || "No previous conversation."}
Remember to maintain continuity with your previous thoughts and actions.`;

  // Response format with clear action instructions AND strict brevity guidance
  prompt += `\n\nYour response must follow this exact format:
THOUGHT: Brief internal thought about the user's request, showing your consideration of visual context, conversation history, and character relationships.
SPEECH: Your conversational response to the user - MUST BE ONLY 1-2 SENTENCES MAXIMUM! Be concise but contextually aware.
ACTIONS: (Include this section if and only if the user explicitly requested physical actions, otherwise omit it)
actionType value delay
actionType value delay
...

CRITICAL RESPONSE CONSTRAINTS:
- Your SPEECH response MUST be limited to 1-2 sentences maximum
- Be conversational and natural, not formal or verbose
- Incorporate context in a concise way
- Include personality but avoid rambling
- Prioritize brevity over detail
- Never exceed two sentences

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

  // Add examples with CONCISE responses
  prompt += `\n\nEXAMPLES OF CONCISE BUT CONTEXTUAL RESPONSES:

For "What do you see?":
THOUGHT: I should describe the cabin and note that character 2 is visible to my right. I'll keep my response very brief but still reference what I can see.
SPEECH: I can see that old wooden cabin with the broken windows, and our hero friend is standing over by those trees to the right.

For "How are you feeling?":
THOUGHT: Based on my chaotic personality and our recent conversation about exploration, I'll express excitement but keep it to one sentence.
SPEECH: Itching for some action and ready to blow this boring place sky-high!

For "go forward":
THOUGHT: Simple movement request. I'll acknowledge it and move forward.
SPEECH: On it, moving forward now!
ACTIONS:
moveForward 10 800

For "What did the other character just say?":
THOUGHT: In our recent conversation, character 2 expressed concern about safety when exploring the cabin. I'll summarize very briefly.
SPEECH: They were being all serious about "safety protocols" for exploring the cabin - typical hero talk!

For "Tell me about this place":
THOUGHT: I need to describe what I see in the environment but keep it extremely brief, focusing on the main visual elements.
SPEECH: It's some kind of abandoned area with that broken-down wooden cabin being the main attraction - perfect for causing a little chaos!`;

  // Add user message with brevity reminder
  if (userMessage && userMessage.trim()) {
    prompt += `\n\nThe user has just said to you: "${userMessage}"

FINAL REMINDER: 
- Your response must be ONLY 1-2 SENTENCES
- Include context but be extremely concise
- Only generate ACTIONS if explicitly requested
- Keep your personality but avoid verbosity`;
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

function sanitizeResponse(aiResponse) {
  // Extract speech
  let speech = aiResponse.speech;
  
  // Count sentences by splitting on period, exclamation, or question mark followed by space
  const sentences = speech.split(/[.!?]\s+/);
  
  // If more than 2 sentences, truncate to just 2
  if (sentences.length > 2) {
    // Get first two sentences and make sure they end with proper punctuation
    const firstSentence = sentences[0].trim();
    const secondSentence = sentences[1].trim();
    
    // Find the punctuation that ended the first sentence
    const firstPunctuation = speech.match(/[.!?]/)?.[0] || '.';
    // Find the punctuation that ended the second sentence
    const secondPunctuation = speech.substring(
      speech.indexOf(firstSentence) + firstSentence.length,
      speech.indexOf(secondSentence) + secondSentence.length + 2
    ).match(/[.!?]/)?.[0] || '.';
    
    // Combine with proper punctuation
    speech = `${firstSentence}${firstPunctuation} ${secondSentence}${secondPunctuation}`;
    
    console.log(`Truncated speech from ${sentences.length} sentences to 2 sentences.`);
  }
  
  aiResponse.speech = speech;
  return aiResponse;
}
