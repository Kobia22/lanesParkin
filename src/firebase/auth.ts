// src/firebase/auth.ts
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  UserCredential
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import { User, UserRole } from './types';

// Regex pattern for staff ID validation
export const STAFF_ID_REGEX = /^[A-Z]{3}\d{2}-\d{3}$/;

// Helper function to determine role based on email
export function determineUserRole(email: string): UserRole {
  const STUDENT_EMAIL_REGEX = /@students\.jkuat\.ac\.ke$/;
  const ADMIN_EMAIL_REGEX = /@admin\.lanesparking\.com$/;
  
  if (ADMIN_EMAIL_REGEX.test(email)) {
    return 'admin';
  } else if (STUDENT_EMAIL_REGEX.test(email)) {
    return 'student';
  } else {
    return 'guest';
  }
}

// Convert staff ID to admin email
export function staffIdToAdminEmail(staffId: string): string {
  return `${staffId}@admin.lanesparking.com`;
}

// Validate staff ID format
export function isValidStaffId(staffId: string): boolean {
  return STAFF_ID_REGEX.test(staffId);
}

// Register a new user
export async function registerUser(email: string, password: string): Promise<User> {
  try {
    // First, create the auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Determine user role based on email domain
    const role = determineUserRole(email);
    
    // Create user document in Firestore
    const userData: Omit<User, 'id'> = {
      email: email,
      role: role,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
    
    await setDoc(doc(db, "users", user.uid), userData);
    
    // Return the user with ID
    return {
      id: user.uid,
      ...userData
    };
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

// Register a new admin user with staff ID
export async function registerAdminUser(staffId: string, password: string): Promise<User> {
  if (!isValidStaffId(staffId)) {
    throw new Error("Invalid staff ID format");
  }
  
  const adminEmail = staffIdToAdminEmail(staffId);
  
  try {
    // Create the auth user
    const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, password);
    const user = userCredential.user;
    
    // Create admin user document in Firestore
    const userData: Omit<User, 'id'> = {
      email: adminEmail,
      role: 'admin',
      staffId: staffId,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };
    
    await setDoc(doc(db, "users", user.uid), userData);
    
    // Return the user with ID
    return {
      id: user.uid,
      ...userData
    };
  } catch (error) {
    console.error("Error creating admin user:", error);
    throw error;
  }
}

// Sign in an existing user
export async function signInUser(email: string, password: string): Promise<User> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update last login timestamp
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      lastLoginAt: new Date().toISOString()
    });
    
    // Get the user data
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error("User not found in database");
    }
    
    return {
      id: user.uid,
      ...userDoc.data() as Omit<User, 'id'>
    };
  } catch (error) {
    console.error("Error signing in:", error);
    throw error;
  }
}

// Sign in admin using staff ID
export async function signInAdmin(staffId: string, password: string): Promise<User> {
  if (!isValidStaffId(staffId)) {
    throw new Error("Invalid staff ID format");
  }
  
  const adminEmail = staffIdToAdminEmail(staffId);
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, adminEmail, password);
    const user = userCredential.user;
    
    // Update last login timestamp
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, {
      lastLoginAt: new Date().toISOString()
    });
    
    // Get the user data and verify role
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error("User not found in database");
    }
    
    const userData = userDoc.data() as Omit<User, 'id'>;
    
    if (userData.role !== 'admin') {
      // User exists but is not an admin, sign out and throw error
      await firebaseSignOut(auth);
      throw new Error("User does not have admin privileges");
    }
    
    return {
      id: user.uid,
      ...userData
    };
  } catch (error) {
    console.error("Error signing in admin:", error);
    throw error;
  }
}

// Get current user details
export async function getCurrentUser(): Promise<User | null> {
  const user = auth.currentUser;
  
  if (!user) {
    return null;
  }
  
  try {
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return null;
    }
    
    return {
      id: user.uid,
      ...userDoc.data() as Omit<User, 'id'>
    };
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

// Sign out the current user
export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
}

// Check if current user is admin
export async function isUserAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === 'admin';
}