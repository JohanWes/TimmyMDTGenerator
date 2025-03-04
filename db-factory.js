// Database factory module for Timtommy MDT generator
// This module dynamically loads either the local or shared database implementation
// based on the configuration from the server

// Debug logging function with timestamp
function logDebug(message, isError = false) {
    const timestamp = new Date().toISOString().substr(11, 8); // HH:MM:SS
    const logMethod = isError ? console.error : console.log;
    logMethod(`[${timestamp}] [DBFactory] ${message}`);
}

// Store the original database implementations
let localDb = null;
let sharedDb = null;

// Initialize the database factory
async function initDatabaseFactory() {
    logDebug('Initializing database factory...');
    
    // Define dbMode at function scope so it's accessible throughout the function
    let dbMode;
    
    try {
        // Save the original database implementations
        if (window.db) {
            logDebug('Saving original IndexedDB implementation');
            localDb = { ...window.db };
        } else {
            logDebug('Original IndexedDB implementation not found', true);
        }
        
        // Get the base path from the page URL if it exists
        const currentPath = window.location.pathname;
        const possibleBasePath = currentPath.includes('/logsanalyzer') ? '/logsanalyzer' : '';
        logDebug(`Current page path: ${currentPath}, Possible base path: ${possibleBasePath}`);
        
        // Fetch the database configuration from the server
        const configUrl = `${possibleBasePath}/api/config`;
        logDebug(`Fetching configuration from: ${configUrl}`);
        
        try {
            const response = await fetch(configUrl);
            
            logDebug(`Config API response status: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch configuration: ${response.statusText}`);
            }
            
            const responseText = await response.text();
            logDebug(`Config API raw response: ${responseText}`);
            
            let config;
            try {
                config = JSON.parse(responseText);
                logDebug(`Parsed config: ${JSON.stringify(config)}`);
            } catch (parseError) {
                logDebug(`Error parsing config JSON: ${parseError}`, true);
                throw new Error(`Failed to parse configuration: ${parseError.message}`);
            }
            
            dbMode = config.dbMode || 'shared'; // Default to shared if not specified
            logDebug(`Database mode from config: ${dbMode}`);
            
            // Update the UI to show the current database mode
            updateDatabaseModeIndicator(dbMode);
            
            // Select the appropriate database implementation
            if (dbMode === 'local') {
                logDebug('Using local database implementation (IndexedDB)');
                // The db.js script is already loaded, so window.db should be set
                if (!window.db) {
                    throw new Error('Local database implementation not available');
                }
                return true;
            }
            
            logDebug('Using shared database implementation (Server API)');
        } catch (fetchError) {
            logDebug(`Error fetching config: ${fetchError}`, true);
            
            // Try with a different base path as a fallback
            const fallbackUrl = `/api/config`;
            logDebug(`Trying fallback URL: ${fallbackUrl}`);
            
            const fallbackResponse = await fetch(fallbackUrl);
            logDebug(`Fallback config API response status: ${fallbackResponse.status} ${fallbackResponse.statusText}`);
            
            if (!fallbackResponse.ok) {
                throw new Error(`Failed to fetch configuration from fallback URL: ${fallbackResponse.statusText}`);
            }
            
            const fallbackResponseText = await fallbackResponse.text();
            logDebug(`Fallback config API raw response: ${fallbackResponseText}`);
            
            const config = JSON.parse(fallbackResponseText);
            logDebug(`Parsed fallback config: ${JSON.stringify(config)}`);
            
            dbMode = config.dbMode || 'shared'; // Default to shared if not specified
            logDebug(`Database mode from fallback config: ${dbMode}`);
        }
        
        // Update the UI to show the current database mode
        updateDatabaseModeIndicator(dbMode);
        
        // Select the appropriate database implementation
        if (dbMode === 'local') {
            logDebug('Using local database implementation (IndexedDB)');
            // The db.js script is already loaded, so window.db should be set
            if (!window.db) {
                throw new Error('Local database implementation not available');
            }
        } else {
            logDebug('Using shared database implementation (Server API)');
            // Override window.db with the shared implementation
            // This assumes db-client.js has been loaded and has set up its functions on window
            
            // Temporarily store the local implementation
            const tempLocalDb = window.db;
            
            // Create a new object for the shared implementation
            window.db = {};
            
            // Define all the required functions for the shared implementation
            window.db.initDB = async function() {
                logDebug('Initializing server database connection...');
                
                try {
                    // Get the base path from the page URL if it exists
                    const currentPath = window.location.pathname;
                    const basePath = currentPath.includes('/logsanalyzer') ? '/logsanalyzer' : '';
                    logDebug(`Using base path for API requests: ${basePath}`);
                    
                    // Store the base path for future API requests
                    window.db.basePath = basePath;
                    
                    // Test connection by fetching spells
                    const spellsUrl = `${basePath}/api/spells`;
                    logDebug(`Testing connection with: ${spellsUrl}`);
                    
                    const response = await fetch(spellsUrl);
                    logDebug(`Spells API response status: ${response.status} ${response.statusText}`);
                    
                    if (!response.ok) {
                        throw new Error(`Failed to connect to server database: ${response.statusText}`);
                    }
                    
                    logDebug('Server database connection successful');
                    return true;
                } catch (error) {
                    logDebug(`Error initializing server database: ${error}`, true);
                    throw error;
                }
            };
            
            window.db.isDatabaseAvailable = function() {
                return true; // Assume the server is available
            };
            
            window.db.ensureConnection = async function() {
                return true; // For the server API, we don't need to maintain a persistent connection
            };
            
            window.db.addSpellID = async function(spellID, spellName = '') {
                logDebug(`Adding spell ID: ${spellID}, Name: ${spellName}`);
                
                try {
                    const basePath = window.db.basePath || '';
                    const url = `${basePath}/api/spells`;
                    logDebug(`POST request to: ${url}`);
                    
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ id: spellID, name: spellName })
                    });
                    
                    logDebug(`Add spell API response status: ${response.status} ${response.statusText}`);
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to add spell ID');
                    }
                    
                    return true;
                } catch (error) {
                    logDebug(`Error adding spell ID: ${error}`, true);
                    throw error;
                }
            };
            
            window.db.setClassNameMapping = async function(className, playerName) {
                logDebug(`Setting class name mapping: ${className} -> ${playerName}`);
                
                try {
                    const basePath = window.db.basePath || '';
                    const url = `${basePath}/api/class-mappings`;
                    logDebug(`POST request to: ${url}`);
                    
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ className, playerName })
                    });
                    
                    logDebug(`Class mapping API response status: ${response.status} ${response.statusText}`);
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to set class name mapping');
                    }
                    
                    return true;
                } catch (error) {
                    logDebug(`Error setting class name mapping: ${error}`, true);
                    throw error;
                }
            };
            
            window.db.removeSpellID = async function(spellID) {
                logDebug(`Removing spell ID: ${spellID}`);
                
                try {
                    const basePath = window.db.basePath || '';
                    const url = `${basePath}/api/spells/${spellID}`;
                    logDebug(`DELETE request to: ${url}`);
                    
                    const response = await fetch(url, {
                        method: 'DELETE'
                    });
                    
                    logDebug(`Remove spell API response status: ${response.status} ${response.statusText}`);
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to remove spell ID');
                    }
                    
                    return true;
                } catch (error) {
                    logDebug(`Error removing spell ID: ${error}`, true);
                    throw error;
                }
            };
            
            window.db.removeClassNameMapping = async function(className) {
                logDebug(`Removing class name mapping: ${className}`);
                
                try {
                    const basePath = window.db.basePath || '';
                    const url = `${basePath}/api/class-mappings/${className}`;
                    logDebug(`DELETE request to: ${url}`);
                    
                    const response = await fetch(url, {
                        method: 'DELETE'
                    });
                    
                    logDebug(`Remove class mapping API response status: ${response.status} ${response.statusText}`);
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to remove class name mapping');
                    }
                    
                    return true;
                } catch (error) {
                    logDebug(`Error removing class name mapping: ${error}`, true);
                    throw error;
                }
            };
            
            window.db.getAllSpellIDs = async function() {
                logDebug('Getting all spell IDs');
                
                try {
                    const spellEntries = await window.db.getAllSpellEntries();
                    return spellEntries.map(entry => entry.id);
                } catch (error) {
                    logDebug(`Error getting all spell IDs: ${error}`, true);
                    throw error;
                }
            };
            
            window.db.getAllClassNameMappings = async function() {
                logDebug('Getting all class name mappings');
                
                try {
                    const basePath = window.db.basePath || '';
                    const url = `${basePath}/api/class-mappings`;
                    logDebug(`GET request to: ${url}`);
                    
                    const response = await fetch(url);
                    
                    logDebug(`Get class mappings API response status: ${response.status} ${response.statusText}`);
                    
                    if (!response.ok) {
                        throw new Error(`Failed to get class name mappings: ${response.statusText}`);
                    }
                    
                    const responseText = await response.text();
                    logDebug(`Class mappings API raw response: ${responseText}`);
                    
                    try {
                        const mappings = JSON.parse(responseText);
                        logDebug(`Parsed ${mappings.length} class mappings`);
                        return mappings;
                    } catch (parseError) {
                        logDebug(`Error parsing class mappings JSON: ${parseError}`, true);
                        throw new Error(`Failed to parse class mappings: ${parseError.message}`);
                    }
                } catch (error) {
                    logDebug(`Error getting class name mappings: ${error}`, true);
                    throw error;
                }
            };
            
            window.db.getClassNameMapping = async function(className) {
                logDebug(`Getting class name mapping for: ${className}`);
                
                try {
                    const mappings = await window.db.getAllClassNameMappings();
                    const mapping = mappings.find(m => m.className === className);
                    return mapping ? mapping.playerName : null;
                } catch (error) {
                    logDebug(`Error getting class name mapping: ${error}`, true);
                    throw error;
                }
            };
            
            window.db.getAllSpellEntries = async function() {
                logDebug('Getting all spell entries');
                
                try {
                    const basePath = window.db.basePath || '';
                    const url = `${basePath}/api/spells`;
                    logDebug(`GET request to: ${url}`);
                    
                    const response = await fetch(url);
                    
                    logDebug(`Get spell entries API response status: ${response.status} ${response.statusText}`);
                    
                    if (!response.ok) {
                        throw new Error(`Failed to get spell entries: ${response.statusText}`);
                    }
                    
                    const responseText = await response.text();
                    logDebug(`Spell entries API raw response: ${responseText}`);
                    
                    try {
                        const spells = JSON.parse(responseText);
                        logDebug(`Parsed ${spells.length} spell entries`);
                        return spells;
                    } catch (parseError) {
                        logDebug(`Error parsing spell entries JSON: ${parseError}`, true);
                        throw new Error(`Failed to parse spell entries: ${parseError.message}`);
                    }
                } catch (error) {
                    logDebug(`Error getting spell entries: ${error}`, true);
                    throw error;
                }
            };
            
            window.db.getSpellNameById = async function(spellID) {
                logDebug(`Getting spell name for ID: ${spellID}`);
                
                try {
                    const spellEntries = await window.db.getAllSpellEntries();
                    const spell = spellEntries.find(entry => entry.id === spellID);
                    return spell ? spell.name : '';
                } catch (error) {
                    logDebug(`Error getting spell name: ${error}`, true);
                    throw error;
                }
            };
            
            window.db.clearAllSpellIDs = async function() {
                logDebug('Clearing all spell IDs');
                
                try {
                    const basePath = window.db.basePath || '';
                    const url = `${basePath}/api/spells`;
                    logDebug(`DELETE request to: ${url}`);
                    
                    const response = await fetch(url, {
                        method: 'DELETE'
                    });
                    
                    logDebug(`Clear all spells API response status: ${response.status} ${response.statusText}`);
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to clear spell IDs');
                    }
                    
                    return true;
                } catch (error) {
                    logDebug(`Error clearing spell IDs: ${error}`, true);
                    throw error;
                }
            };
            
            window.db.clearAllClassNameMappings = async function() {
                logDebug('Clearing all class name mappings');
                
                try {
                    const basePath = window.db.basePath || '';
                    const url = `${basePath}/api/class-mappings`;
                    logDebug(`DELETE request to: ${url}`);
                    
                    const response = await fetch(url, {
                        method: 'DELETE'
                    });
                    
                    logDebug(`Clear all class mappings API response status: ${response.status} ${response.statusText}`);
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to clear class name mappings');
                    }
                    
                    return true;
                } catch (error) {
                    logDebug(`Error clearing class name mappings: ${error}`, true);
                    throw error;
                }
            };
            
            window.db.backupToLocalStorage = async function() {
                logDebug('Backup to localStorage not needed in server version');
                return true;
            };
            
            window.db.restoreFromLocalStorage = async function() {
                logDebug('Restore from localStorage not needed in server version');
                return false;
            };
            
            window.db.deleteDatabase = async function() {
                logDebug('Delete database not applicable in server version');
                return true;
            };
            
            window.db.closeConnection = function() {
                logDebug('Close connection not needed in server version');
                return Promise.resolve();
            };
            
            // Store the shared implementation
            sharedDb = { ...window.db };
            
            // Restore the local implementation for now
            window.db = tempLocalDb;
            
            // Now set it to the shared implementation
            window.db = sharedDb;
        }
        
        // Verify that the database interface is available
        if (!window.db) {
            throw new Error('Database interface not available after initialization');
        }
        
        logDebug('Database factory initialized successfully');
        return true;
    } catch (error) {
        logDebug(`Error initializing database factory: ${error}`, true);
        
        // Fallback to local database if there's an error
        logDebug('Falling back to local database implementation', true);
        if (localDb) {
            window.db = localDb;
            updateDatabaseModeIndicator('local (fallback)');
            return true;
        } else {
            logDebug('No local database implementation available for fallback', true);
            throw error;
        }
    }
}

// Update the UI to show the current database mode
function updateDatabaseModeIndicator(mode) {
    // Create or update the database mode indicator
    let modeIndicator = document.getElementById('db-mode-indicator');
    
    if (!modeIndicator) {
        // Create the indicator if it doesn't exist
        modeIndicator = document.createElement('div');
        modeIndicator.id = 'db-mode-indicator';
        modeIndicator.className = 'db-mode-indicator';
        
        // Find the database status element to insert after
        const dbStatus = document.getElementById('db-status');
        if (dbStatus && dbStatus.parentElement) {
            dbStatus.parentElement.appendChild(modeIndicator);
        } else {
            // Fallback: add to the filter section
            const filterSection = document.querySelector('.filter-section');
            if (filterSection) {
                filterSection.appendChild(modeIndicator);
            } else {
                // Last resort: add to body
                document.body.appendChild(modeIndicator);
            }
        }
    }
    
    // Set the text and style based on the mode
    modeIndicator.textContent = `Database Mode: ${mode}`;
    modeIndicator.className = `db-mode-indicator ${mode === 'local' ? 'local-mode' : 'shared-mode'}`;
}

// Initialize the database factory when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        logDebug('DOM content loaded, initializing database factory');
        await initDatabaseFactory();
    } catch (error) {
        console.error('Failed to initialize database:', error);
        logDebug(`Database initialization failed: ${error}`, true);
        
        // Show error in the UI
        const dbStatus = document.getElementById('db-status');
        if (dbStatus) {
            dbStatus.textContent = 'Database initialization failed';
            dbStatus.className = 'disconnected';
        }
        
        // No emergency fallback needed since we're using pre-loaded scripts
        logDebug('No emergency fallback available');
    }
});
