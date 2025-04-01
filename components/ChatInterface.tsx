import React, { useEffect, useRef } from 'react';

export default function ChatInterface({ 
  onSendMessage, 
  userMessage, 
  setUserMessage, 
  chatHistory,
  aiResponse,
  capturingView,
  executing
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

  return (
    <div className="absolute bottom-20 left-4 z-10 w-96 max-w-[calc(100vw-2rem)]">
      <div className="bg-black bg-opacity-70 rounded-t-md p-3 max-h-60 overflow-y-auto">
        <div className="space-y-2">
          {/* Display chat history */}
          {chatHistory.map((msg, index) => (
            <div key={index} className={`px-2 py-1 rounded ${
              msg.sender === 'user' 
                ? 'bg-blue-800 bg-opacity-50 ml-8' 
                : 'bg-gray-800 bg-opacity-50 mr-8'
            }`}>
              <p className="text-sm text-gray-300">
                {msg.sender === 'user' ? 'You' : 'AI Character'}:
              </p>
              <p className="text-white">{msg.text}</p>
            </div>
          ))}
          
          {/* Display latest AI response if not in history */}
          {aiResponse && aiResponse.speech && (
            <div className="bg-gray-800 bg-opacity-50 px-2 py-1 rounded mr-8">
              <p className="text-sm text-gray-300">AI Character:</p>
              <p className="text-white">{aiResponse.speech}</p>
            </div>
          )}
          
          {/* Auto-scroll anchor */}
          <div ref={chatEndRef} />
        </div>
      </div>
      
      {/* Chat input form */}
      <form onSubmit={handleSubmit} className="flex bg-black bg-opacity-70 rounded-b-md overflow-hidden">
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