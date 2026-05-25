export const firebaseWebConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAR7TmlpO7mjky9JDgtLzukMFd5f0lyRiI',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'ali-compras-a45b5.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'ali-compras-a45b5',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'ali-compras-a45b5.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '437941991960',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:437941991960:web:3c1d6c89cff718e815e16d',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-ZV43RFEWZP',
};

// Public web push key for the default Firebase project configured above.
export const firebaseVapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || 'BDmIXTMtxIFzHfNZkgZkJdLJit_5CJbiufG7CNyKN0Dlo3uf_taFX5bk8I1ZHMGsIMes3UEnNCKqUnaRRSe3Pcs';
