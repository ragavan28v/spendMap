import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

let getReactNativePersistence: ((storage: any) => any) | null = null;
try {
  // Dynamically require to avoid bundler/type issues on web
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const rnAuth = require('firebase/auth/react-native');
  getReactNativePersistence = rnAuth.getReactNativePersistence;
} catch (e) {
  // module not available; we'll fall back to default persistence
  getReactNativePersistence = null;
}

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '<YOUR_FIREBASE_API_KEY>',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '<YOUR_FIREBASE_AUTH_DOMAIN>',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '<YOUR_FIREBASE_PROJECT_ID>',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '<YOUR_FIREBASE_STORAGE_BUCKET>',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '<YOUR_FIREBASE_MESSAGING_SENDER_ID>',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '<YOUR_FIREBASE_APP_ID>',
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const firebaseApp = app;

// Use React Native persistence when available (AsyncStorage)
let firebaseAuth: Auth;
if (Platform.OS !== 'web' && getReactNativePersistence) {
  try {
    firebaseAuth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch (e) {
    // Fallback to default getAuth if initializeAuth fails
    firebaseAuth = getAuth(app);
  }
} else {
  firebaseAuth = getAuth(app);
}

export { firebaseAuth };
export const firebaseFirestore = getFirestore(app);
export const firebaseStorage = getStorage(app);
