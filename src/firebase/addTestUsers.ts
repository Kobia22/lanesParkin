// src/firebase/addTestUsers.ts
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  UserCredential 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  documentId,
  Timestamp
} from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import { UserRole, User } from './types';

interface TestUser {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  phoneNumber?: string;
}

// Development mode detection
const isDevelopment = process.env.NODE_ENV === 'development' || __DEV__;

// Simple logging utility for development
const devLog = (message: string, ...args: any[]) => {
  if (isDevelopment) {
    console.log(`[DEV-USERS] ${message}`, ...args);
  }
};

/**
 * Test users configuration
 * These users will be created for testing purposes
 */
export const TEST_USERS: TestUser[] = [
  {
    email: 'admin@admin.lanesparking.com',
    password: 'testadmin123',
    displayName: 'Test Admin',
    role: 'admin',
    phoneNumber: '+254700000000'
  },
  {
    email: 'worker@worker.lanesparking.com',
    password: 'testworker123',
    displayName: 'Test Worker',
    role: 'worker',
    phoneNumber: '+254700000001'
  },
  {
    email: 'student@students.jkuat.ac.ke',
    password: 'teststudent123',
    displayName: 'Test Student',
    role: 'student',
    phoneNumber: '+254700000002'
  },
  {
    email: 'guest@example.com',
    password: 'testguest123',
    displayName: 'Test Guest',
    role: 'guest',
    phoneNumber: '+254700000003'
  }
];

/**
 * Creates a user in Firebase Authentication and stores their profile in Firestore
 * @param user Test user to create
 * @returns User info with ID or null if failed
 */
async function createAuthUser(user: TestUser): Promise<{ uid: string } | null> {
  try {
    devLog(`Creating auth user: ${user.email}`);
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      user.email,
      user.password
    );
    
    const uid = userCredential.user.uid;
    devLog(`Auth user created with UID: ${uid}`);
    return { uid };
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      devLog(`User ${user.email} already exists in Authentication`);
      // Try to sign in to get current UID
      try {
        devLog(`Trying to sign in as ${user.email} to get UID`);
        const userCredential = await signInWithEmailAndPassword(
          auth,
          user.email,
          user.password
        );
        const uid = userCredential.user.uid;
        devLog(`Signed in as ${user.email}, UID: ${uid}`);
        
        // Sign out immediately to avoid affecting app state
        await signOut(auth);
        devLog(`Signed out after getting UID`);
        
        return { uid };
      } catch (signInError: any) {
        devLog(`Cannot sign in as ${user.email}: ${signInError.message}`);
        return null;
      }
    }
    
    devLog(`Error creating auth user ${user.email}: ${error.message}`);
    return null;
  }
}

/**
 * Creates a user document in Firestore
 * @param uid User ID
 * @param userData User data to store
 */
async function createUserDocument(uid: string, userData: Omit<User, 'id'>): Promise<void> {
  try {
    devLog(`Creating Firestore document for user: ${uid}`);
    await setDoc(doc(db, 'users', uid), {
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    devLog(`Successfully created Firestore document for ${userData.email}`);
  } catch (error: any) {
    devLog(`Error creating Firestore document: ${error.message}`);
    throw error;
  }
}

/**
 * Find a user by email in Firestore
 * @param email User email to find
 * @returns User document or null
 */
async function findUserByEmail(email: string): Promise<{ id: string, data: any } | null> {
  try {
    devLog(`Looking up user by email: ${email}`);
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      devLog(`No user found with email: ${email}`);
      return null;
    }
    
    const userDoc = querySnapshot.docs[0];
    devLog(`Found user with ID: ${userDoc.id}`);
    
    return {
      id: userDoc.id,
      data: userDoc.data()
    };
  } catch (error: any) {
    devLog(`Error finding user by email: ${error.message}`);
    return null;
  }
}

/**
 * Check if a test user exists and create if not
 * @param user Test user info
 */
async function ensureTestUser(user: TestUser): Promise<void> {
  devLog(`Ensuring test user exists: ${user.email} (${user.role})`);
  
  // Step 1: Check if user already exists in Firestore by email
  const existingUser = await findUserByEmail(user.email);
  
  if (existingUser) {
    devLog(`User ${user.email} already exists in Firestore with ID: ${existingUser.id}`);
    
    // Update role if different
    if (existingUser.data.role !== user.role) {
      devLog(`Updating role for ${user.email} from ${existingUser.data.role} to ${user.role}`);
      await setDoc(doc(db, 'users', existingUser.id), 
        { role: user.role, updatedAt: new Date().toISOString() }, 
        { merge: true }
      );
    }
    return;
  }
  
  // Step 2: Create user in Authentication if needed
  const authUser = await createAuthUser(user);
  
  // Step 3: Create user document in Firestore if we have a UID
  if (authUser?.uid) {
    await createUserDocument(authUser.uid, {
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      phoneNumber: user.phoneNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    devLog(`Successfully added test ${user.role}: ${user.email}`);
  } else {
    devLog(`Cannot create Firestore document for ${user.email} without UID`);
  }
}

/**
 * Adds test users to Firebase Authentication and Firestore
 * This function should only be used in development/testing environments
 */
export async function addTestUsers(): Promise<void> {
  if (!isDevelopment) {
    console.warn("WARNING: addTestUsers() called in production environment");
    return;
  }
  
  devLog("Starting to add test users...");
  
  try {
    // Process users sequentially to avoid race conditions
    for (const user of TEST_USERS) {
      await ensureTestUser(user);
    }
    
    devLog("Test users setup completed successfully");
  } catch (error: any) {
    console.error("Error in test user setup:", error.message);
  }
}

/**
 * An alternative approach that uses direct Firestore document creation
 * This bypasses normal authentication flow and is ONLY for testing
 * Use this when Firebase Authentication is not working or you're just testing Firestore rules
 */
export async function addTestUsersDirectly(): Promise<void> {
  if (!isDevelopment) {
    console.warn("WARNING: addTestUsersDirectly() called in production environment");
    return;
  }
  
  devLog("Adding test users for development environment");
  
  // Process users sequentially to avoid race conditions
  for (const user of TEST_USERS) {
    try {
      // Step 1: Try to create or get the user in Firebase Auth
      let uid: string | null = null;
      
      try {
        // Try to create a new user
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          user.email,
          user.password
        );
        uid = userCredential.user.uid;
        devLog(`Created auth user for ${user.email} with UID: ${uid}`);
      } catch (authError: any) {
        // If user already exists, try to sign in to get the UID
        if (authError.code === 'auth/email-already-in-use') {
          devLog(`Auth user ${user.email} already exists, trying to get UID`);
          try {
            const userCredential = await signInWithEmailAndPassword(
              auth,
              user.email,
              user.password
            );
            uid = userCredential.user.uid;
            devLog(`Got UID for existing user ${user.email}: ${uid}`);
            
            // Sign out immediately to not affect app state
            await signOut(auth);
          } catch (signInError) {
            devLog(`Could not sign in as ${user.email} to get UID: ${signInError}`);
          }
        } else {
          devLog(`Error creating auth user ${user.email}: ${authError}`);
        }
      }
      
      // Step 2: If we have a UID, create or update the Firestore document
      if (uid) {
        const userDocRef = doc(db, 'users', uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          // Update existing user document
          await setDoc(userDocRef, {
            role: user.role, // Make sure role is set correctly
            updatedAt: new Date().toISOString(),
          }, { merge: true });
          devLog(`Updated existing user document for ${user.email} with role ${user.role}`);
        } else {
          // Create new user document
          await setDoc(userDocRef, {
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            phoneNumber: user.phoneNumber || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString()
          });
          devLog(`Created new user document for ${user.email} with role ${user.role}`);
        }
      } else {
        // Also create a backup with fixed ID (but this won't be used for login)
        const docId = `test_${user.role}_user`;
        const docRef = doc(db, 'users', docId);
        await setDoc(docRef, {
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          phoneNumber: user.phoneNumber || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString()
        });
        devLog(`Created backup test ${user.role} with ID: ${docId}`);
      }
      
    } catch (error: any) {
      devLog(`Error processing test user ${user.email}: ${error.message}`);
    }
  }
  
  devLog("Test user setup completed");
}

/**
 * Setup test users automatically at runtime
 * Call this function in your app initialization code
 */
export async function setupTestUsersForDevelopment(): Promise<void> {
  if (!isDevelopment) return;
  
  try {
    devLog("Setting up test users for development environment");
    
    // Try the direct method first (more reliable in development)
    await addTestUsersDirectly();
    
    // Also try the auth method as a backup
    // Comment this out if you're having auth issues
    // await addTestUsers();
    
    devLog("Test user setup complete");
  } catch (error: any) {
    console.error("Test user setup failed:", error.message);
  }
}

/**
 * Log in as a specific test user
 * Use this for testing different user roles
 * @param role The role to log in as
 */
export async function loginAsTestUser(role: UserRole): Promise<UserCredential | null> {
  if (!isDevelopment) {
    console.warn("WARNING: loginAsTestUser() called in production environment");
    return null;
  }
  
  const testUser = TEST_USERS.find(user => user.role === role);
  
  if (!testUser) {
    console.error(`No test user defined for role: ${role}`);
    return null;
  }
  
  try {
    devLog(`Logging in as test ${role}: ${testUser.email}`);
    
    const userCredential = await signInWithEmailAndPassword(
      auth,
      testUser.email,
      testUser.password
    );
    
    devLog(`Successfully logged in as ${testUser.email}`);
    return userCredential;
  } catch (error: any) {
    console.error(`Error logging in as test ${role}:`, error.message);
    return null;
  }
}

// Export test user emails for convenience
export const TEST_USER_EMAILS = {
  admin: TEST_USERS.find(u => u.role === 'admin')?.email,
  worker: TEST_USERS.find(u => u.role === 'worker')?.email,
  student: TEST_USERS.find(u => u.role === 'student')?.email,
  guest: TEST_USERS.find(u => u.role === 'guest')?.email,
};