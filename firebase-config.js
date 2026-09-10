// Firebase Configuration
// Get your config from: https://console.firebase.google.com/
// Project Settings > General > Your apps > Firebase SDK snippet

const firebaseConfig = {
    apiKey: "AIzaSyDDT9d4rzkNMR6db1jLGWz7E_lYETeV8KI",
    authDomain: "art-voter.firebaseapp.com",
    databaseURL: "https://art-voter-default-rtdb.firebaseio.com",
    projectId: "art-voter",
    storageBucket: "art-voter.firebasestorage.app",
    messagingSenderId: "260012357704",
    appId: "1:260012357704:web:89160c48dcb7209db8c07d"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
console.log('Firebase app initialized');

// Get Firebase services and expose them as globals
// These will be accessible throughout the app
db = firebase.database(app);  // Realtime Database, not Firestore
storage = firebase.storage(app);
auth = firebase.auth(app);

console.log('Firebase services initialized:', { db, storage, auth });


