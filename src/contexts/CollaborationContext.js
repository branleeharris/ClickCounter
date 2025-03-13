import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { 
  createSession, 
  joinSession, 
  addMarker, 
  removeMarker, 
  updateCategory,
  sendMessage, 
  subscribeToSession,
  leaveSession
} from '../services/sessionManager';

// Create context
const CollaborationContext = createContext();

// Context provider component
export const CollaborationProvider = ({ children }) => {
  // Collaboration state
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [collaborators, setCollaborators] = useState({});
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [receivedImage, setReceivedImage] = useState(null);
  
  // Clean up any subscriptions when unmounting
  useEffect(() => {
    let unsubscribe = null;
    
    if (isCollaborating && sessionInfo) {
      unsubscribe = subscribeToSession(sessionInfo.sessionId, {
        onMarkersUpdate: (markers) => {
          // This will be handled in the App component
        },
        onCategoriesUpdate: (categories) => {
          // This will be handled in the App component
        },
        onUsersUpdate: (users) => {
          setCollaborators(users);
        },
        onMessagesUpdate: (newMessages) => {
          setMessages(newMessages);
        }
      });
    }
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isCollaborating, sessionInfo]);
  
  // Start a new collaborative session
  const startCollaboration = async (image, categories, hasPin = false, pin = '') => {
    try {
      setLoading(true);
      setError(null);
      
      const session = await createSession(image, categories, hasPin, pin);
      
      setSessionInfo(session);
      setIsCollaborating(true);
      setLoading(false);
      
      return session;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };
  
  // Join an existing session
  const joinCollaboration = async (sessionId, pin = '') => {
    try {
      setLoading(true);
      setError(null);
      
      const session = await joinSession(sessionId, pin);
      
      // The image is returned by the joinSession function via P2P
      setReceivedImage(session.image);
      setSessionInfo(session);
      setIsCollaborating(true);
      setLoading(false);
      
      return session;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };
  
  // End collaboration session
  const endCollaboration = async () => {
    if (isCollaborating && sessionInfo) {
      try {
        await leaveSession(sessionInfo.sessionId);
      } catch (err) {
        console.error("Error leaving session:", err);
      }
    }
    
    setIsCollaborating(false);
    setSessionInfo(null);
    setCollaborators({});
    setMessages([]);
    setReceivedImage(null);
  };
  
  // Send chat message
  const sendChatMessage = async (message) => {
    if (!isCollaborating || !sessionInfo) return;
    
    try {
      await sendMessage(sessionInfo.sessionId, message);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };
  
  // Get share URL for current session
  const getShareUrl = () => {
    if (!isCollaborating || !sessionInfo) return '';
    
    const baseUrl = window.location.origin;
    return `${baseUrl}/join/${sessionInfo.sessionId}`;
  };
  
  // Check if current user is the creator
  const isSessionCreator = () => {
    if (!isCollaborating || !sessionInfo || !auth.currentUser) return false;
    
    const userId = auth.currentUser.uid;
    return collaborators[userId]?.isCreator === true;
  };
  
  // Get user info by ID
  const getUserInfo = (userId) => {
    return collaborators[userId] || null;
  };
  
  // Get current user ID
  const getCurrentUserId = () => {
    return auth.currentUser?.uid || null;
  };
  
  return (
    <CollaborationContext.Provider
      value={{
        isCollaborating,
        sessionInfo,
        collaborators,
        messages,
        loading,
        error,
        receivedImage,
        startCollaboration,
        joinCollaboration,
        endCollaboration,
        sendChatMessage,
        getShareUrl,
        isSessionCreator,
        getUserInfo,
        getCurrentUserId
      }}
    >
      {children}
    </CollaborationContext.Provider>
  );
};

// Custom hook for using the collaboration context
export const useCollaboration = () => useContext(CollaborationContext);