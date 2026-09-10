# Art Voter 🎨

A vanilla JavaScript app for uploading and voting on art pieces using Firebase.

## Features

- **Home Page**: View all uploaded art pieces with vote counts
- **Upload Page**: Add new art pieces with images
- **Voting System**: Vote on your favorite art pieces
- **Real-time Updates**: Votes and new uploads appear instantly
- **Responsive Design**: Works on desktop, tablet, and mobile

## Setup Instructions

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Give it a name (e.g., "art-voter")
4. Complete the setup process

### 2. Enable Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click **Create Database**
3. Choose **Start in test mode** (for development)
4. Select your region
5. Click **Enable**

### 3. Enable Storage

1. In Firebase Console, go to **Storage**
2. Click **Get Started**
3. Choose the default bucket location
4. Click **Done**

### 4. Get Firebase Config

1. In Firebase Console, go to **Project Settings**
2. Click the **General** tab
3. Scroll down to "Your apps"
4. Click the Web icon (</>) to create a web app
5. Copy the Firebase SDK config (the object with apiKey, authDomain, etc.)

### 5. Add Config to Your App

1. Open `firebase-config.js` in your project
2. Replace the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-messaging-sender-id",
    appId: "your-app-id"
};
```

### 6. Set Firestore Security Rules (Important!)

In Firestore Database, go to **Rules** tab and replace with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artPieces/{document=**} {
      allow read: if true;
      allow create: if true;
      allow update: if true;
      allow delete: if false;
    }
  }
}
```

### 7. Set Storage Security Rules

In Storage, go to **Rules** tab and replace with:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /art/{allPaths=**} {
      allow read: if true;
      allow create: if true;
      allow delete: if false;
    }
  }
}
```

## Usage

1. Open `index.html` in your browser (or use a local server)
2. Click **"Upload Art"** to add a new art piece with a name and image
3. Click **"Home"** to return to the gallery
4. Click **"Vote"** on any art piece to vote for it
5. Votes update in real-time!

## File Structure

- `index.html` - HTML markup and styling
- `app.js` - JavaScript logic for Firebase operations and UI
- `firebase-config.js` - Firebase configuration (add your credentials here)
- `README.md` - This file

## Technologies Used

- Vanilla JavaScript (no frameworks)
- Firebase Firestore (database)
- Firebase Storage (image hosting)
- CSS Grid (responsive layout)

## Notes for Production

Before deploying to production, update your security rules to:
- Require authentication for uploads
- Implement rate limiting on votes
- Use appropriate CORS settings
- Consider user authentication to prevent vote manipulation
