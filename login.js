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
      apiKey: "AIzaSyBkbXzURYKixz4R28OYMUOueA9ysG3Q1Lo",
      authDomain: "prebuiltid-website.firebaseapp.com",
      projectId: "prebuiltid-website",
      storageBucket: "prebuiltid-website.firebasestorage.app",
      messagingSenderId: "854871585546",
      appId: "1:854871585546:web:568400979292a0c31740f3",
      measurementId: "G-YS1Q1904H6"
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
    window.location.href = "https://prebuiltid.github.io/Prebuiltid/"; // Redirect after login
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
    alert("Konto loodud! Nüüd saad sisse logida!");
  } catch (error) {
    alert(error.message);
  }
});

