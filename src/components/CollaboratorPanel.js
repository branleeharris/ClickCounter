import React, { useState } from 'react';
import { useCollaboration } from '../contexts/CollaborationContext';

const CollaboratorPanel = () => {
  const { 
    collaborators, 
    messages, 
    sendChatMessage, 
    getUserInfo, 
    getCurrentUserId 
  } = useCollaboration();
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('collaborators'); // 'collaborators' or 'chat'
  
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    sendChatMessage(message);
    setMessage('');
  };
  
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div className="bg-gray-800 shadow-md flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          className={`px-4 py-3 text-sm font-medium flex-1 ${
            activeTab === 'collaborators' 
              ? 'text-white border-b-2 border-blue-500' 
              : 'text-gray-400 hover:text-gray-200'
          }`}
          onClick={() => setActiveTab('collaborators')}
        >
          Collaborators ({Object.keys(collaborators).length})
        </button>
        <button
          className={`px-4 py-3 text-sm font-medium flex-1 ${
            activeTab === 'chat' 
              ? 'text-white border-b-2 border-blue-500' 
              : 'text-gray-400 hover:text-gray-200'
          }`}
          onClick={() => setActiveTab('chat')}
        >
          Chat ({messages.length})
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'collaborators' ? (
          <div className="p-4 space-y-2">
            {Object.entries(collaborators).map(([userId, user]) => (
              <div 
                key={userId}
                className="flex items-center p-2 rounded hover:bg-gray-700"
              >
                <div 
                  className="w-8 h-8 rounded-full mr-3 flex items-center justify-center text-white"
                  style={{ backgroundColor: user.color }}
                >
                  {user.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center">
                    <span className="text-gray-200 truncate">{user.name}</span>
                    {user.isCreator && (
                      <span className="ml-2 text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded">
                        Host
                      </span>
                    )}
                    {userId === getCurrentUserId() && (
                      <span className="ml-2 text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                        You
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    Last active: {formatTimestamp(user.lastActive)}
                  </div>
                </div>
              </div>
            ))}
            
            {Object.keys(collaborators).length === 0 && (
              <div className="text-center text-gray-400 py-4">
                No collaborators connected yet.
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.map((msg) => {
                const user = getUserInfo(msg.userId);
                const isCurrentUser = msg.userId === getCurrentUserId();
                
                return (
                  <div 
                    key={msg.id}
                    className={`flex ${isCurrentUser ? 'justify-end' : ''}`}
                  >
                    <div 
                      className={`max-w-[75%] rounded-lg px-3 py-2 ${
                        isCurrentUser 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-700 text-gray-200'
                      }`}
                    >
                      {!isCurrentUser && (
                        <div 
                          className="text-xs font-medium mb-1"
                          style={{ color: user?.color || '#9ca3af' }}
                        >
                          {user?.name || 'Unknown User'}
                        </div>
                      )}
                      <div>{msg.text}</div>
                      <div className="text-xs opacity-70 text-right mt-1">
                        {formatTimestamp(msg.timestamp)}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {messages.length === 0 && (
                <div className="text-center text-gray-400 py-6">
                  No messages yet. Start the conversation!
                </div>
              )}
            </div>
            
            {/* Message input */}
            <div className="p-3 border-t border-gray-700">
              <form onSubmit={handleSendMessage} className="flex">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded-l focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!message.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-r disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollaboratorPanel;