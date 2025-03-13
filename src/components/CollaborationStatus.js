import React, { useState } from 'react';
import { useCollaboration } from '../contexts/CollaborationContext';
import CollaboratorPanel from './CollaboratorPanel';

const CollaborationStatus = () => {
  const { 
    isCollaborating, 
    sessionInfo, 
    collaborators, 
    endCollaboration 
  } = useCollaboration();
  const [showPanel, setShowPanel] = useState(false);
  
  if (!isCollaborating) return null;
  
  const numCollaborators = Object.keys(collaborators).length;
  
  return (
    <>
      <div 
        className="flex items-center cursor-pointer px-3 py-1 rounded hover:bg-gray-700"
        onClick={() => setShowPanel(!showPanel)}
      >
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
          </svg>
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
            {numCollaborators}
          </span>
        </div>
        <span className="ml-2 text-sm font-medium text-gray-300">
          Collaborating
        </span>
      </div>
      
      {/* Collaboration panel (slide out from right) */}
      <div 
        className={`fixed inset-y-0 right-0 w-80 bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out z-30 ${
          showPanel ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-white font-medium">Collaboration</h3>
            <div className="flex space-x-2">
              <button 
                onClick={() => setShowPanel(false)}
                className="p-1 text-gray-400 hover:text-gray-200"
                title="Close panel"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <button 
                onClick={endCollaboration}
                className="p-1 text-red-400 hover:text-red-300"
                title="End collaboration"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <CollaboratorPanel />
          </div>
        </div>
      </div>
      
      {/* Dark overlay when panel is open */}
      {showPanel && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setShowPanel(false)}
        ></div>
      )}
    </>
  );
};

export default CollaborationStatus;