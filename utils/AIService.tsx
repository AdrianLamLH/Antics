// Function to request AI actions
export async function requestAIActions(imageData, characterControls) {
    try {
      const response = await fetch('/api/ai-character', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageData,
          controls: characterControls, // Pass current movement capabilities
        }),
      });
      
      if (!response.ok) throw new Error('AI request failed');
      return await response.json();
    } catch (error) {
      console.error('Error getting AI actions:', error);
      return { 
        thought: "Error processing vision",
        speech: "I'm not sure what to do next.",
        actions: [] 
      };
    }
  }