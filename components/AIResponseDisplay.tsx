import React from 'react';

export default function AIResponseDisplay({ aiResponse }) {
  if (!aiResponse) return null;
  
  return (
    <div className="absolute bottom-20 left-4 right-4 max-w-2xl mx-auto z-10 bg-black bg-opacity-70 text-white p-4 rounded-md">
      <p className="italic text-gray-300 text-sm">Thought: {aiResponse.thought}</p>
      <p className="text-xl mt-2">"{aiResponse.speech}"</p>
      
      {aiResponse.actions && aiResponse.actions.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-600 text-xs text-gray-400">
          <p>Actions: {aiResponse.actions.map(a => a.type).join(' → ')}</p>
        </div>
      )}
    </div>
  );
}