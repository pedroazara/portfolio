import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCsYszSgyeQQCyn26_TRqqdXclQJSPyKj8",
  authDomain: "helpful-magnet-1wjrd.firebaseapp.com",
  projectId: "helpful-magnet-1wjrd",
  storageBucket: "helpful-magnet-1wjrd.firebasestorage.app",
  messagingSenderId: "359503078601",
  appId: "1:359503078601:web:67fc705743c9ecccced918"
};

const app = initializeApp(firebaseConfig);

// Firebase Authentication. Persistence defaults to browserLocalPersistence,
// so the admin session survives page reloads until an explicit sign-out.
export const auth = getAuth(app);

// Initialize Firestore with long polling fallback support and ignore undefined properties
export const db = initializeFirestore(
  app,
  {
    ignoreUndefinedProperties: true,
    experimentalAutoDetectLongPolling: true
  },
  "ai-studio-3dd2fc48-171e-4247-9594-2287a0634df5"
);
