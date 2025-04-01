export async function requestAIActions(imageData, controlMethods, userMessage = "") {
  try {
    const response = await fetch('/api/ai-character', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageData,
        controls: controlMethods,
        userMessage: userMessage // Pass the user message
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