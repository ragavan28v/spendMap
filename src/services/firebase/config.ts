import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';

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
export const firebaseAuth = (() => {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
})();
export const firebaseFirestore = getFirestore(app);
export const firebaseStorage = getStorage(app);
