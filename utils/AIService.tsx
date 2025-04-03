export async function requestAIActions(
  imageData, 
  controlMethods, 
  userMessage = "", 
  contextSummary = "",
  characterId = "character1"
) {  try {
    console.log("Making AI request with context summary:", contextSummary);
    
    const response = await fetch('/api/ai-character', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageData,
        controls: controlMethods,
        userMessage: userMessage,
        contextSummary: contextSummary, // Include previous interactions
        characterId: characterId
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
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