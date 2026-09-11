// ============================
// Firebase Configuration
// ============================
// TODO: Replace with your Firebase project configuration
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
const db = firebase.database();
const storage = firebase.storage();

// ============================
// Global State
// ============================
let artPieces = {};
let votedArt = new Set(); // Track which art user has voted on

// ============================
// Page Navigation
// ============================
function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected page
    document.getElementById(pageName + 'Page').classList.add('active');

    // Add active class to clicked button
    document.getElementById(pageName + 'Btn').classList.add('active');

    // Load art pieces when viewing
    if (pageName === 'view') {
        loadArtPieces();
    }
}

// ============================
// Upload Functionality
// ============================
document.getElementById('uploadForm').addEventListener('submit', handleUpload);

document.getElementById('artImage').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const preview = document.getElementById('previewImage');
            preview.src = event.target.result;
            document.getElementById('previewContainer').style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
});

async function handleUpload(e) {
    e.preventDefault();

    const artName = document.getElementById('artName').value;
    const artImage = document.getElementById('artImage').files[0];
    const statusEl = document.getElementById('uploadStatus');
    const submitBtn = document.getElementById('submitBtn');

    if (!artName || !artImage) {
        statusEl.textContent = '⚠️ Please fill in all fields';
        statusEl.className = 'upload-status error';
        return;
    }

    // Validate file size (max 5MB)
    if (artImage.size > 5 * 1024 * 1024) {
        statusEl.textContent = '⚠️ File is too large (max 5MB)';
        statusEl.className = 'upload-status error';
        return;
    }

    try {
        statusEl.textContent = '⏳ Uploading...';
        statusEl.className = 'upload-status loading';
        submitBtn.disabled = true;

        // Generate unique ID for this art piece
        const artId = db.ref('artPieces').push().key;

        // Upload image to Firebase Storage
        const storageRef = storage.ref(`art-images/${artId}`);
        const snapshot = await storageRef.put(artImage);
        const imageUrl = await snapshot.ref.getDownloadURL();

        // Save metadata to Realtime Database
        await db.ref(`artPieces/${artId}`).set({
            name: artName,
            imageUrl: imageUrl,
            votes: 0,
            uploadedAt: new Date().toISOString(),
            uploadedBy: 'Anonymous'
        });

        // Clear form
        document.getElementById('uploadForm').reset();
        document.getElementById('previewContainer').style.display = 'none';

        statusEl.textContent = '✅ Art uploaded successfully!';
        statusEl.className = 'upload-status success';
        
        // Reset after 2 seconds
        setTimeout(() => {
            statusEl.textContent = '';
            submitBtn.disabled = false;
        }, 2000);

    } catch (error) {
        console.error('Upload error:', error);
        statusEl.textContent = `❌ Upload failed: ${error.message}`;
        statusEl.className = 'upload-status error';
        submitBtn.disabled = false;
    }
}

// ============================
// View & Vote Functionality
// ============================
function loadArtPieces() {
    const gallery = document.getElementById('artGallery');
    
    db.ref('artPieces').on('value', (snapshot) => {
        artPieces = snapshot.val() || {};

        if (Object.keys(artPieces).length === 0) {
            gallery.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎨</div>
                    <p>No art pieces yet. Be the first to upload!</p>
                </div>
            `;
            return;
        }

        gallery.innerHTML = '';

        // Sort by votes (highest first)
        const sortedIds = Object.keys(artPieces).sort((a, b) => {
            return (artPieces[b].votes || 0) - (artPieces[a].votes || 0);
        });

        sortedIds.forEach(artId => {
            const art = artPieces[artId];
            createArtCard(artId, art);
        });
    }, (error) => {
        console.error('Error loading art pieces:', error);
        gallery.innerHTML = '<p class="loading">Error loading art pieces. Please check your Firebase configuration.</p>';
    });
}

function createArtCard(artId, art) {
    const template = document.getElementById('artCardTemplate');
    const card = template.content.cloneNode(true);

    card.querySelector('.art-image').src = art.imageUrl;
    card.querySelector('.art-image').alt = art.name;
    card.querySelector('.art-name').textContent = art.name;
    card.querySelector('.vote-number').textContent = art.votes || 0;

    const voteBtn = card.querySelector('.btn-vote');
    
    // Check if user has already voted on this piece
    if (votedArt.has(artId)) {
        voteBtn.disabled = true;
        voteBtn.textContent = '✓ Voted';
        voteBtn.style.opacity = '0.6';
    }

    voteBtn.addEventListener('click', () => handleVote(artId, voteBtn));

    document.getElementById('artGallery').appendChild(card);
}

async function handleVote(artId, btn) {
    if (votedArt.has(artId)) {
        return; // Already voted
    }

    try {
        btn.disabled = true;

        // Update vote count in database
        const artRef = db.ref(`artPieces/${artId}`);
        const snapshot = await artRef.child('votes').once('value');
        const currentVotes = snapshot.val() || 0;

        await artRef.update({
            votes: currentVotes + 1
        });

        // Track that user voted
        votedArt.add(artId);

        // Update button UI
        btn.textContent = '✓ Voted';
        btn.style.opacity = '0.6';

    } catch (error) {
        console.error('Vote error:', error);
        btn.disabled = false;
        alert('Error voting. Please try again.');
    }
}

// ============================
// Admin Functions
// ============================
async function resetAllVotes() {
    if (!confirm('Are you sure you want to reset all votes? This action cannot be undone.')) {
        return;
    }

    try {
        // Reset all vote counts in database
        const updates = {};
        Object.keys(artPieces).forEach(artId => {
            updates[`artPieces/${artId}/votes`] = 0;
        });

        if (Object.keys(updates).length > 0) {
            await db.ref().update(updates);
        }

        // Clear local voted art tracking
        votedArt.clear();
        localStorage.removeItem('votedArt');

        alert('✅ All votes have been reset!');
    } catch (error) {
        console.error('Reset votes error:', error);
        alert('❌ Error resetting votes: ' + error.message);
    }
}

async function deleteAllArt() {
    if (!confirm('⚠️ Are you sure? This will permanently delete ALL art pieces and images from storage. This cannot be undone!')) {
        return;
    }

    if (!confirm('This is your FINAL WARNING. All art pieces will be deleted. Are you absolutely sure?')) {
        return;
    }

    try {
        const artIds = Object.keys(artPieces);

        if (artIds.length === 0) {
            alert('No art pieces to delete.');
            return;
        }

        // Delete from storage and database
        for (const artId of artIds) {
            try {
                // Delete image from storage
                const storageRef = storage.ref(`art-images/${artId}`);
                await storageRef.delete();
            } catch (storageError) {
                // File might not exist, continue
                console.log(`Storage delete error for ${artId}:`, storageError);
            }

            // Delete from database
            await db.ref(`artPieces/${artId}`).remove();
        }

        // Clear local state
        votedArt.clear();
        localStorage.removeItem('votedArt');

        alert('✅ All art pieces have been deleted!');
    } catch (error) {
        console.error('Delete all art error:', error);
        alert('❌ Error deleting art: ' + error.message);
    }
}

// ============================
// Initialize
// =============================
document.addEventListener('DOMContentLoaded', () => {
    // Load voted art from localStorage
    const savedVotes = localStorage.getItem('votedArt');
    if (savedVotes) {
        votedArt = new Set(JSON.parse(savedVotes));
    }

    // Save voted art to localStorage whenever it changes
    const originalAdd = votedArt.add.bind(votedArt);
    votedArt.add = function(item) {
        originalAdd(item);
        localStorage.setItem('votedArt', JSON.stringify(Array.from(votedArt)));
    };

    // Load art pieces on initial page load
    loadArtPieces();

    console.log('Art Voter app initialized');
});
