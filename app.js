// Firebase references
let db;
let storage;
let auth;

// Initialize Firebase (config is imported from firebase-config.js)
if (typeof firebase !== 'undefined' && firebase.apps.length === 0) {
    db = firebase.firestore();
    storage = firebase.storage();
    auth = firebase.auth();
}

// DOM Elements
const homeBtn = document.getElementById('homeBtn');
const uploadBtn = document.getElementById('uploadBtn');
const homePage = document.getElementById('homePage');
const uploadPage = document.getElementById('uploadPage');
const artGrid = document.getElementById('artGrid');
const emptyState = document.getElementById('emptyState');
const uploadForm = document.getElementById('uploadForm');
const cancelBtn = document.getElementById('cancelBtn');
const artNameInput = document.getElementById('artName');
const artImageInput = document.getElementById('artImage');
const imagePreview = document.getElementById('imagePreview');
const uploadMessage = document.getElementById('uploadMessage');
const submitBtn = document.getElementById('submitBtn');

// Event Listeners
homeBtn.addEventListener('click', showHomePage);
uploadBtn.addEventListener('click', showUploadPage);
cancelBtn.addEventListener('click', showHomePage);
uploadForm.addEventListener('submit', handleUpload);
artImageInput.addEventListener('change', previewImage);

// Initialize app
let artPieces = [];
loadArtPieces();

// Page Navigation
function showHomePage() {
    homePage.style.display = 'block';
    uploadPage.style.display = 'none';
    uploadMessage.innerHTML = '';
    uploadForm.reset();
    imagePreview.style.display = 'none';
    loadArtPieces();
}

function showUploadPage() {
    homePage.style.display = 'none';
    uploadPage.style.display = 'block';
    uploadMessage.innerHTML = '';
}

// Load art pieces from Firestore
async function loadArtPieces() {
    try {
        const querySnapshot = await db.collection('artPieces').orderBy('createdAt', 'desc').get();
        
        artPieces = [];
        querySnapshot.forEach(doc => {
            artPieces.push({
                id: doc.id,
                ...doc.data()
            });
        });

        displayArtPieces();
    } catch (error) {
        console.error('Error loading art pieces:', error);
        showMessage('Error loading art pieces', 'error');
    }
}

// Display art pieces
function displayArtPieces() {
    artGrid.innerHTML = '';

    if (artPieces.length === 0) {
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    artPieces.forEach(art => {
        const card = document.createElement('div');
        card.className = 'art-card';
        card.innerHTML = `
            <img src="${art.imageUrl}" alt="${art.name}">
            <div class="art-info">
                <div class="art-title">${escapeHtml(art.name)}</div>
                <div class="art-votes">👍 ${art.votes || 0} votes</div>
                <button class="btn-vote" data-id="${art.id}">Vote</button>
            </div>
        `;
        
        const voteBtn = card.querySelector('.btn-vote');
        voteBtn.addEventListener('click', () => voteOnArt(art.id));
        
        artGrid.appendChild(card);
    });
}

// Vote on art
async function voteOnArt(artId) {
    try {
        const artRef = db.collection('artPieces').doc(artId);
        
        // Use transaction to safely increment votes
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(artRef);
            const newVotes = (doc.data().votes || 0) + 1;
            transaction.update(artRef, { votes: newVotes });
        });

        // Reload to show updated votes
        await loadArtPieces();
    } catch (error) {
        console.error('Error voting:', error);
        showMessage('Error recording vote', 'error');
    }
}

// Preview image before upload
function previewImage(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            imagePreview.src = event.target.result;
            imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

// Handle art upload
async function handleUpload(e) {
    e.preventDefault();

    const name = artNameInput.value.trim();
    const imageFile = artImageInput.files[0];

    if (!name || !imageFile) {
        showMessage('Please fill in all fields', 'error');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    showMessage('Uploading...', '');

    try {
        // Upload image to Storage
        const timestamp = Date.now();
        const fileName = `${timestamp}_${imageFile.name}`;
        const storageRef = storage.ref(`art/${fileName}`);
        
        const snapshot = await storageRef.put(imageFile);
        const imageUrl = await snapshot.ref.getDownloadURL();

        // Add art piece to Firestore
        await db.collection('artPieces').add({
            name: name,
            imageUrl: imageUrl,
            votes: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        showMessage('Art uploaded successfully!', 'success');
        
        // Reset form and go back to home after delay
        setTimeout(() => {
            uploadForm.reset();
            imagePreview.style.display = 'none';
            showHomePage();
        }, 1500);

    } catch (error) {
        console.error('Error uploading art:', error);
        showMessage(`Error uploading art: ${error.message}`, 'error');
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
    }
}

// Show message (success or error)
function showMessage(message, type) {
    if (type === 'success') {
        uploadMessage.innerHTML = `<div class="success">${escapeHtml(message)}</div>`;
    } else if (type === 'error') {
        uploadMessage.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
    } else {
        uploadMessage.innerHTML = `<div>${escapeHtml(message)}</div>`;
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
