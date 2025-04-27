import React, { useEffect, useRef } from 'react';

export default function ChatInterface({ 
  onSendMessage, 
  userMessage, 
  setUserMessage, 
  chatHistory,
  aiResponse,
  capturingView,
  executing,
  characterId = "character1" // Add characterId prop with default
}) {
  const chatEndRef = useRef(null);
  
  // Auto-scroll to the bottom when chat history updates
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, aiResponse]);
  
  // Handle input submission
  const handleSubmit = (e) => {
    e.preventDefault();
    onSendMessage(userMessage);
  };

  // Get the color for the character messages
  const getCharacterColor = (sender) => {
    if (sender === 'user') return 'bg-blue-800 bg-opacity-50 ml-8';
    if (sender === 'character1') return 'bg-purple-800 bg-opacity-50 mr-8';
    if (sender === 'character2') return 'bg-green-800 bg-opacity-50 mr-8';
    return 'bg-gray-800 bg-opacity-50 mr-8'; // Default
  };
  
  // Get the character name for display
  const getSenderName = (sender) => {
    if (sender === 'user') return 'You';
    if (sender === 'character1') return 'Character 1';
    if (sender === 'character2') return 'Character 2';
    return sender === 'ai' && characterId === 'character2' ? 'Character 2' : 'Character 1';
  };

  return (
    <div className="bg-black bg-opacity-70 rounded-md p-3 max-h-60 overflow-y-auto w-full">
      <div className="space-y-2">
        {/* Display chat history */}
        {chatHistory.map((msg, index) => (
          <div 
            key={msg.id || `msg-${index}-${msg.timestamp || Date.now()}`} 
            className={`px-2 py-1 rounded ${getCharacterColor(msg.sender)}`}
          >
            <p className="text-sm text-gray-300">
              {getSenderName(msg.sender)}:
            </p>
            <p className="text-white">{msg.text}</p>
          </div>
        ))}
        
        {/* Display latest AI response if not in history */}
        {aiResponse && aiResponse.speech && (
          <div className={`px-2 py-1 rounded ${getCharacterColor(characterId)}`}>
            <p className="text-sm text-gray-300">{getSenderName(characterId)}:</p>
            <p className="text-white">{aiResponse.speech}</p>
          </div>
        )}
        
        {/* Auto-scroll anchor */}
        <div ref={chatEndRef} />
      </div>
      
      {/* Chat input form */}
      <form onSubmit={handleSubmit} className="flex bg-black bg-opacity-70 rounded-b-md overflow-hidden mt-2">
        <input
          type="text"
          value={userMessage}
          onChange={(e) => setUserMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-grow bg-transparent border-none outline-none px-3 py-2 text-white"
          disabled={capturingView || executing}
        />
        <button
          type="submit"
          className={`px-4 py-2 ${
            capturingView || executing 
              ? 'bg-gray-700 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
          disabled={capturingView || executing}
        >
          {capturingView || executing ? 'Processing...' : 'Send'}
        </button>
      </form>
    </div>
  );
}