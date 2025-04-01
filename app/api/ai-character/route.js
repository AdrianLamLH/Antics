export async function POST(req) {
    try {
      const { image, controls, characterConfig } = await req.json();
      
      console.log("Received request with controls:", controls);
      
      // Build the AI prompt based on character configuration
      let characterPrompt = `You are an AI character in a 3D world exploring your surroundings. The user can chat with you and give you commands.`;
      
      // Add personality and biography if provided
      if (characterConfig) {
        if (characterConfig.personality) {
          characterPrompt += `\n\nYour personality: ${characterConfig.personality}`;
        }
        
        if (characterConfig.biography) {
          characterPrompt += `\n\nYour biography: ${characterConfig.biography}`;
        }
        
        // Add attributes if provided
        if (characterConfig.attributes && characterConfig.attributes.length > 0) {
          characterPrompt += `\n\nYour current attributes:`;
          characterConfig.attributes.forEach(attr => {
            characterPrompt += `\n- ${attr.name}: ${attr.value}/${attr.max}`;
          });
        }
      }
      
      characterPrompt += `\n\nWhen the user messages you:
1. Respond conversationally as if you're a character in this world
2. If they ask you to do something or move somewhere, include DRAMATIC and BOLD movement instructions

You can perform these actions: ${controls.join(', ')}

MOVEMENT GUIDELINES:
- Create BIG, DRAMATIC movements using larger distances (5-15 units)
- Use bold, expressive turns (0.5-1.2 radians)
- Make jumps high and dynamic (15-25 height units)
- Combine movements in flowing, cinematic sequences
- Think like a parkour artist or action movie character`;

      // Add reference to custom actions if available
      if (characterConfig && characterConfig.customActions && characterConfig.customActions.length > 0) {
        characterPrompt += `\n\nSPECIAL ACTIONS AVAILABLE:`;
        characterConfig.customActions.forEach(action => {
          characterPrompt += `\n- ${action.name}: ${action.description}`;
        });
      }

      characterPrompt += `\n\nThe format of your movement instructions is critical - follow it exactly:

THOUGHT: Brief internal thought about the user's request
SPEECH: Your conversational response to the user
ACTIONS:
moveForward 8 1000
turn 0.7 500
jump 20 800
wait 300 300

Only include ACTIONS if the user is requesting movement or actions. 
When the user is just chatting, only include THOUGHT and SPEECH sections.
Each action must be on its own line with the format: actionType value delay`;

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
      const aiResponse = {};
      
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
      
      // If no valid actions were parsed or too few actions, use fallback
      if (aiResponse.actions.length < 8) {
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