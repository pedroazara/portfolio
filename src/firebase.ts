import { initializeApp } from "firebase/app";
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

// Initialize Firestore with the custom database ID and ignore undefined properties
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true }, "ai-studio-3dd2fc48-171e-4247-9594-2287a0634df5");
