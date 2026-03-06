// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCiRhD7JBCQ8pLSJ2hnmlOFmDkKpc7Xt-g",
  authDomain: "joey-s-collab-site.firebaseapp.com",
  projectId: "joey-s-collab-site",
  storageBucket: "joey-s-collab-site.firebasestorage.app",
  messagingSenderId: "572452193410",
  appId: "1:572452193410:web:fbbe9bd41e6dedc068609b",
  measurementId: "G-5SPQCX5KER"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
