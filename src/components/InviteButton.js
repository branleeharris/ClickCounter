import React, { useState } from 'react';
import { useCollaboration } from '../contexts/CollaborationContext';
import InviteModal from './InviteModal';

const InviteButton = () => {
  const { isCollaborating, startCollaboration } = useCollaboration();
  const [showModal, setShowModal] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [usePin, setUsePin] = useState(false);
  const [pin, setPin] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const handleStartCollaboration = async (image, categories) => {
    try {
      setIsCreating(true);
      await startCollaboration(image, categories, usePin, pin);
      setShowSetupModal(false);
      setShowModal(true);
    } catch (error) {
      console.error("Failed to start collaboration:", error);
      alert("Failed to start collaboration: " + error.message);
    } finally {
      setIsCreating(false);
    }
  };
  
  return (
    <>
      <button
        onClick={() => {
          if (isCollaborating) {
            setShowModal(true);
          } else {
            setShowSetupModal(true);
          }
        }}
        className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white"
      >
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
          </svg>
          {isCollaborating ? "Invite Collaborators" : "Start Collaboration"}
        </div>
      </button>
      
      {/* Collaboration Setup Modal */}
      {showSetupModal && !isCollaborating && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Start Collaboration</h3>
              <button 
                onClick={() => setShowSetupModal(false)}
                className="text-gray-400 hover:text-gray-200 text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-300">
                Start a collaborative session to allow others to view and add markers to your map in real-time.
              </p>
              
              <div className="bg-gray-700 p-4 rounded">
                <label className="flex items-center space-x-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={usePin}
                    onChange={() => setUsePin(!usePin)}
                    className="h-4 w-4 rounded"
                  />
                  <span>Require PIN to join</span>
                </label>
                
                {usePin && (
                  <div className="mt-3">
                    <label className="block text-sm text-gray-400 mb-1">
                      4-Digit PIN:
                    </label>
                    <input
                      type="text"
                      value={pin}
                      onChange={(e) => {
                        // Only allow digits, and limit to 4 characters
                        const value = e.target.value.replace(/\D/g, '').substring(0, 4);
                        setPin(value);
                      }}
                      maxLength={4}
                      placeholder="Enter 4-digit PIN"
                      className="w-full px-3 py-2 bg-gray-600 text-white border border-gray-500 rounded focus:outline-none"
                    />
                  </div>
                )}
              </div>
              
              <div className="text-gray-400 text-sm">
                <p>
                  When you start collaboration, others will be able to join your session using a link you share with them.
                  They will automatically receive your map image through peer-to-peer sharing.
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowSetupModal(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                onClick={() => handleStartCollaboration(window.currentImage, window.currentCategories)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={isCreating || (usePin && pin.length !== 4)}
              >
                {isCreating ? 'Starting...' : 'Start Collaboration'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Invite Modal */}
      {showModal && isCollaborating && (
        <InviteModal onClose={() => setShowModal(false)} />
      )}
    </>
  );
};

export default InviteButton;