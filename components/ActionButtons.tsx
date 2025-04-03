import React from 'react';

export function ViewToggleButton({ viewMode, toggleView }) {
  const getButtonLabel = () => {
    switch(viewMode) {
      case 'thirdPerson': return "Switch to Character 1 View";
      case 'firstPerson1': return "Switch to Character 2 View";
      case 'firstPerson2': return "Switch to Third Person View";
      default: return "Change View";
    }
  };
  
  return (
    <button 
      className="absolute top-4 right-4 z-10 px-4 py-2 bg-black bg-opacity-70 text-white rounded-md hover:bg-opacity-80"
      onClick={toggleView}
    >
      {getButtonLabel()}
    </button>
  );
}

export function AIActionButton({ isFirstPerson, capturingView, executing, triggerCapture }) {  
  const handleClick = () => {
    console.log("AI action button clicked");
    if (triggerCapture && !capturingView && !executing) {
      // You can pass an empty message or a default greeting
      triggerCapture("Hello, what do you see?");
    }
  };
  
  return (
    <button 
      className="px-4 py-2 bg-black bg-opacity-70 text-white rounded-md hover:bg-opacity-80"
      onClick={handleClick}
      disabled={capturingView || executing}
    >
      {executing ? "Executing Actions..." : 
       capturingView ? "Analyzing View..." : 
       "Get AI Actions"}
    </button>
  );
}

export function ScreenshotButton({ onClick, characterId }) {
  return (
    <button 
      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
      onClick={() => {
        console.log(`Screenshot button clicked for ${characterId}`);
        onClick();
      }}
    >
      Capture {characterId === 'character1' ? 'Char 1' : 'Char 2'} POV
    </button>
  );
}