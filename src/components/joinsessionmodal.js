import React, { useState } from 'react';
import { useCollaboration } from './CollaborationContext';

const JoinSessionModal = ({ sessionId, onClose, onSuccess }) => {
  const { joinCollaboration, loading, error } = useCollaboration();
  const [pin, setPin] = useState('');
  const [joinError, setJoinError] = useState('');
  
  const handleJoin = async () => {
    try {
      setJoinError('');
      
      // Join the session
      await joinCollaboration(sessionId, pin);
      
      // Call the success callback
      if (onSuccess) onSuccess();
    } catch (err) {
      setJoinError(err.message || 'Failed to join session');
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Join Collaboration Session</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-xl"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-4">
          <p className="text-gray-300">
            You're joining session: <span className="font-mono">{sessionId}</span>
          </p>
          
          <div className="space-y-2">
            <label className="block text-gray-300">
              PIN Code (if required):
            </label>
            <input
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN if required"
              className="w-full px-3 py-2 bg-gray-900 text-white border border-gray-700 rounded focus:outline-none"
              maxLength={4}
            />
          </div>
          
          {(joinError || error) && (
            <div className="bg-red-900 bg-opacity-50 border border-red-800 text-red-200 p-3 rounded">
              {joinError || error}
            </div>
          )}
          
          <div className="mt-2 text-gray-400 text-sm">
            <p>When you join, you'll automatically receive the map image from other participants.</p>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleJoin}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? 'Joining...' : 'Join Session'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinSessionModal;
