// ============================================
// FIREBASE CONFIGURATION
// ============================================
// Replace these values with your Firebase project config
// Get these from your Firebase Console -> Project Settings
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
firebase.initializeApp(firebaseConfig);

// Get references to Firebase services
const database = firebase.database();
const storage = firebase.storage();

// ============================================
// GLOBAL VARIABLES
// ============================================
let allArtPieces = [];
let userVotes = new Set();

// ============================================
// PAGE NAVIGATION
// ============================================
document.getElementById('homeBtn').addEventListener('click', () => {
    switchPage('homePage');
});

document.getElementById('uploadBtn').addEventListener('click', () => {
    switchPage('uploadPage');
});

function switchPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected page
    document.getElementById(pageId).classList.add('active');

    // Add active class to corresponding button
    if (pageId === 'homePage') {
        document.getElementById('homeBtn').classList.add('active');
        loadArtPieces();
    } else if (pageId === 'uploadPage') {
        document.getElementById('uploadBtn').classList.add('active');
        resetUploadForm();
    }
}

// ============================================
// UPLOAD FUNCTIONALITY
// ============================================
const uploadForm = document.getElementById('uploadForm');
const artTitleInput = document.getElementById('artTitle');
const artImageInput = document.getElementById('artImage');
const imagePreviewDiv = document.getElementById('imagePreview');
const uploadStatusDiv = document.getElementById('uploadStatus');

// Handle file selection
artImageInput.addEventListener('change', handleImageSelect);

// Handle drag and drop
const fileUpload = document.querySelector('.file-upload');
fileUpload.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileUpload.classList.add('dragover');
});

fileUpload.addEventListener('dragleave', () => {
    fileUpload.classList.remove('dragover');
});

fileUpload.addEventListener('drop', (e) => {
    e.preventDefault();
    fileUpload.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        artImageInput.files = files;
        handleImageSelect();
    }
});

function handleImageSelect() {
    const file = artImageInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreviewDiv.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        };
        reader.readAsDataURL(file);
    }
}

// Handle form submission
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = artTitleInput.value.trim();
    const imageFile = artImageInput.files[0];

    if (!title || !imageFile) {
        showUploadStatus('Please enter a title and select an image', 'error');
        return;
    }

    // Validate image file size (max 5MB)
    if (imageFile.size > 5 * 1024 * 1024) {
        showUploadStatus('Image size must be less than 5MB', 'error');
        return;
    }

    showUploadStatus('Uploading your art...', 'loading');
    document.querySelector('.submit-btn').disabled = true;

    try {
        // Upload image to Firebase Storage
        const timestamp = Date.now();
        const fileName = `art_${timestamp}_${imageFile.name}`;
        const storageRef = storage.ref(`art/${fileName}`);
        const uploadTask = storageRef.put(imageFile);

        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                showUploadStatus(`Uploading... ${Math.round(progress)}%`, 'loading');
            },
            (error) => {
                console.error('Upload error:', error);
                showUploadStatus('Error uploading image. Please try again.', 'error');
                document.querySelector('.submit-btn').disabled = false;
            },
            async () => {
                try {
                    // Get download URL
                    const downloadURL = await storageRef.getDownloadURL();

                    // Save art metadata to Realtime Database
                    const newArtRef = database.ref('art').push();
                    const artData = {
                        id: newArtRef.key,
                        title: title,
                        imageUrl: downloadURL,
                        votes: 0,
                        createdAt: firebase.database.ServerValue.TIMESTAMP,
                        uploader: 'Anonymous'
                    };

                    await newArtRef.set(artData);

                    showUploadStatus('✓ Art uploaded successfully!', 'success');
                    resetUploadForm();
                    document.querySelector('.submit-btn').disabled = false;

                    // Return to home page after 2 seconds
                    setTimeout(() => {
                        switchPage('homePage');
                    }, 2000);
                } catch (error) {
                    console.error('Database error:', error);
                    showUploadStatus('Error saving art information. Please try again.', 'error');
                    document.querySelector('.submit-btn').disabled = false;
                }
            }
        );
    } catch (error) {
        console.error('Error:', error);
        showUploadStatus('An error occurred. Please try again.', 'error');
        document.querySelector('.submit-btn').disabled = false;
    }
});

function showUploadStatus(message, type) {
    uploadStatusDiv.textContent = message;
    uploadStatusDiv.className = `upload-status ${type}`;
}

function resetUploadForm() {
    uploadForm.reset();
    imagePreviewDiv.innerHTML = '';
    uploadStatusDiv.className = 'upload-status';
    uploadStatusDiv.textContent = '';
}

// ============================================
// LOAD AND DISPLAY ART
// ============================================
function loadArtPieces() {
    const gallery = document.getElementById('artGallery');
    gallery.innerHTML = '<p class="loading">Loading art pieces...</p>';

    database.ref('art').on('value', (snapshot) => {
        allArtPieces = [];
        const data = snapshot.val();

        if (!data) {
            gallery.innerHTML = '<div class="empty-state"><p>No art pieces yet. Be the first to upload!</p></div>';
            return;
        }

        // Convert Firebase object to array and sort by creation date
        Object.values(data).forEach(art => {
            allArtPieces.push(art);
        });

        // Sort by creation date (newest first)
        allArtPieces.sort((a, b) => b.createdAt - a.createdAt);

        // Load user's voting history from localStorage
        loadUserVotes();

        // Apply filters and display
        displayArtPieces();
    });
}

function loadUserVotes() {
    const votesData = localStorage.getItem('artVotes');
    if (votesData) {
        userVotes = new Set(JSON.parse(votesData));
    }
}

function saveUserVotes() {
    localStorage.setItem('artVotes', JSON.stringify(Array.from(userVotes)));
}

function displayArtPieces() {
    let displayArt = [...allArtPieces];

    // Sort by votes (highest first)
    displayArt.sort((a, b) => (b.votes || 0) - (a.votes || 0));

    const gallery = document.getElementById('artGallery');

    if (displayArt.length === 0) {
        gallery.innerHTML = '<div class="empty-state"><p>No art pieces yet. Be the first to upload!</p></div>';
        return;
    }

    gallery.innerHTML = displayArt.map(art => {
        const isVoted = userVotes.has(art.id);
        return `
            <div class="art-card" data-art-id="${art.id}">
                <img src="${art.imageUrl}" alt="${art.title}" class="art-image">
                <div class="art-content">
                    <h3 class="art-title">${escapeHtml(art.title)}</h3>
                    <div class="art-meta">
                        <div class="vote-count">
                            ⭐ ${art.votes || 0}
                        </div>
                        <button class="vote-btn ${isVoted ? 'voted' : ''}" data-art-id="${art.id}">
                            ${isVoted ? '✓ Voted' : 'Vote'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Add event listeners to vote buttons
    document.querySelectorAll('.vote-btn').forEach(button => {
        button.addEventListener('click', handleVote);
    });
}

function handleVote(e) {
    const button = e.target;
    const artId = button.dataset.artId;

    if (userVotes.has(artId)) {
        // Already voted, remove vote
        removeVote(artId, button);
    } else {
        // Add vote
        addVote(artId, button);
    }
}

function addVote(artId, button) {
    const artRef = database.ref(`art/${artId}/votes`);
    artRef.transaction(currentValue => {
        return (currentValue || 0) + 1;
    }).then((result) => {
        if (result.committed) {
            userVotes.add(artId);
            saveUserVotes();
            button.classList.add('voted');
            button.textContent = '✓ Voted';

            // Update vote count display
            const card = button.closest('.art-card');
            const voteCount = card.querySelector('.vote-count');
            const currentVotes = parseInt(voteCount.textContent.match(/\d+/)[0]);
            voteCount.textContent = `⭐ ${currentVotes + 1}`;
        }
    }).catch(error => {
        console.error('Vote error:', error);
        alert('Error adding vote. Please try again.');
    });
}

function removeVote(artId, button) {
    const artRef = database.ref(`art/${artId}/votes`);
    artRef.transaction(currentValue => {
        return Math.max(0, (currentValue || 1) - 1);
    }).then((result) => {
        if (result.committed) {
            userVotes.delete(artId);
            saveUserVotes();
            button.classList.remove('voted');
            button.textContent = 'Vote';

            // Update vote count display
            const card = button.closest('.art-card');
            const voteCount = card.querySelector('.vote-count');
            const currentVotes = parseInt(voteCount.textContent.match(/\d+/)[0]);
            voteCount.textContent = `⭐ ${Math.max(0, currentVotes - 1)}`;
        }
    }).catch(error => {
        console.error('Unvote error:', error);
        alert('Error removing vote. Please try again.');
    });
}



// ============================================
// ADMIN FUNCTIONS
// ============================================
function clearAllVotes() {
    if (!confirm('Are you sure you want to clear all votes? This cannot be undone.')) {
        return;
    }

    database.ref('art').once('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        // Reset votes for all art pieces
        Object.keys(data).forEach(artId => {
            database.ref(`art/${artId}/votes`).set(0);
        });

        // Clear local votes
        userVotes.clear();
        saveUserVotes();

        alert('All votes have been cleared!');
        displayArtPieces();
    });
}

function clearAllData() {
    if (!confirm('WARNING: This will delete ALL art pieces, votes, and files from storage. This cannot be undone. Are you sure?')) {
        return;
    }

    if (!confirm('This is your final warning. Are you absolutely sure?')) {
        return;
    }

    database.ref('art').once('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        // Delete all files from storage
        Object.values(data).forEach(art => {
            const fileRef = storage.refFromURL(art.imageUrl);
            fileRef.delete().catch(error => {
                console.log('Error deleting file:', error);
            });
        });

        // Delete all data from database
        database.ref('art').remove();

        // Clear local votes
        userVotes.clear();
        saveUserVotes();

        alert('All data has been cleared!');
        displayArtPieces();
    });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// INITIALIZE APP
// ============================================
window.addEventListener('load', () => {
    // Setup admin button listeners
    document.querySelector('.clear-votes-btn').addEventListener('click', clearAllVotes);
    document.querySelector('.clear-all-btn').addEventListener('click', clearAllData);

    switchPage('homePage');
});
