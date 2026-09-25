import {
  browserLocalPersistence,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth, firebaseConfigured } from '../firebase/firebase';

function createConfigurationError() {
  const error = new Error('Firebase Authentication no está configurado.');
  error.code = 'auth/not-configured';
  return error;
}

function requireAuth() {
  if (!firebaseConfigured || !auth) {
    throw createConfigurationError();
  }

  return auth;
}

export function loginUser(email, password) {
  return signInWithEmailAndPassword(requireAuth(), email.trim(), password).then(
    ({ user: authenticatedUser }) => authenticatedUser,
  );
}

export function logoutUser() {
  return signOut(requireAuth());
}

export function resetPassword(email) {
  return sendPasswordResetEmail(requireAuth(), email.trim());
}

export function subscribeToAuthState(callback) {
  return onAuthStateChanged(requireAuth(), callback);
}

export function setAuthPersistence() {
  return setPersistence(requireAuth(), browserLocalPersistence);
}
