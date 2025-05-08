// src/firebase/firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your Firebase configuration
// Replace with your actual Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyAmNIOnMHl0zdF6VV1q8VUB1fjoqAI_S5I",
  authDomain: "lanesparking.firebaseapp.com",
  projectId: "lanesparking",
  storageBucket: "lanesparking.firebasestorage.app",
  messagingSenderId: "1052301765341",
  appId: "1:1052301765341:web:cdd5f4ecd3afdb197d8934",
  measurementId: "G-BYNY9QHJNC"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize authentication
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

export default app;