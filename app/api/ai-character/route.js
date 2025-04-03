export async function POST(req) {
  try {
    const { 
      image, 
      controls, 
      userMessage, 
      conversationContext,
      characterId,
      characterConfig 
    } = await req.json();
    
    // Then use contextSummary in your code if needed:
    const contextToUse = conversationContext || "";
    // const characterConfig = {
    //   personality: 'Friendly and curious',
    //   biography: 'Midoriya from My Hero Academia in the virtual world',
    //   customActions: []
    // };

    const personality = characterConfig?.personality || "Friendly and curious";
    const biography = characterConfig?.biography || "An AI explorer in a virtual world";
    const goals = characterConfig?.goals || "";
    const speechStyle = characterConfig?.speechStyle || "";
    const customInstructions = characterConfig?.customInstructions || "";


    console.log("Received request with controls:", controls);
    
    // Build the AI prompt based on character configuration
    let characterPrompt = `You are an AI character in a 3D world exploring your surroundings. The user can chat with you and give you commands.

      Your personality: ${personality}

      Your biography: ${biography}
      ${goals ? `\nYour goals: ${goals}` : ''}
      ${speechStyle ? `\nYour speech style: ${speechStyle}` : ''}

      ${customInstructions ? `Additional instructions: ${customInstructions}\n` : ''}

      RECENT CONVERSATION HISTORY:
      ${contextToUse || "No previous conversation."}`;
      characterPrompt += `\nRemember to maintain continuity with your previous thoughts and actions. Follow up on topics discussed earlier when appropriate.`;
    
    // Add standard prompt instructions
    characterPrompt += `\n\nWhen the user messages you:
1. Respond conversationally as if you're a character in this world
2. If they ask you to do something or move somewhere, include DRAMATIC and BOLD movement instructions`;

    characterPrompt += `\n\nYou can perform these actions: ${controls.join(', ')}`;

    characterPrompt += `\n\nMOVEMENT PATTERN GUIDELINES:
- When asked to walk forward/backward/left/right in a straight line, only use the corresponding movement action repeatedly without turns
- Only include turns when specifically asked to change direction or create patterns
- For simple movements, use 2-3 actions of the same type with different distances
- Example of walking forward in a straight line:
  moveForward 10 800
  moveForward 8 700
  moveForward 12 900`;

  // Later in your action processing code, add special handling for simple movement requests
  // Moved this code after parsing the AI response and creating the aiResponse object
  // Now, after aiResponse has been initialized and populated, check for simple movement patterns
  if (userMessage && 
    (userMessage.toLowerCase().match(/^(walk|move|go) (forward|forwards|ahead|straight)/i) ||
     userMessage.toLowerCase().match(/^(walk|move|go) (backward|backwards|back)/i) ||
     userMessage.toLowerCase().match(/^(walk|move|go) (left|right)/i))) {
  
    console.log("Simple directional movement detected, ensuring straight-line pattern");
  
    // Determine direction
    const direction = 
      userMessage.toLowerCase().includes('forward') || 
      userMessage.toLowerCase().includes('forwards') || 
      userMessage.toLowerCase().includes('ahead') || 
      userMessage.toLowerCase().includes('straight') ? 'moveForward' :
      userMessage.toLowerCase().includes('backward') || 
      userMessage.toLowerCase().includes('backwards') || 
      userMessage.toLowerCase().includes('back') ? 'moveBackward' :
      userMessage.toLowerCase().includes('left') ? 'moveLeft' : 'moveRight';

  }
  

    // Add reference to custom actions if available
    if (characterConfig && characterConfig.customActions && characterConfig.customActions.length > 0) {
      characterPrompt += `\n\nSPECIAL ACTIONS AVAILABLE:`;
      characterConfig.customActions.forEach(action => {
        characterPrompt += `\n- ${action.name}: ${action.description}`;
      });
    }

    // Add user message to the prompt if available
    if (userMessage && userMessage.trim()) {
      characterPrompt += `\n\nThe user has just said to you: "${userMessage}"`;
    }

    characterPrompt += `\n\nThe format of your movement instructions is critical - follow it exactly:

THOUGHT: Brief internal thought about the user's request
SPEECH: Your conversational response to the user
ACTIONS:
moveForward 8 1000
turn 0.7 500
jump 40 800
wait 300 300

Only include ACTIONS if the user is requesting movement or actions. 
When the user is just chatting, only include THOUGHT and SPEECH sections.
Each action must be on its own line with the format: actionType value delay`;

    // Log the full prompt sent to the LLM
    console.log("=== FULL PROMPT TO LLM ===");
    console.log(characterPrompt);
    console.log("=== END PROMPT ===");
    
    // Also log the user message if available
    if (userMessage) {
      console.log("User message:", userMessage);
    }

    // Call Claude API with the image
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
              {
                type: "text",
                text: characterPrompt
              },
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

    const data = await response.json();
    console.log("Claude response received:", JSON.stringify(data).substring(0, 200) + "...");
    
    // Prepare a more dramatic fallback response
    const fallbackResponse = {
      thought: "I should explore what's ahead of me.",
      speech: "Let me walk forward and see what I can discover in this interesting area.",
      actions: [
        {"type": "moveForward", "value": 10, "delay": 1500},
        {"type": "wait", "value": 300, "delay": 300},
        {"type": "moveForward", "value": 8, "delay": 1200},
        {"type": "wait", "value": 200, "delay": 200},
        {"type": "moveForward", "value": 12, "delay": 1800},
        {"type": "turn", "value": 0.2, "delay": 400}, // Slight turn to avoid getting stuck
        {"type": "moveForward", "value": 10, "delay": 1500},
        {"type": "moveForward", "value": 8, "delay": 1200}
      ]
    };
    
    // Check if we got a valid response with content
    if (!data.content || !data.content[0] || !data.content[0].text) {
      console.error("Received invalid response from Claude:", data);
      return new Response(JSON.stringify(fallbackResponse), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Get the full text response
    const fullText = data.content[0].text;
    console.log("Claude text response:", fullText);
    
    // Parse the plaintext format
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
      aiResponse.thought = fallbackResponse.thought;
    }
    
    // Extract speech
    const speechMatch = fullText.match(/SPEECH:(.+?)(?=ACTIONS:|$)/s);
    if (speechMatch) {
      aiResponse.speech = speechMatch[1].trim();
    } else {
      aiResponse.speech = fallbackResponse.speech;
    }
    
    // Extract actions
    const actionsMatch = fullText.match(/ACTIONS:(.+)$/s);
    aiResponse.actions = [];
    
    if (actionsMatch) {
      const actionsText = actionsMatch[1].trim();
      const actionLines = actionsText.split('\n');
      
      // Process actions with more dramatic values
      actionLines.forEach(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) {
          const [type, valueStr, delayStr] = parts;
          
          // Only add if it's a valid action type
          if (controls.includes(type)) {
            // Parse values with validation
            let value = parseFloat(valueStr);
            const delay = parseInt(delayStr, 10);
            
            // Make sure values are reasonable but dramatic
            if (!isNaN(value) && !isNaN(delay) && delay > 0) {
              // Amplify movement values to make them more dramatic
              if (type === 'moveForward' || type === 'moveBackward' || 
                  type === 'moveLeft' || type === 'moveRight') {
                // At least 5, at most 15
                value = Math.max(5, Math.min(value * 1.5, 15));
              }
              
              // Amplify turns
              if (type === 'turn') {
                // At least 0.4, at most 1.5
                value = Math.sign(value) * Math.max(0.4, Math.min(Math.abs(value) * 1.3, 1.5));
              }
              
              // Amplify jumps
              if (type === 'jump') {
                // At least 15, at most 25
                value = Math.max(15, Math.min(value * 1.5, 25));
              }
              
              aiResponse.actions.push({
                type,
                value: value,
                delay: Math.min(delay, 2000) // Cap delay at 2 seconds
              });
            }
          }
        }
      });
    }
    // // NOW aiResponse.actions exists, so this will work
    // const filteredActions = aiResponse.actions.filter(action => 
    //   action.type === direction || action.type === 'jump' || action.type === 'wait'
    // );
  
    // // If we removed turn actions, make sure we still have enough movement actions
    // if (filteredActions.length < 3) {
    //   // Add additional movement actions to ensure a good sequence
    //   const distances = [15, 12, 18];
    //   const delays = [1000, 800, 1200];
    
    //   for (let i = filteredActions.length; i < 3; i++) {
    //     filteredActions.push({
    //       type: direction,
    //       value: distances[i % distances.length],
    //       delay: delays[i % delays.length]
    //     });
    //   }
    // }
  
    // // Replace the actions with filtered ones
    // aiResponse.actions = filteredActions;
  
    // console.log("Ensuring straight-line pattern with actions:", 
    //   filteredActions.map(a => `${a.type}(${a.value})`).join(', '));
    if (aiResponse.actions.length < 3) {
      console.log("Enhancing movement pattern with additional forward movements");
      
      // Add more forward movement to make it longer
      aiResponse.actions.push(
        {"type": "moveForward", "value": 10, "delay": 1500},
        {"type": "wait", "value": 200, "delay": 200},
        {"type": "moveForward", "value": 8, "delay": 1200}
      );
    }
    
    console.log("Final processed response:", JSON.stringify(aiResponse));
    
    return new Response(JSON.stringify(aiResponse), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error("Unexpected error in AI character API:", error);
    
    // Return a dramatic fallback response
    return new Response(JSON.stringify({
      thought: "I should keep moving forward to explore this area.",
      speech: "Let me continue walking ahead to see what we can find.",
      actions: [
        {"type": "moveForward", "value": 12, "delay": 1800},
        {"type": "moveForward", "value": 10, "delay": 1500},
        {"type": "wait", "value": 300, "delay": 300},
        {"type": "moveForward", "value": 8, "delay": 1200},
        {"type": "moveForward", "value": 10, "delay": 1500},
        {"type": "wait", "value": 200, "delay": 200},
        {"type": "moveForward", "value": 12, "delay": 1800}
      ]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}