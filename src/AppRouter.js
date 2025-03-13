import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import App from './App';
import { useCollaboration } from './contexts/CollaborationContext';

// Join route component
const JoinSessionRoute = () => {
  const { sessionId } = useParams();
  const { joinCollaboration, receivedImage } = useCollaboration();
  const [joining, setJoining] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [showPinPrompt, setShowPinPrompt] = React.useState(false);
  const [pin, setPin] = React.useState('');
  
  // Try to join when component mounts
  React.useEffect(() => {
    if (!sessionId || joining) return;
    
    const attemptJoin = async () => {
      try {
        setJoining(true);
        setError(null);
        
        // Try joining without PIN first
        await joinCollaboration(sessionId);
      } catch (err) {
        // If error mentions PIN, show PIN prompt
        if (err.message.includes('PIN') || err.message.includes('pin')) {
          setShowPinPrompt(true);
        } else {
          setError(err.message);
        }
      } finally {
        setJoining(false);
      }
    };
    
    attemptJoin();
  }, [sessionId, joinCollaboration, joining]);
  
  // Handle PIN submission
  const handleSubmitPin = async (e) => {
    e.preventDefault();
    try {
      setJoining(true);
      setError(null);
      
      await joinCollaboration(sessionId, pin);
    } catch (err) {
      setError(err.message);
    } finally {
      setJoining(false);
    }
  };
  
  // If we have received an image, proceed to the app
  if (receivedImage) {
    return <Navigate to="/" replace />;
  }
  
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-xl font-bold text-white mb-4">Joining Session</h1>
        
        {joining ? (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-4"></div>
            <p className="text-gray-300">Connecting to session...</p>
            <p className="text-gray-400 text-sm mt-2">
              Attempting to retrieve the map image from other participants...
            </p>
          </div>
        ) : error ? (
          <div>
            <div className="bg-red-900 text-red-200 p-4 rounded mb-4">
              {error}
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Go Home
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : showPinPrompt ? (
          <form onSubmit={handleSubmitPin}>
            <p className="text-gray-300 mb-4">
              This session requires a PIN code to join. Please enter the PIN provided by the session creator:
            </p>
            <input
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN"
              maxLength={4}
              className="w-full px-3 py-2 bg-gray-700 text-white border border-gray-600 rounded mb-4 focus:outline-none"
              autoFocus
            />
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Join Session
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center">
            <p className="text-gray-300 mb-2">
              Connecting to session: <span className="font-mono">{sessionId}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Main router component
const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/join/:sessionId" element={<JoinSessionRoute />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;