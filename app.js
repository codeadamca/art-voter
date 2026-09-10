// Firebase services are initialized in firebase-config.js
// (db, storage, auth are available globally)

// DOM Elements
const homeBtn = document.getElementById('homeBtn');
const uploadBtn = document.getElementById('uploadBtn');
const resetVotesBtn = document.getElementById('resetVotesBtn');
const resetAllBtn = document.getElementById('resetAllBtn');
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
resetVotesBtn.addEventListener('click', resetVotes);
resetAllBtn.addEventListener('click', resetAll);
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

// Load art pieces from Realtime Database
async function loadArtPieces() {
    try {
        const snapshot = await db.ref('artPieces').get();
        const data = snapshot.val();
        
        artPieces = [];
        
        if (data) {
            // Convert object to array and sort by createdAt descending
            Object.keys(data).forEach(key => {
                artPieces.push({
                    id: key,
                    ...data[key]
                });
            });
            
            // Sort by createdAt timestamp (newest first)
            artPieces.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        }

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
            <img src="${art.imageUrl}" alt="${art.name}" class="art-thumbnail">
            <div class="art-info">
                <div class="art-title">${escapeHtml(art.name)}</div>
                <div class="art-votes">👍 ${art.votes || 0} votes</div>
                <button class="btn-vote" data-id="${art.id}">Vote</button>
            </div>
        `;
        
        const img = card.querySelector('.art-thumbnail');
        const voteBtn = card.querySelector('.btn-vote');
        
        // Click image to view full size
        img.addEventListener('click', () => openImageModal(art.imageUrl, art.name));
        img.style.cursor = 'pointer';
        
        // Vote button click handler
        voteBtn.addEventListener('click', () => voteOnArt(art.id));
        
        artGrid.appendChild(card);
    });
}

// Reset all votes to 0
async function resetVotes() {
    if (!confirm('Are you sure you want to reset all votes? This cannot be undone.')) {
        return;
    }

    try {
        showMessage('Resetting votes...', '');
        const snapshot = await db.ref('artPieces').get();
        const data = snapshot.val();
        
        if (data) {
            Object.keys(data).forEach(async (key) => {
                await db.ref(`artPieces/${key}`).update({ votes: 0 });
            });
            
            showMessage('All votes have been reset!', 'success');
            await loadArtPieces();
        } else {
            showMessage('No art pieces to reset', 'error');
        }
    } catch (error) {
        console.error('Error resetting votes:', error);
        showMessage(`Error resetting votes: ${error.message}`, 'error');
    }
}

// Reset all data (votes, arts, and files)
async function resetAll() {
    if (!confirm('⚠️ WARNING: This will DELETE ALL art pieces and files! This cannot be undone. Are you sure?')) {
        return;
    }
    
    if (!confirm('This is your FINAL WARNING. Click OK to permanently delete everything.')) {
        return;
    }

    try {
        showMessage('Deleting all data...', '');
        
        // Delete ALL files from Storage (regardless of database records)
        console.log('Deleting all files from Storage...');
        try {
            const listResult = await storage.ref('art').listAll();
            console.log(`Found ${listResult.items.length} files to delete`);
            
            // Delete each file
            for (const itemRef of listResult.items) {
                try {
                    await itemRef.delete();
                    console.log(`Deleted: ${itemRef.name}`);
                } catch (err) {
                    console.error(`Error deleting file ${itemRef.name}:`, err);
                }
            }
            
            console.log('All files deleted from Storage');
        } catch (storageErr) {
            console.error('Error listing/deleting storage files:', storageErr);
        }
        
        // Delete all art pieces from database
        console.log('Deleting all records from database...');
        await db.ref('artPieces').remove();
        
        showMessage('✓ All data and files deleted successfully!', 'success');
        artPieces = [];
        displayArtPieces();
        
        setTimeout(() => {
            uploadMessage.innerHTML = '';
        }, 2000);
    } catch (error) {
        console.error('Error resetting all:', error);
        showMessage(`Error resetting data: ${error.message}`, 'error');
    }
}

// Vote on art
async function voteOnArt(artId) {
    try {
        const artRef = db.ref(`artPieces/${artId}`);
        const snapshot = await artRef.get();
        const artData = snapshot.val();
        
        if (artData) {
            const newVotes = (artData.votes || 0) + 1;
            await artRef.update({ votes: newVotes });
            
            // Reload to show updated votes
            await loadArtPieces();
        }
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
        console.log('Starting upload for:', fileName);
        const storageRef = storage.ref(`art/${fileName}`);
        
        console.log('Uploading file...');
        const snapshot = await storageRef.put(imageFile);
        console.log('File uploaded, getting download URL...');
        const imageUrl = await snapshot.ref.getDownloadURL();
        console.log('Download URL obtained:', imageUrl);

        // Add art piece to Realtime Database
        console.log('Adding art piece to Realtime Database...');
        console.log('db object:', db);
        console.log('db.ref:', typeof db?.ref);
        
        try {
            const newDocRef = db.ref('artPieces').push();
            console.log('Database reference created:', newDocRef.path);
            
            await newDocRef.set({
                name: name,
                imageUrl: imageUrl,
                votes: 0,
                createdAt: new Date().getTime(),
                updatedAt: new Date().getTime()
            });
            console.log('Art piece added successfully with ID:', newDocRef.key);
        } catch (dbError) {
            console.error('Database error details:', dbError);
            console.error('Error code:', dbError.code);
            console.error('Error message:', dbError.message);
            throw dbError;
        }

        showMessage('Art uploaded successfully!', 'success');
        
        // Reset button state
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
        
        // Reset form and go back to home after delay
        setTimeout(() => {
            console.log('Resetting form and returning to home');
            uploadForm.reset();
            imagePreview.style.display = 'none';
            showHomePage();
        }, 1500);

    } catch (error) {
        console.error('Error uploading art:', error);
        console.error('Error stack:', error.stack);
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

// Image Modal - Show full-size images
const imageModal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const modalClose = document.querySelector('.modal-close');

function openImageModal(imageUrl, imageName) {
    modalImage.src = imageUrl;
    modalImage.alt = imageName;
    imageModal.style.display = 'flex';
}

function closeImageModal() {
    imageModal.style.display = 'none';
}

// Close modal when clicking X button
modalClose.addEventListener('click', closeImageModal);

// Close modal when clicking outside the image
imageModal.addEventListener('click', (e) => {
    if (e.target === imageModal) {
        closeImageModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && imageModal.style.display === 'flex') {
        closeImageModal();
    }
});

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
