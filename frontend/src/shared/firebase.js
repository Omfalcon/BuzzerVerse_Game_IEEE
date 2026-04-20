import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBPJxtrlVzgsaabNkPW3WdeReGoeTePKUE",
  authDomain: "buzz-ieee.firebaseapp.com",
  projectId: "buzz-ieee",
  storageBucket: "buzz-ieee.firebasestorage.app",
  messagingSenderId: "45031938559",
  appId: "1:45031938559:web:b7c4c786f55382de87afca",
  measurementId: "G-X03NYBJLXP"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export { signInWithPopup };
