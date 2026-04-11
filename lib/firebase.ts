import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

type FirebaseServices = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  provider: GoogleAuthProvider;
};

export function getFirebaseServices(): FirebaseServices | null {
  const rawConfig = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
  if (!rawConfig) {
    return null;
  }

  try {
    const config = JSON.parse(rawConfig);
    if (!config.apiKey || !config.projectId) {
      return null;
    }

    const app = getApps().length ? getApps()[0] : initializeApp(config);
    return {
      app,
      auth: getAuth(app),
      db: getFirestore(app),
      provider: new GoogleAuthProvider(),
    };
  } catch {
    return null;
  }
}
