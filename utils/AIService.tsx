export async function requestAIActions(
  imageData,
  controlMethods,
  userMessage,
  conversationContext,
  characterId,
  characterConfig,
  characterPositions = null
) {  
  try {
    console.log("Making AI request with context summary:", conversationContext);
    console.log("Character config for request:", characterConfig);
    if (characterPositions) {
      console.log("Character positions for request:", characterPositions);
    }
    
    const response = await fetch('/api/ai-character', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageData,
        controls: controlMethods,
        userMessage: userMessage,
        conversationContext, // Include previous interactions
        characterId: characterId,
        characterConfig, // Include the config in the request
        characterPositions // Include the positions data
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Play audio if available
    if (data.audio) {
      console.log(`Received audio data for ${characterId}, playing speech...`);
      playAudioFromBase64(data.audio);
    } else {
      console.log(`No audio received for ${characterId}`);
    }
    
    return data;
  } catch (error) {
    console.error('Error calling AI service:', error);
    return {
      thought: 'I seem to be having trouble processing what I see.',
      speech: 'Sorry, I encountered an error while analyzing the environment.',
      actions: []
    };
  }
}

// Function to play base64 audio
function playAudioFromBase64(base64String) {
  try {
    // Create an audio element
    const audio = new Audio();
    
    // Set the source to the base64 data
    audio.src = `data:audio/mpeg;base64,${base64String}`;
    
    // Add event listeners for debugging
    audio.addEventListener('play', () => {
      console.log('Audio playback started');
    });
    
    audio.addEventListener('error', (e) => {
      console.error('Audio playback error:', e);
    });
    
    // Play the audio
    audio.play().catch(error => {
      console.error('Error playing audio:', error);
    });
  } catch (error) {
    console.error('Error setting up audio playback:', error);
  }
}