import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBVJgqD79MXrKbU2okML4wzlMym7yaLxio",
  authDomain: "v11rutop.firebaseapp.com",
  projectId: "v11rutop",
  storageBucket: "v11rutop.firebasestorage.app",
  messagingSenderId: "664984661004",
  appId: "1:664984661004:web:357ea8a60723b000e55229",
  measurementId: "G-DMPEGNPVEN"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// UI elements
const googleLoginBtn = document.getElementById("googleLogin");
const emailLoginBtn = document.getElementById("emailLogin");
const emailRegisterBtn = document.getElementById("emailRegister");

// Google Login
googleLoginBtn.addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
    window.location.href = "index.html"; // Redirect after login
  } catch (error) {
    alert(error.message);
  }
});

// Email Login
emailLoginBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "https://www.viiru.top/"; // Redirect after login
  } catch (error) {
    alert(error.message);
  }
});

// Email Register
emailRegisterBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("Account created! You can now login.");
  } catch (error) {
    alert(error.message);
  }
});

