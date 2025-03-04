// Database for spell ID filtering and class name mappings
const DB_NAME = 'WarcraftLogsFilterDB';
const DB_VERSION = 1; // Reset to version 1 to force a clean initialization
const SPELL_STORE_NAME = 'spellIDs';
const CLASS_STORE_NAME = 'classNameMappings';

let db;
let dbInitializationAttempts = 0;
const MAX_INITIALIZATION_ATTEMPTS = 3;

// Debug logging function with timestamp
function logDebug(message, isError = false) {
    const timestamp = new Date().toISOString().substr(11, 8); // HH:MM:SS
    const logMethod = isError ? console.error : console.log;
    logMethod(`[${timestamp}] [IndexedDB] ${message}`);
}

// Test if IndexedDB is available and working
function testIndexedDBSupport() {
    return new Promise((resolve, reject) => {
        logDebug('Testing IndexedDB support...');
        
        if (!window.indexedDB) {
            logDebug('IndexedDB not supported by this browser!', true);
            reject(new Error('IndexedDB not supported'));
            return;
        }
        
        try {
            // Try to open a test database
            const testDbName = 'TestIndexedDBSupport';
            const request = indexedDB.open(testDbName, 1);
            
            request.onerror = (event) => {
                logDebug(`IndexedDB test failed: ${event.target.error}`, true);
                reject(event.target.error);
            };
            
            request.onsuccess = (event) => {
                logDebug('IndexedDB test successful');
                // Clean up the test database
                event.target.result.close();
                indexedDB.deleteDatabase(testDbName);
                resolve(true);
            };
            
            request.onupgradeneeded = (event) => {
                logDebug('IndexedDB test upgrade needed (this is normal for first run)');
                const db = event.target.result;
                db.createObjectStore('test', { keyPath: 'id' });
            };
        } catch (error) {
            logDebug(`Error testing IndexedDB: ${error}`, true);
            reject(error);
        }
    });
}

// Delete the database to start fresh
function deleteDatabase() {
    return new Promise((resolve, reject) => {
        logDebug(`Attempting to delete database: ${DB_NAME}`);
        
        try {
            // Close the current connection if it exists
            if (db) {
                db.close();
                db = null;
            }
            
            const request = indexedDB.deleteDatabase(DB_NAME);
            
            request.onerror = (event) => {
                logDebug(`Error deleting database: ${event.target.error}`, true);
                reject(event.target.error);
            };
            
            request.onsuccess = () => {
                logDebug('Database deleted successfully');
                resolve(true);
            };
            
            request.onblocked = () => {
                logDebug('Database deletion blocked - connections still open', true);
                // Try to proceed anyway
                resolve(false);
            };
        } catch (error) {
            logDebug(`Error in deleteDatabase: ${error}`, true);
            reject(error);
        }
    });
}

// Initialize the database with timeout and retry logic
function initDB() {
    return new Promise(async (resolve, reject) => {
        logDebug(`Initializing database (attempt ${++dbInitializationAttempts}/${MAX_INITIALIZATION_ATTEMPTS})`);
        
        // Test IndexedDB support first
        try {
            await testIndexedDBSupport();
        } catch (error) {
            logDebug('IndexedDB support test failed, falling back to localStorage only', true);
            reject(error);
            return;
        }
        
        // Set a timeout to prevent hanging
        const timeoutId = setTimeout(() => {
            logDebug('Database initialization timed out after 5 seconds', true);
            if (dbInitializationAttempts < MAX_INITIALIZATION_ATTEMPTS) {
                logDebug('Will retry initialization');
                // Retry initialization
                clearTimeout(timeoutId);
                initDB().then(resolve).catch(reject);
            } else {
                reject(new Error('Database initialization timed out after multiple attempts'));
            }
        }, 5000);
        
        try {
            logDebug(`Opening IndexedDB database: ${DB_NAME}, version: ${DB_VERSION}`);
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            // Handle database errors
            request.onerror = (event) => {
                clearTimeout(timeoutId);
                const error = event.target.error || new Error('Unknown database error');
                logDebug(`Database open error: ${error.name} - ${error.message}`, true);
                
                // Check for specific error types
                if (error.name === 'VersionError') {
                    logDebug('Version error detected, attempting to delete database and retry');
                    deleteDatabase().then(() => {
                        if (dbInitializationAttempts < MAX_INITIALIZATION_ATTEMPTS) {
                            initDB().then(resolve).catch(reject);
                        } else {
                            reject(error);
                        }
                    }).catch(reject);
                    return;
                }
                
                reject(error);
            };
            
            // Handle database blocked (may occur if another connection is still open)
            request.onblocked = (event) => {
                clearTimeout(timeoutId);
                logDebug('Database open blocked. Close other connections and try again.', true);
                reject(new Error('Database connection blocked'));
            };
            
            // Handle successful database open
            request.onsuccess = (event) => {
                clearTimeout(timeoutId);
                logDebug('Database opened successfully');
                db = event.target.result;
                
                // Add error handler for database connection
                db.onerror = (event) => {
                    logDebug(`Database error: ${event.target.error}`, true);
                };
                
                // Reset attempt counter on success
                dbInitializationAttempts = 0;
                
                resolve(db);
            };
            
            // Handle database upgrade
            request.onupgradeneeded = (event) => {
                logDebug(`Database upgrade needed. Old version: ${event.oldVersion}, New version: ${DB_VERSION}`);
                const db = event.target.result;
                const oldVersion = event.oldVersion;
                
                try {
                    // Create object store for spell IDs
                    if (!db.objectStoreNames.contains(SPELL_STORE_NAME)) {
                        logDebug(`Creating object store: ${SPELL_STORE_NAME}`);
                        db.createObjectStore(SPELL_STORE_NAME, { keyPath: 'id' });
                    }
                    
                    // Create object store for class name mappings
                    if (!db.objectStoreNames.contains(CLASS_STORE_NAME)) {
                        logDebug(`Creating object store: ${CLASS_STORE_NAME}`);
                        db.createObjectStore(CLASS_STORE_NAME, { keyPath: 'className' });
                    }
                    
                    logDebug('Database schema setup complete');
                } catch (error) {
                    logDebug(`Error during database upgrade: ${error}`, true);
                    // We don't reject here as onupgradeneeded errors will trigger onerror
                }
            };
        } catch (error) {
            clearTimeout(timeoutId);
            logDebug(`Error initializing database: ${error}`, true);
            reject(error);
        }
    });
}

// Check if the database is available
function isDatabaseAvailable() {
    return !!db;
}

// Attempt reconnection if the database connection is lost
async function ensureConnection() {
    if (!isDatabaseAvailable()) {
        console.log('Database connection not available, attempting to connect...');
        try {
            await initDB();
            if (isDatabaseAvailable()) {
                console.log('Successfully reconnected to database');
                return true;
            } else {
                console.error('Database connection still not available after initDB');
                return false;
            }
        } catch (error) {
            console.error('Failed to connect to database:', error);
            return false;
        }
    }
    return true;
}

// Add a spell ID to the filter
async function addSpellID(spellID, spellName = '') {
    if (!(await ensureConnection())) {
        throw new Error('Database connection unavailable');
    }
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([SPELL_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(SPELL_STORE_NAME);
        
        const request = store.put({ id: spellID, name: spellName });
        
        request.onsuccess = () => {
            resolve(true);
        };
        
        request.onerror = (event) => {
            reject('Error adding spell ID: ' + event.target.errorCode);
        };
    });
}

// Add or update a class name mapping
async function setClassNameMapping(className, playerName) {
    if (!(await ensureConnection())) {
        throw new Error('Database connection unavailable');
    }
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([CLASS_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(CLASS_STORE_NAME);
        
        const request = store.put({ className, playerName });
        
        request.onsuccess = () => {
            resolve(true);
        };
        
        request.onerror = (event) => {
            reject('Error setting class name mapping: ' + event.target.errorCode);
        };
    });
}

// Remove a spell ID from the filter
async function removeSpellID(spellID) {
    if (!(await ensureConnection())) {
        throw new Error('Database connection unavailable');
    }
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([SPELL_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(SPELL_STORE_NAME);
        
        const request = store.delete(spellID);
        
        request.onsuccess = () => {
            resolve(true);
        };
        
        request.onerror = (event) => {
            reject('Error removing spell ID: ' + event.target.errorCode);
        };
    });
}

// Remove a class name mapping
async function removeClassNameMapping(className) {
    if (!(await ensureConnection())) {
        throw new Error('Database connection unavailable');
    }
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([CLASS_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(CLASS_STORE_NAME);
        
        const request = store.delete(className);
        
        request.onsuccess = () => {
            resolve(true);
        };
        
        request.onerror = (event) => {
            reject('Error removing class name mapping: ' + event.target.errorCode);
        };
    });
}

// Get all spell IDs in the filter
async function getAllSpellIDs() {
    if (!(await ensureConnection())) {
        throw new Error('Database connection unavailable');
    }
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([SPELL_STORE_NAME], 'readonly');
        const store = transaction.objectStore(SPELL_STORE_NAME);
        
        const request = store.getAll();
        
        request.onsuccess = (event) => {
            resolve(event.target.result.map(item => item.id));
        };
        
        request.onerror = (event) => {
            reject('Error getting spell IDs: ' + event.target.errorCode);
        };
    });
}

// Get all class name mappings
async function getAllClassNameMappings() {
    if (!(await ensureConnection())) {
        throw new Error('Database connection unavailable');
    }
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([CLASS_STORE_NAME], 'readonly');
        const store = transaction.objectStore(CLASS_STORE_NAME);
        
        const request = store.getAll();
        
        request.onsuccess = (event) => {
            resolve(event.target.result);
        };
        
        request.onerror = (event) => {
            reject('Error getting class name mappings: ' + event.target.errorCode);
        };
    });
}

// Get a specific class name mapping
async function getClassNameMapping(className) {
    if (!(await ensureConnection())) {
        throw new Error('Database connection unavailable');
    }
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([CLASS_STORE_NAME], 'readonly');
        const store = transaction.objectStore(CLASS_STORE_NAME);
        
        const request = store.get(className);
        
        request.onsuccess = (event) => {
            const result = event.target.result;
            resolve(result ? result.playerName : null);
        };
        
        request.onerror = (event) => {
            reject('Error getting class name mapping: ' + event.target.errorCode);
        };
    });
}

// Get all spell entries (ID and name) in the filter
async function getAllSpellEntries() {
    if (!(await ensureConnection())) {
        throw new Error('Database connection unavailable');
    }
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([SPELL_STORE_NAME], 'readonly');
        const store = transaction.objectStore(SPELL_STORE_NAME);
        
        const request = store.getAll();
        
        request.onsuccess = (event) => {
            resolve(event.target.result);
        };
        
        request.onerror = (event) => {
            reject('Error getting spell entries: ' + event.target.errorCode);
        };
    });
}

// Get a spell name by ID
async function getSpellNameById(spellID) {
    if (!(await ensureConnection())) {
        throw new Error('Database connection unavailable');
    }
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([SPELL_STORE_NAME], 'readonly');
        const store = transaction.objectStore(SPELL_STORE_NAME);
        
        const request = store.get(spellID);
        
        request.onsuccess = (event) => {
            const result = event.target.result;
            resolve(result ? result.name : '');
        };
        
        request.onerror = (event) => {
            reject('Error getting spell name: ' + event.target.errorCode);
        };
    });
}

// Clear all spell IDs from the filter
async function clearAllSpellIDs() {
    if (!(await ensureConnection())) {
        throw new Error('Database connection unavailable');
    }
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([SPELL_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(SPELL_STORE_NAME);
        
        const request = store.clear();
        
        request.onsuccess = () => {
            resolve(true);
        };
        
        request.onerror = (event) => {
            reject('Error clearing spell IDs: ' + event.target.errorCode);
        };
    });
}

// Clear all class name mappings
async function clearAllClassNameMappings() {
    if (!(await ensureConnection())) {
        throw new Error('Database connection unavailable');
    }
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([CLASS_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(CLASS_STORE_NAME);
        
        const request = store.clear();
        
        request.onsuccess = () => {
            resolve(true);
        };
        
        request.onerror = (event) => {
            reject('Error clearing class name mappings: ' + event.target.errorCode);
        };
    });
}

// Export spell entries to localStorage as a backup
async function backupToLocalStorage() {
    try {
        const spellEntries = await getAllSpellEntries();
        localStorage.setItem('warcraftlogs_spell_ids_backup', JSON.stringify(spellEntries));
        
        // Also backup class name mappings
        const classNameMappings = await getAllClassNameMappings();
        localStorage.setItem('warcraftlogs_class_mappings_backup', JSON.stringify(classNameMappings));
        
        return true;
    } catch (error) {
        console.error('Error backing up data:', error);
        return false;
    }
}

// Import spell entries from localStorage backup
async function restoreFromLocalStorage() {
    try {
        let restored = false;
        
        // Restore spell IDs
        const spellBackup = localStorage.getItem('warcraftlogs_spell_ids_backup');
        if (spellBackup) {
            const spellEntries = JSON.parse(spellBackup);
            
            // Clear existing entries first
            await clearAllSpellIDs();
            
            // Add each entry from the backup
            for (const entry of spellEntries) {
                // Handle both old format (just ID) and new format (ID and name)
                if (typeof entry === 'object' && entry.id) {
                    await addSpellID(entry.id, entry.name || '');
                } else if (typeof entry === 'string' || typeof entry === 'number') {
                    // Old format backup
                    await addSpellID(entry, '');
                }
            }
            
            restored = true;
        }
        
        // Restore class name mappings
        const classMappingsBackup = localStorage.getItem('warcraftlogs_class_mappings_backup');
        if (classMappingsBackup) {
            const classMappings = JSON.parse(classMappingsBackup);
            
            // Clear existing mappings first
            await clearAllClassNameMappings();
            
            // Add each mapping from the backup
            for (const mapping of classMappings) {
                if (mapping.className && mapping.playerName) {
                    await setClassNameMapping(mapping.className, mapping.playerName);
                }
            }
            
            restored = true;
        }
        
        return restored;
    } catch (error) {
        console.error('Error restoring data from backup:', error);
        return false;
    }
}

// Close the database connection
function closeConnection() {
    return new Promise((resolve) => {
        if (db) {
            logDebug('Closing database connection');
            db.close();
            db = null;
            logDebug('Database connection closed');
        } else {
            logDebug('No database connection to close');
        }
        resolve();
    });
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
