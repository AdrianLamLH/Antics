// ElevenLabs Text-to-Speech Service

export async function generateSpeech(text, voiceId = "21m00Tcm4TlvDq8ikWAM") {
    try {
      // Default voice ID if none provided (Rachel voice)
      // You can change this to another voice ID from ElevenLabs
      const apiKey = process.env.ELEVENLABS_API_KEY;
      
      if (!apiKey) {
        console.error("ElevenLabs API key is not set");
        return null;
      }
  
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": apiKey,
          },
          body: JSON.stringify({
            text: text,
            model_id: "eleven_turbo_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      // Get the audio data as ArrayBuffer
      const audioData = await response.arrayBuffer();
      
      // Convert to base64 for easy transmission
      const base64Audio = Buffer.from(audioData).toString("base64");
      
      return base64Audio;
    } catch (error) {
      console.error("Error generating speech:", error);
      return null;
    }
  }
  
  // Character voice mapping
  export const characterVoices = {
    character1: "exsUS4vynmxd379XN4yO", // Rachel (female voice)
    character2: "raMcNf2S8wCmuaBcyI6E"  // Josh (male voice)
  };