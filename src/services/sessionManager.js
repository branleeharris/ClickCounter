import { 
    db, 
    auth, 
    signInAnonymousUser, 
    generateUsername, 
    generateUserColor,
    ref, 
    set, 
    get, 
    onValue, 
    push, 
    update,
    remove
  } from './firebase';
  import peerService from './PeerService';
  
  // Generate a unique session ID
  const generateSessionId = () => {
    // Create a 6-character alphanumeric code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  
  // Generate a unique peer ID by combining session ID and user ID
  const generatePeerId = (sessionId, userId) => {
    // We'll use a prefix to make debugging easier
    return `jci-${sessionId}-${userId.substring(0, 8)}`;
  };
  
  // Create a new collaborative session
  const createSession = async (image, initialCategories, hasPin = false, pin = '') => {
    try {
      // Make sure user is signed in
      let user = auth.currentUser;
      if (!user) {
        user = await signInAnonymousUser();
      }
      
      const userId = user.uid;
      const username = generateUsername();
      const userColor = generateUserColor();
      
      // Generate session ID
      const sessionId = generateSessionId();
      
      // Generate peer ID
      const peerId = generatePeerId(sessionId, userId);
      
      // Initialize peer connection
      await peerService.init(peerId);
      
      // Create session in Realtime Database
      const sessionRef = ref(db, `sessions/${sessionId}`);
      
      // Set session data (but don't include the actual image data)
      await set(sessionRef, {
        info: {
          createdAt: Date.now(),
          creatorId: userId,
          creatorPeerId: peerId,
          hasPin,
          pin: hasPin ? pin : '',
          imageMetadata: {
            name: image.name,
            width: image.width,
            height: image.height,
            type: image.type || 'image/png'
          }
        },
        users: {
          [userId]: {
            name: username,
            color: userColor,
            peerId: peerId,
            lastActive: Date.now(),
            isCreator: true
          }
        }
      });
      
      // Add initial categories
      const categoriesRef = ref(db, `sessions/${sessionId}/categories`);
      const categoriesObj = {};
      initialCategories.forEach(category => {
        categoriesObj[category.id] = {
          ...category,
          createdBy: userId
        };
      });
      await update(categoriesRef, categoriesObj);
      
      // Set up handler for image requests
      peerService.onImageRequest((requestingPeerId) => {
        // When someone requests the image, send it to them
        peerService.sendImage(requestingPeerId, {
          src: image.src,
          name: image.name,
          width: image.width,
          height: image.height,
          type: image.type || 'image/png'
        });
      });
      
      return {
        sessionId,
        userId,
        username,
        userColor,
        peerId
      };
    } catch (error) {
      console.error("Error creating session:", error);
      throw error;
    }
  };
  
  // Join an existing session
  const joinSession = async (sessionId, pin = '') => {
    try {
      // Make sure user is signed in
      let user = auth.currentUser;
      if (!user) {
        user = await signInAnonymousUser();
      }
      
      const userId = user.uid;
      
      // Check if session exists
      const sessionRef = ref(db, `sessions/${sessionId}`);
      const snapshot = await get(sessionRef);
      
      if (!snapshot.exists()) {
        throw new Error("Session not found");
      }
      
      const sessionData = snapshot.val();
      
      // Verify PIN if needed
      if (sessionData.info.hasPin && sessionData.info.pin !== pin) {
        throw new Error("Invalid PIN");
      }
      
      // Generate user info
      const username = generateUsername();
      const userColor = generateUserColor();
      const peerId = generatePeerId(sessionId, userId);
      
      // Initialize peer connection
      await peerService.init(peerId);
      
      // Add user to session
      const userRef = ref(db, `sessions/${sessionId}/users/${userId}`);
      await set(userRef, {
        name: username,
        color: userColor,
        peerId: peerId,
        lastActive: Date.now(),
        isCreator: false
      });
      
      // Find creator or any active user to request the image from
      const creatorId = sessionData.info.creatorId;
      const creatorPeerId = sessionData.info.creatorPeerId;
      
      // Set up handler for receiving the image
      return new Promise((resolve, reject) => {
        // Set timeout for image request
        const timeout = setTimeout(() => {
          reject(new Error("Timed out waiting for image"));
        }, 30000); // 30 seconds timeout
        
        // Set up handler for receiving the image
        peerService.onImageReceived((imageData) => {
          clearTimeout(timeout);
          
          // Once we receive the image, we can resolve the promise
          resolve({
            sessionId,
            userId,
            username,
            userColor,
            peerId,
            sessionData,
            image: imageData
          });
        });
        
        // Try to connect to the creator first
        if (creatorPeerId) {
          peerService.connectToPeer(creatorPeerId)
            .then(() => {
              console.log("Connected to creator, requesting image");
              peerService.requestImage(creatorPeerId);
            })
            .catch((error) => {
              console.error("Failed to connect to creator:", error);
              
              // If we can't connect to the creator, try other users
              tryConnectToOtherUsers();
            });
        } else {
          tryConnectToOtherUsers();
        }
        
        // Helper function to try connecting to other users
        function tryConnectToOtherUsers() {
          const users = sessionData.users;
          const userIds = Object.keys(users).filter(id => id !== userId);
          
          if (userIds.length === 0) {
            reject(new Error("No other users available to provide the image"));
            return;
          }
          
          // Try connecting to each user until we get the image
          let connectedCount = 0;
          let failedCount = 0;
          
          userIds.forEach((uid) => {
            const otherPeerId = users[uid].peerId;
            
            peerService.connectToPeer(otherPeerId)
              .then(() => {
                connectedCount++;
                console.log(`Connected to user ${uid}, requesting image`);
                peerService.requestImage(otherPeerId);
              })
              .catch((error) => {
                failedCount++;
                console.error(`Failed to connect to user ${uid}:`, error);
                
                // If we've tried all users and failed, reject
                if (failedCount === userIds.length) {
                  reject(new Error("Failed to connect to any users"));
                }
              });
          });
        }
      });
    } catch (error) {
      console.error("Error joining session:", error);
      throw error;
    }
  };
  
  // Add a marker
  const addMarker = async (sessionId, marker) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");
      
      const markerRef = ref(db, `sessions/${sessionId}/markers/${marker.id}`);
      await set(markerRef, {
        ...marker,
        createdBy: user.uid,
        timestamp: Date.now()
      });
      
      // Update user's last active timestamp
      const userRef = ref(db, `sessions/${sessionId}/users/${user.uid}/lastActive`);
      await set(userRef, Date.now());
      
      return true;
    } catch (error) {
      console.error("Error adding marker:", error);
      throw error;
    }
  };
  
  // Remove a marker
  const removeMarker = async (sessionId, markerId) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");
      
      const markerRef = ref(db, `sessions/${sessionId}/markers/${markerId}`);
      await remove(markerRef);
      
      // Update user's last active timestamp
      const userRef = ref(db, `sessions/${sessionId}/users/${user.uid}/lastActive`);
      await set(userRef, Date.now());
      
      return true;
    } catch (error) {
      console.error("Error removing marker:", error);
      throw error;
    }
  };
  
  // Update a category
  const updateCategory = async (sessionId, category) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");
      
      const categoryRef = ref(db, `sessions/${sessionId}/categories/${category.id}`);
      await update(categoryRef, {
        name: category.name,
        color: category.color,
        lastModifiedBy: user.uid,
        lastModified: Date.now()
      });
      
      // Update user's last active timestamp
      const userRef = ref(db, `sessions/${sessionId}/users/${user.uid}/lastActive`);
      await set(userRef, Date.now());
      
      return true;
    } catch (error) {
      console.error("Error updating category:", error);
      throw error;
    }
  };
  
  // Send a chat message
  const sendMessage = async (sessionId, text) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("User not authenticated");
      
      const messageRef = ref(db, `sessions/${sessionId}/messages`);
      const newMessageRef = push(messageRef);
      
      await set(newMessageRef, {
        text,
        userId: user.uid,
        timestamp: Date.now()
      });
      
      // Update user's last active timestamp
      const userRef = ref(db, `sessions/${sessionId}/users/${user.uid}/lastActive`);
      await set(userRef, Date.now());
      
      return true;
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  };
  
  // Listen for session updates
  const subscribeToSession = (sessionId, callbacks) => {
    const { 
      onMarkersUpdate, 
      onCategoriesUpdate, 
      onUsersUpdate, 
      onMessagesUpdate 
    } = callbacks;
    
    // Listen for markers updates
    const markersRef = ref(db, `sessions/${sessionId}/markers`);
    const markersUnsubscribe = onValue(markersRef, (snapshot) => {
      const markers = [];
      if (snapshot.exists()) {
        const markersData = snapshot.val();
        Object.keys(markersData).forEach(key => {
          markers.push({
            id: parseInt(key),
            ...markersData[key]
          });
        });
      }
      if (onMarkersUpdate) onMarkersUpdate(markers);
    });
    
    // Listen for categories updates
    const categoriesRef = ref(db, `sessions/${sessionId}/categories`);
    const categoriesUnsubscribe = onValue(categoriesRef, (snapshot) => {
      const categories = [];
      if (snapshot.exists()) {
        const categoriesData = snapshot.val();
        Object.keys(categoriesData).forEach(key => {
          categories.push({
            id: parseInt(key),
            ...categoriesData[key]
          });
        });
      }
      if (onCategoriesUpdate) onCategoriesUpdate(categories);
    });
    
    // Listen for users updates
    const usersRef = ref(db, `sessions/${sessionId}/users`);
    const usersUnsubscribe = onValue(usersRef, (snapshot) => {
      const users = {};
      if (snapshot.exists()) {
        const usersData = snapshot.val();
        Object.keys(usersData).forEach(userId => {
          users[userId] = usersData[userId];
        });
      }
      if (onUsersUpdate) onUsersUpdate(users);
    });
    
    // Listen for messages updates
    const messagesRef = ref(db, `sessions/${sessionId}/messages`);
    const messagesUnsubscribe = onValue(messagesRef, (snapshot) => {
      const messages = [];
      if (snapshot.exists()) {
        const messagesData = snapshot.val();
        Object.keys(messagesData).forEach(key => {
          messages.push({
            id: key,
            ...messagesData[key]
          });
        });
        
        // Sort messages by timestamp
        messages.sort((a, b) => a.timestamp - b.timestamp);
      }
      if (onMessagesUpdate) onMessagesUpdate(messages);
    });
    
    // Listen for peer connections and disconnections
    peerService.onConnection((peerId) => {
      console.log(`Peer connected: ${peerId}`);
    });
    
    peerService.onDisconnection((peerId) => {
      console.log(`Peer disconnected: ${peerId}`);
    });
    
    // Return unsubscribe functions
    return () => {
      markersUnsubscribe();
      categoriesUnsubscribe();
      usersUnsubscribe();
      messagesUnsubscribe();
      peerService.destroy();
    };
  };
  
  // Leave the session
  const leaveSession = async (sessionId) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      // Remove user from session
      const userRef = ref(db, `sessions/${sessionId}/users/${user.uid}`);
      await remove(userRef);
      
      // Clean up peer connections
      peerService.destroy();
      
      return true;
    } catch (error) {
      console.error("Error leaving session:", error);
      throw error;
    }
  };
  
  export {
    createSession,
    joinSession,
    addMarker,
    removeMarker,
    updateCategory,
    sendMessage,
    subscribeToSession,
    leaveSession
  };