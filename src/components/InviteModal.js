import React, { useState, useRef } from 'react';
import { useCollaboration } from '../contexts/CollaborationContext';

const InviteModal = ({ onClose }) => {
  const { getShareUrl, sessionInfo } = useCollaboration();
  const [copied, setCopied] = useState(false);
  const [showPIN, setShowPIN] = useState(false);
  const shareUrl = getShareUrl();
  const linkRef = useRef(null);
  
  // Get PIN from session if available
  const pin = sessionInfo?.sessionData?.info?.pin || '';
  const hasPin = sessionInfo?.sessionData?.info?.hasPin || false;
  
  const copyLink = () => {
    if (linkRef.current) {
      linkRef.current.select();
      document.execCommand('copy');
      setCopied(true);
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Invite Collaborators</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-xl"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-4">
          <p className="text-gray-300">
            Share this link with others to collaborate on your map in real-time:
          </p>
          
          <div className="flex items-center">
            <input
              ref={linkRef}
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 px-3 py-2 bg-gray-900 text-white border border-gray-700 rounded-l focus:outline-none"
            />
            <button
              onClick={copyLink}
              className={`px-4 py-2 rounded-r ${
                copied 
                  ? 'bg-green-600 text-white' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          
          {hasPin && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300">Session PIN:</span>
                <button
                  onClick={() => setShowPIN(!showPIN)}
                  className="text-blue-400 text-sm hover:text-blue-300"
                >
                  {showPIN ? 'Hide PIN' : 'Show PIN'}
                </button>
              </div>
              
              <div className="bg-gray-900 p-3 rounded text-center">
                {showPIN ? (
                  <span className="text-xl font-mono tracking-widest text-white">{pin}</span>
                ) : (
                  <span className="text-xl font-mono tracking-widest text-white">••••</span>
                )}
              </div>
              <p className="text-gray-400 text-sm mt-2">
                Share this PIN with collaborators. They'll need it to join your session.
              </p>
            </div>
          )}
          
          <div className="mt-2 text-gray-400 text-sm">
            <p>When collaborators join, they'll automatically receive your map image via peer-to-peer sharing.</p>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteModal;