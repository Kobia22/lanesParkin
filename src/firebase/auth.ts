// src/firebase/auth.ts
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  UserCredential,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import { User, UserRole } from './types';

/**
 * Determine user role from email domain
 */
export function determineUserRole(email: string): UserRole {
  if (!email || !email.includes('@')) return 'guest';
  
  const domain = email.split('@')[1].toLowerCase();
  
  if (domain === 'students.jkuat.ac.ke') {
    return 'student';
  } else if (domain === 'admin.lanesparking.com') {
    return 'admin';
  } else if (domain === 'worker.lanesparking.com') {
    return 'worker';
  } else {
    return 'guest';
  }
}

/**
 * Sign up a new user with email and password
 */
export async function registerUser(email: string, password: string, displayName: string): Promise<User> {
  try {
    // Create user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    
    // Determine role based on email domain
    const role = determineUserRole(email);
    
    // Create user document in Firestore
    const userData: Omit<User, 'id'> = {
      email,
      displayName,
      role,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
    
    await setDoc(doc(db, 'users', uid), userData);
    
    // Return the complete user object
    return {
      id: uid,
      ...userData
    };
  } catch (error) {
    console.error('Error signing up user:', error);
    throw error;
  }
}

/**
 * Sign in an existing user
 */
export async function signIn(email: string, password: string): Promise<User> {
  try {
    // Sign in with Firebase Authentication
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    
    // Get user document from Firestore
    const userDoc = await getDoc(doc(db, 'users', uid));
    
    if (!userDoc.exists()) {
      throw new Error('User record not found in database');
    }
    
    // Update last login timestamp
    await updateDoc(doc(db, 'users', uid), {
      lastLoginAt: new Date().toISOString()
    });
    
    // Return the user data
    return {
      id: uid,
      ...userDoc.data() as Omit<User, 'id'>
    };
  } catch (error) {
    console.error('Error signing in user:', error);
    throw error;
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  try {
    await firebaseSendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

/**
 * Get the current authenticated user from Firestore
 * Modified to better handle role detection from email domains
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      return null;
    }
    
    // Log more info for debugging
    console.log(`Fetching user data for: ${currentUser.uid} (${currentUser.email})`);
    
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    
    if (!userDoc.exists()) {
      console.log(`No user document found for ${currentUser.uid}, creating one`);
      
      // Determine role based on email domain
      const email = currentUser.email || '';
      const role = determineUserRole(email);
      
      console.log(`Determined role from email: ${role}`);
      
      // Create a basic user record if one doesn't exist
      const basicUserData: Omit<User, 'id'> = {
        email: currentUser.email || '',
        displayName: currentUser.displayName || email.split('@')[0] || '',
        role: role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, 'users', currentUser.uid), basicUserData);
      console.log(`Created new user document with role: ${role}`);
      
      return {
        id: currentUser.uid,
        ...basicUserData
      };
    }
    
    // Get user data and ensure role is correct based on email
    const userData = userDoc.data() as Omit<User, 'id'>;
    const email = userData.email || '';
    
    // Check if role is consistent with email domain
    const correctRole = determineUserRole(email);
    if (userData.role !== correctRole) {
      console.log(`Fixing role for ${email} from ${userData.role} to ${correctRole}`);
      await updateDoc(doc(db, 'users', currentUser.uid), {
        role: correctRole,
        updatedAt: new Date().toISOString()
      });
      userData.role = correctRole;
    }
    
    // Update last login timestamp
    await updateDoc(doc(db, 'users', currentUser.uid), {
      lastLoginAt: new Date().toISOString()
    });
    
    console.log(`Returning user with role: ${userData.role}`);
    
    return {
      id: currentUser.uid,
      ...userData
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Change a user's role (admin only)
 */
export async function changeUserRole(userId: string, newRole: UserRole): Promise<void> {
  try {
    // Get current user to verify admin status
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Only admins can change user roles');
    }
    
    await updateDoc(doc(db, 'users', userId), {
      role: newRole,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error changing user role:', error);
    throw error;
  }
}

/**
 * Change the current user's password
 * Requires the user to reauthenticate with their current password before setting the new one
 */
export async function changeUserPassword(currentPassword: string, newPassword: string): Promise<void> {
  try {
    const user = auth.currentUser;
    
    if (!user || !user.email) {
      throw new Error('No authenticated user found');
    }
    
    // Create credential with current email and password
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    
    // Reauthenticate the user
    await reauthenticateWithCredential(user, credential);
    
    // Update the password
    await updatePassword(user, newPassword);
    
    // Update the user document to record the password change time
    await updateDoc(doc(db, 'users', user.uid), {
      passwordUpdatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    console.log('Password updated successfully');
  } catch (error) {
    console.error('Error changing password:', error);
    throw error;
  }
}

/**
 * Create a test/development admin user
 */
export async function createTestAdmin(email: string, password: string): Promise<User> {
  try {
    return await registerUser(email, password, 'Test Admin');
  } catch (error) {
    console.error('Error creating test admin:', error);
    throw error;
  }
}