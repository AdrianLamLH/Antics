import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { imageData } = await request.json();
    console.log('Received image data:', imageData.substring(0, 100) + '...'); // Log first 100 chars of image data

    // Remove the data URL prefix if present
    const base64Image = imageData.replace(/^data:image\/\w+;base64,/, '');
    console.log('Base64 image length:', base64Image.length);
    const claudePrompt = `
        Analyze this drawing and generate Blender Python commands to create a 3D model.
        Focus on the main shapes and forms.
        Return *ONLY* the Blender Python code.  Do NOT include any comments or explanations.
        Do NOT add any text before or after the code block.
        Use bpy.ops for all operations.
        Start with a simple cube or sphere as a base shape.

        IMPORTANT:
        1.  Do NOT assume any objects or modifiers exist. Always check before accessing.
        2.  If you need a Subdivision Surface modifier, use the get_or_add_modifier function 
            (provided in the Blender script) like this:
            \`\`\`python
            subsurf_mod = get_or_add_modifier("ObjectName", 'SUBSURF', "MySubsurf")
            if subsurf_mod:
                subsurf_mod.levels = 2
                subsurf_mod.render_levels = 3
            \`\`\`
            Replace "ObjectName" with the actual name of the object.  
            Name the modifier "MySubsurf" consistently.
        3.  If you create an object, store a reference to it in a variable immediately.
            Example: \`\`\`python new_object = bpy.ops.mesh.primitive_cube_add(location=(0, 0, 0))\`\`\`
            Then, access it using bpy.data.objects['ObjectName'].
        4.  Set the active object before performing operations on it:
            \`\`\`python bpy.context.view_layer.objects.active = bpy.data.objects['ObjectName']\`\`\`
        5.  Be mindful of Blender's modes (Object Mode, Edit Mode).  Switch modes if necessary:
            \`\`\`python bpy.ops.object.mode_set(mode='EDIT')\`\`\`
        6.  Use precise data types.  Colors are tuples of floats (e.g., (1.0, 0.0, 0.0, 1.0) for red).
        7.  If you have any doubts, prioritize robustness and error handling over conciseness.
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

    const blenderCommands = claudeData.content[0].text;
    console.log('Blender commands from Claude:', blenderCommands);

    // Execute Blender commands
    const blenderResponse = await fetch('http://localhost:5001/execute-blender', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        commands: blenderCommands
      })
    });

    if (!blenderResponse.ok) {
      const errorData = await blenderResponse.json();
      console.error('Blender server error:', errorData);
      return NextResponse.json(
        { error: 'Failed to execute Blender commands', details: errorData },
        { status: 500 }
      );
    }

    const blenderData = await blenderResponse.json();
    console.log('Blender response:', blenderData);

    return NextResponse.json({
      success: true,
      modelUrl: blenderData.modelUrl,
      previewUrl: blenderData.previewUrl
    });
  } catch (error) {
    console.error('Error converting drawing:', error);
    return NextResponse.json(
      { error: 'Failed to convert drawing to 3D model', details: error.message },
      { status: 500 }
    );
  }
} 