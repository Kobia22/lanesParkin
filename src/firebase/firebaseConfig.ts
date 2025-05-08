// src/firebase/firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAmNIOnMHl0zdF6VV1q8VUB1fjoqAI_S5I",
  authDomain: "lanesparking.firebaseapp.com",
  projectId: "lanesparking",
  storageBucket: "lanesparking.appspot.com",
  messagingSenderId: "1052301765341",
  appId: "1:1052301765341:web:cdd5f4ecd3afdb197d8934",
  measurementId: "G-BYNY9QHJNC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, app };