import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue, push, update, remove } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';

// Replace with your Firebase config
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Sign in anonymously
const signInAnonymousUser = async () => {
  try {
    const userCredential = await signInAnonymously(auth);
    return userCredential.user;
  } catch (error) {
    console.error("Error signing in anonymously:", error);
    throw error;
  }
};

// Generate a random username
const generateUsername = () => {
  const adjectives = ['Happy', 'Creative', 'Bright', 'Quick', 'Clever', 'Smart', 'Bold', 'Brave'];
  const nouns = ['Marker', 'Mapper', 'User', 'Planner', 'Thinker', 'Explorer', 'Designer'];
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  
  return `${adjective}${noun}${Math.floor(Math.random() * 1000)}`;
};

// Generate a random color for a user
const generateUserColor = () => {
  const colors = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#F97316', // Orange
    '#14B8A6', // Teal
  ];
  
  return colors[Math.floor(Math.random() * colors.length)];
};

export {
  app, db, auth,
  signInAnonymousUser,
  generateUsername,
  generateUserColor,
  ref, set, get, onValue, push, update, remove
};