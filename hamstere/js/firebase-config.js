/**
 * HAMSTER.IO - Configuration Firebase Realtime Database
 * Configuration officielle pour le projet hamstere-5344d
 */

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyB-rpn4skmMMdOaS7_daZct40z7M3yZJ1w",
  authDomain: "hamstere-5344d.firebaseapp.com",
  projectId: "hamstere-5344d",
  storageBucket: "hamstere-5344d.firebasestorage.app",
  messagingSenderId: "958678660527",
  appId: "1:958678660527:web:1eaaf192797ad4f3b9eb5a",
  measurementId: "G-X4V4T35HY7",
  databaseURL: "https://hamstere-5344d-default-rtdb.firebaseio.com"
};

// Vérification et auto-complétion si nécessaire
window.isFirebaseConfigValid = function(config) {
  const c = config || window.FIREBASE_CONFIG;
  if (!c || !c.apiKey || !c.projectId) return false;
  if (!c.databaseURL || c.databaseURL.trim().length === 0) {
    c.databaseURL = `https://${c.projectId}-default-rtdb.firebaseio.com`;
  }
  return true;
};
