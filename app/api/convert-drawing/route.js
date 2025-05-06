import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { imageData } = await request.json();
    console.log('Received image data:', imageData.substring(0, 100) + '...'); // Log first 100 chars of image data

    // Remove the data URL prefix if present
    const base64Image = imageData.replace(/^data:image\/\w+;base64,/, '');
    console.log('Base64 image length:', base64Image.length);
    
    const claudePrompt = `
        Analyze this drawing and generate Three.js code to create a 3D model.
        Focus on the main shapes and forms.
        Return *ONLY* the Three.js code. Do NOT include any comments or explanations.
        Do NOT add any text before or after the code block.
        
        IMPORTANT:
        1. Use standard Three.js geometries and materials
        2. Include proper scene setup, camera, and lighting
        3. Export the code as a function that returns the scene object
        4. Use proper Three.js naming conventions
        5. Include proper error handling
        6. Use precise data types for colors (THREE.Color)
        7. If you have any doubts, prioritize robustness over conciseness
    `;

    // Call Claude 3 Sonnet to analyze the drawing
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
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
                text: claudePrompt
              },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/png",
                  data: base64Image
                }
              }
            ]
          }
        ]
      })
    });

    if (!claudeResponse.ok) {
      const errorData = await claudeResponse.json();
      console.error('Claude API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to analyze drawing with Claude', details: errorData },
        { status: 500 }
      );
    }

    const claudeData = await claudeResponse.json();
    console.log('Claude response:', JSON.stringify(claudeData, null, 2));
    
    // Check if we have a valid response
    if (!claudeData.content || !Array.isArray(claudeData.content) || claudeData.content.length === 0) {
      console.error('Invalid Claude response:', claudeData);
      return NextResponse.json(
        { error: 'Invalid response from Claude' },
        { status: 500 }
      );
    }

    const threeJsCode = claudeData.content[0].text;
    console.log('Three.js code from Claude:', threeJsCode);

    return NextResponse.json({
      success: true,
      threeJsCode: threeJsCode
    });
  } catch (error) {
    console.error('Error converting drawing:', error);
    return NextResponse.json(
      { error: 'Failed to convert drawing to 3D model', details: error.message },
      { status: 500 }
    );
  }
} 