import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCXz1A7kXS0Sdgyyn3lmteTwa6HJd4ejCk",
  authDomain: "flota-policial.firebaseapp.com",
  projectId: "flota-policial",
  storageBucket: "flota-policial.firebasestorage.app",
  messagingSenderId: "402097486106",
  appId: "1:402097486106:web:21c7e6616a22538deed4a3",
  measurementId: "G-W9QB0ZGTKW"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);