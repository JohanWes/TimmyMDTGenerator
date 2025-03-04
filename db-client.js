// Client-side module for interacting with the server database API
// This is a drop-in replacement for the IndexedDB implementation

// Store the base path for API requests
let basePath = '';

// Debug logging function with timestamp
function logDebug(message, isError = false) {
    const timestamp = new Date().toISOString().substr(11, 8); // HH:MM:SS
    const logMethod = isError ? console.error : console.log;
    logMethod(`[${timestamp}] [ServerDB] ${message}`);
}

// Initialize connection to the server
async function initDB() {
    logDebug('Initializing server database connection...');
    
    try {
        // Get the base path from the page URL if it exists
        const currentPath = window.location.pathname;
        basePath = currentPath.includes('/logsanalyzer') ? '/logsanalyzer' : '';
        logDebug(`Using base path for API requests: ${basePath}`);
        
        // Test connection by fetching spells
        await getAllSpellEntries();
        logDebug('Server database connection successful');
        return true;
    } catch (error) {
        logDebug(`Error initializing server database: ${error}`, true);
        throw error;
    }
}

// Check if the database is available
function isDatabaseAvailable() {
    // We'll assume the server is available
    // In a more robust implementation, we could maintain a connection status
    return true;
}

// Ensure connection is available
async function ensureConnection() {
    // For the server API, we don't need to maintain a persistent connection
    return true;
}

// Add a spell ID to the filter
async function addSpellID(spellID, spellName = '') {
    logDebug(`Adding spell ID: ${spellID}, Name: ${spellName}`);
    
    try {
        const response = await fetch(`${basePath}/api/spells`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: spellID, name: spellName })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add spell ID');
        }
        
        return true;
    } catch (error) {
        logDebug(`Error adding spell ID: ${error}`, true);
        throw error;
    }
}

// Add or update a class name mapping
async function setClassNameMapping(className, playerName) {
    logDebug(`Setting class name mapping: ${className} -> ${playerName}`);
    
    try {
        const response = await fetch(`${basePath}/api/class-mappings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ className, playerName })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to set class name mapping');
        }
        
        return true;
    } catch (error) {
        logDebug(`Error setting class name mapping: ${error}`, true);
        throw error;
    }
}

// Remove a spell ID from the filter
async function removeSpellID(spellID) {
    logDebug(`Removing spell ID: ${spellID}`);
    
    try {
        const response = await fetch(`${basePath}/api/spells/${spellID}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to remove spell ID');
        }
        
        return true;
    } catch (error) {
        logDebug(`Error removing spell ID: ${error}`, true);
        throw error;
    }
}

// Remove a class name mapping
async function removeClassNameMapping(className) {
    logDebug(`Removing class name mapping: ${className}`);
    
    try {
        const response = await fetch(`${basePath}/api/class-mappings/${className}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to remove class name mapping');
        }
        
        return true;
    } catch (error) {
        logDebug(`Error removing class name mapping: ${error}`, true);
        throw error;
    }
}

// Get all spell IDs in the filter
async function getAllSpellIDs() {
    logDebug('Getting all spell IDs');
    
    try {
        const spellEntries = await getAllSpellEntries();
        return spellEntries.map(entry => entry.id);
    } catch (error) {
        logDebug(`Error getting all spell IDs: ${error}`, true);
        throw error;
    }
}

// Get all class name mappings
async function getAllClassNameMappings() {
    logDebug('Getting all class name mappings');
    
    try {
        const response = await fetch(`${basePath}/api/class-mappings`);
        
        if (!response.ok) {
            throw new Error(`Failed to get class name mappings: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        logDebug(`Error getting class name mappings: ${error}`, true);
        throw error;
    }
}

// Get a specific class name mapping
async function getClassNameMapping(className) {
    logDebug(`Getting class name mapping for: ${className}`);
    
    try {
        const mappings = await getAllClassNameMappings();
        const mapping = mappings.find(m => m.className === className);
        return mapping ? mapping.playerName : null;
    } catch (error) {
        logDebug(`Error getting class name mapping: ${error}`, true);
        throw error;
    }
}

// Get all spell entries (ID and name) in the filter
async function getAllSpellEntries() {
    logDebug('Getting all spell entries');
    
    try {
        const response = await fetch(`${basePath}/api/spells`);
        
        if (!response.ok) {
            throw new Error(`Failed to get spell entries: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        logDebug(`Error getting spell entries: ${error}`, true);
        throw error;
    }
}

// Get a spell name by ID
async function getSpellNameById(spellID) {
    logDebug(`Getting spell name for ID: ${spellID}`);
    
    try {
        const spellEntries = await getAllSpellEntries();
        const spell = spellEntries.find(entry => entry.id === spellID);
        return spell ? spell.name : '';
    } catch (error) {
        logDebug(`Error getting spell name: ${error}`, true);
        throw error;
    }
}

// Clear all spell IDs from the filter
async function clearAllSpellIDs() {
    logDebug('Clearing all spell IDs');
    
    try {
        const response = await fetch(`${basePath}/api/spells`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to clear spell IDs');
        }
        
        return true;
    } catch (error) {
        logDebug(`Error clearing spell IDs: ${error}`, true);
        throw error;
    }
}

// Clear all class name mappings
async function clearAllClassNameMappings() {
    logDebug('Clearing all class name mappings');
    
    try {
        const response = await fetch(`${basePath}/api/class-mappings`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to clear class name mappings');
        }
        
        return true;
    } catch (error) {
        logDebug(`Error clearing class name mappings: ${error}`, true);
        throw error;
    }
}

// Export spell entries to localStorage as a backup
// This is kept for compatibility but doesn't do anything in the server version
async function backupToLocalStorage() {
    logDebug('Backup to localStorage not needed in server version');
    return true;
}

// Import spell entries from localStorage backup
// This is kept for compatibility but doesn't do anything in the server version
async function restoreFromLocalStorage() {
    logDebug('Restore from localStorage not needed in server version');
    return false;
}

// Delete the database
// This is kept for compatibility but doesn't do anything in the server version
async function deleteDatabase() {
    logDebug('Delete database not applicable in server version');
    return true;
}

// Close the database connection
// This is kept for compatibility but doesn't do anything in the server version
function closeConnection() {
    logDebug('Close connection not needed in server version');
    return Promise.resolve();
}

// Export functions for use in other modules
window.db = {
    initDB,
    addSpellID,
    removeSpellID,
    getAllSpellIDs,
    getAllSpellEntries,
    getSpellNameById,
    clearAllSpellIDs,
    backupToLocalStorage,
    restoreFromLocalStorage,
    ensureConnection,
    isDatabaseAvailable,
    deleteDatabase,
    closeConnection,
    // Class name mapping functions
    setClassNameMapping,
    removeClassNameMapping,
    getAllClassNameMappings,
    getClassNameMapping,
    clearAllClassNameMappings
};
