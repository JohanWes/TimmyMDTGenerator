// Simplified authentication for Warcraft Logs API

// Storage keys
const STORAGE_TOKEN = 'warcraftlogs_token';
const STORAGE_TOKEN_EXPIRY = 'warcraftlogs_token_expiry';

// Check if we have a valid token
function hasValidToken() {
    const token = localStorage.getItem(STORAGE_TOKEN);
    const expiry = localStorage.getItem(STORAGE_TOKEN_EXPIRY);
    
    if (!token || !expiry) {
        return false;
    }
    
    // Check if token is expired
    const expiryTime = parseInt(expiry, 10);
    const currentTime = Date.now();
    
    return currentTime < expiryTime;
}

// Get the access token
function getAccessToken() {
    if (hasValidToken()) {
        return localStorage.getItem(STORAGE_TOKEN);
    }
    return null;
}

// Get token from server
async function getTokenFromServer() {
    try {
        const response = await fetch('/api/warcraftlogs-token');
        
        if (response.ok) {
            const data = await response.json();
            
            // Store token with expiry
            const expiryTime = data.expires_at ? new Date(data.expires_at).getTime() : (Date.now() + (3600 * 1000));
            localStorage.setItem(STORAGE_TOKEN, data.token);
            localStorage.setItem(STORAGE_TOKEN_EXPIRY, expiryTime.toString());
            
            return true;
        }
    } catch (error) {
        console.error('Error fetching token from server:', error);
    }
    
    return false;
}

// Initialize authentication
async function initializeAuthentication() {
    // If we don't have a valid token, try to get one from the server
    if (!hasValidToken()) {
        await getTokenFromServer();
    }
    
    // Update UI to show authentication status
    const authStatus = document.getElementById('auth-status');
    if (authStatus) {
        if (hasValidToken()) {
            authStatus.textContent = 'Authenticated';
            authStatus.classList.add('authenticated');
        } else {
            authStatus.textContent = 'Authentication Failed';
            authStatus.classList.add('auth-failed');
        }
    }
    
    return hasValidToken();
}

// Initialize authentication on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeAuthentication();
});

// Export functions for use in other modules
window.auth = {
    hasValidToken,
    getAccessToken,
    initializeAuthentication
};
