import React from 'react';

export function ViewToggleButton({ isFirstPerson, toggleView }) {
  return (
    <button 
      className="absolute top-4 right-4 z-10 px-4 py-2 bg-black bg-opacity-70 text-white rounded-md hover:bg-opacity-80"
      onClick={toggleView}
    >
      {isFirstPerson ? "Third Person" : "First Person"}
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