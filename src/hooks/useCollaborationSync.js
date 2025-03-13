import { useEffect } from 'react';
import { useCollaboration } from '../contexts/CollaborationContext';
import {
  addMarker as addMarkerToSession,
  removeMarker as removeMarkerFromSession,
  updateCategory as updateCategoryInSession,
  subscribeToSession
} from '../services/sessionManager';

// Hook to handle synchronization of markers and categories with collaboration
const useCollaborationSync = ({
  markers, 
  setMarkers, 
  categories, 
  setCategories
}) => {
  const { isCollaborating, sessionInfo } = useCollaboration();
  
  // Subscribe to session updates
  useEffect(() => {
    let unsubscribe = null;
    
    if (isCollaborating && sessionInfo) {
      // Subscribe to session updates
      unsubscribe = subscribeToSession(sessionInfo.sessionId, {
        onMarkersUpdate: (sessionMarkers) => {
          // Update local markers with session markers
          setMarkers(sessionMarkers);
        },
        onCategoriesUpdate: (sessionCategories) => {
          // Update local categories with session categories
          setCategories(sessionCategories);
        }
      });
    }
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isCollaborating, sessionInfo, setMarkers, setCategories]);
  
  // Helper functions to sync changes with collaboration
  const syncAddMarker = (marker) => {
    if (isCollaborating && sessionInfo) {
      addMarkerToSession(sessionInfo.sessionId, marker);
    }
  };
  
  const syncRemoveMarker = (markerId) => {
    if (isCollaborating && sessionInfo) {
      removeMarkerFromSession(sessionInfo.sessionId, markerId);
    }
  };
  
  const syncUpdateCategory = (category) => {
    if (isCollaborating && sessionInfo) {
      updateCategoryInSession(sessionInfo.sessionId, category);
    }
  };
  
  return {
    isCollaborating,
    syncAddMarker,
    syncRemoveMarker,
    syncUpdateCategory
  };
};

export default useCollaborationSync;