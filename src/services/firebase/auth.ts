import { UserProfile } from '@/types';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithCredential,
    signOut,
    User,
} from 'firebase/auth';
import { firebaseAuth } from './config';

export async function signInWithGoogle(idToken: string): Promise<UserProfile> {
  const credential = GoogleAuthProvider.credential(idToken);
  const result = await signInWithCredential(firebaseAuth, credential);
  const user = result.user;

  return {
    uid: user.uid,
    name: user.displayName ?? 'SpendWise user',
    email: user.email ?? '',
    photoURL: user.photoURL ?? undefined,
    currency: 'INR',
    createdAt: user.metadata.creationTime ? Date.parse(user.metadata.creationTime) : Date.now(),
  };
}

export function configureGoogleSignIn(config: { webClientId: string; iosClientId?: string }) {
  if (!config.webClientId) {
    return;
  }

  GoogleSignin.configure({
    webClientId: config.webClientId,
    iosClientId: config.iosClientId,
    scopes: ['profile', 'email'],
  });
}

export async function restoreFirebaseAuth(): Promise<User | null> {
  if (firebaseAuth.currentUser) {
    return firebaseAuth.currentUser;
  }

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: false });
    await GoogleSignin.signInSilently();
    const tokens = await GoogleSignin.getTokens();
    const idToken = tokens.idToken;
    if (!idToken) {
      return null;
    }

    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(firebaseAuth, credential);
    return result.user;
  } catch (error) {
    console.warn('Unable to restore Firebase auth silently.', error);
    return null;
  }
}

export function observeAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(firebaseAuth, callback);
}

export function getCurrentFirebaseUserId() {
  return firebaseAuth.currentUser?.uid ?? null;
}

export async function signOutUser() {
  try {
    await GoogleSignin.signOut();
  } catch {
    // Google may already be signed out locally.
  }
  try {
    await GoogleSignin.revokeAccess();
  } catch {
    // Revocation can fail if there is no cached Google session.
  }
  await signOut(firebaseAuth);
}
