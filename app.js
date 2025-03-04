// Main application logic for Timtommy MDT generator

document.addEventListener('DOMContentLoaded', async () => {
    // Get DOM elements
    const logUrlInput = document.getElementById('log-url');
    const fetchButton = document.getElementById('fetch-button');
    const resultsTextarea = document.getElementById('results');
    const authStatus = document.getElementById('auth-status');
    const dbStatus = document.getElementById('db-status');
    const resultsPopup = document.getElementById('results-popup');
    const popupResults = document.getElementById('popup-results');
    const closePopupBtn = document.querySelector('.close-popup');
    
    // Popup functions
    function showPopup(content) {
        popupResults.innerHTML = content;
        resultsPopup.classList.add('active');
    }
    
    function hidePopup() {
        resultsPopup.classList.remove('active');
        // Wait for the transition to complete before removing content
        setTimeout(() => {
            if (!resultsPopup.classList.contains('active')) {
                popupResults.innerHTML = '';
            }
        }, 300);
    }
    
    // Close popup when clicking the close button
    closePopupBtn.addEventListener('click', hidePopup);
    
    // Close popup when clicking outside the popup content
    resultsPopup.addEventListener('click', (event) => {
        if (event.target === resultsPopup) {
            hidePopup();
        }
    });
    
    // Create a reset database button
    const dbStatusContainer = dbStatus.parentElement;
    const resetDbButton = document.createElement('button');
    resetDbButton.id = 'reset-db-button';
    resetDbButton.textContent = 'Reset Database';
    resetDbButton.style.display = 'none'; // Hide initially
    resetDbButton.className = 'reset-db-button';
    dbStatusContainer.appendChild(resetDbButton);
    
    // Add event listener for reset button
    resetDbButton.addEventListener('click', async () => {
        if (confirm('Are you sure you want to reset the database? This will delete all your spell IDs and class mappings.')) {
            try {
                updateDatabaseStatus('Resetting database...', false);
                resetDbButton.disabled = true;
                
                // Delete the database
                if (typeof indexedDB.deleteDatabase === 'function') {
                    // Close any existing connections
                    if (window.db && typeof window.db.closeConnection === 'function') {
                        await window.db.closeConnection();
                    }
                    
                    // Delete the database
                    const deleteRequest = indexedDB.deleteDatabase('WarcraftLogsFilterDB');
                    
                    deleteRequest.onsuccess = async () => {
                        console.log('Database deleted successfully');
                        // Reload the page to reinitialize everything
                        window.location.reload();
                    };
                    
                    deleteRequest.onerror = (event) => {
                        console.error('Error deleting database:', event.target.error);
                        updateDatabaseStatus('Reset failed: ' + event.target.error.message, false);
                        resetDbButton.disabled = false;
                    };
                } else {
                    // Fallback if deleteDatabase is not available
                    console.log('deleteDatabase not available, reloading page');
                    window.location.reload();
                }
            } catch (error) {
                console.error('Error resetting database:', error);
                updateDatabaseStatus('Reset failed: ' + (error.message || 'Unknown error'), false);
                resetDbButton.disabled = false;
            }
        }
    });
    
    // Initialize the database with detailed status updates
    updateDatabaseStatus('Initializing...', false);
    let dbInitialized = false;
    
    try {
        console.log('Starting database initialization...');
        
        // Show reset button if initialization takes too long
        const initTimeout = setTimeout(() => {
            resetDbButton.style.display = 'block';
            updateDatabaseStatus('Initialization taking longer than expected. Try resetting the database.', false);
        }, 3000);
        
        await window.db.initDB();
        clearTimeout(initTimeout);
        
        console.log('Database initialized successfully');
        updateDatabaseStatus('Connected', true);
        dbInitialized = true;
        resetDbButton.style.display = 'none';
    } catch (error) {
        console.error('Error initializing database:', error);
        updateDatabaseStatus('Error: ' + (error.message || 'Unknown error'), false);
        resetDbButton.style.display = 'block';
    }
    
    // If database initialization failed, try to restore from backup
    if (!dbInitialized) {
        try {
            console.log('Attempting to restore from backup...');
            const restored = await window.db.restoreFromLocalStorage();
            if (restored) {
                console.log('Successfully restored data from backup');
                updateDatabaseStatus('Restored from backup', true);
                dbInitialized = true;
                resetDbButton.style.display = 'none';
            } else {
                console.log('No backup found or restoration failed');
                updateDatabaseStatus('Initialization failed', false);
                resetDbButton.style.display = 'block';
            }
        } catch (error) {
            console.error('Error restoring from backup:', error);
            updateDatabaseStatus('Backup restoration failed', false);
            resetDbButton.style.display = 'block';
        }
    }
    
    // Ensure database status is updated
    if (!dbInitialized) {
        console.warn('Database initialization and backup restoration both failed');
        updateDatabaseStatus('Database unavailable - try resetting', false);
        resetDbButton.style.display = 'block';
    }
    
    // Initialize UI components
    initFilterUI();
    initClassMappingUI();
    
    // Display initial instructions
    resultsTextarea.value = 'Welcome to Timtommy MDT generator!\n\n' +
        '1. Enter a Warcraft Logs report URL in the input field\n' +
        '2. Click "Generate MDT" to retrieve cast information and generate MDT note\n\n' +
        'Example URL: https://www.warcraftlogs.com/reports/AbCdEfGh1234#fight=3';
    
    // Add event listener for fetch button
    fetchButton.addEventListener('click', async () => {
        // Clear previous results
        resultsTextarea.value = 'Generating MDT...';
        
        try {
            // Check if authenticated
            if (!window.auth.hasValidToken()) {
                // Try to get a token from the server
                const gotToken = await window.auth.initializeAuthentication();
                
                if (!gotToken) {
                    const errorMessage = 'Authentication failed. Please contact the administrator.';
                    resultsTextarea.value = errorMessage;
                    
                    // Show error in popup
                    showPopup(`<span class="popup-error">${errorMessage}</span>`);
                    
                    // Set a timer to automatically close the popup after 5 seconds
                    setTimeout(hidePopup, 5000);
                    return;
                }
            }
            
            // Get URL from input
            const url = logUrlInput.value.trim();
            if (!url) {
                const errorMessage = 'Please enter a Warcraft Logs URL.';
                resultsTextarea.value = errorMessage;
                
                // Show error in popup
                showPopup(`<span class="popup-error">${errorMessage}</span>`);
                
                // Set a timer to automatically close the popup after 5 seconds
                setTimeout(hidePopup, 5000);
                return;
            }
            
            // Parse URL to get report code and fight ID
            const { reportCode, fightId } = window.api.parseWarcraftLogsUrl(url);
            
            if (!reportCode) {
                const errorMessage = 'Invalid Warcraft Logs URL. Please enter a valid report URL.\n\n' +
                    'Example URL formats:\n' +
                    '- https://www.warcraftlogs.com/reports/AbCdEfGh1234\n' +
                    '- https://www.warcraftlogs.com/reports/AbCdEfGh1234#fight=3';
                
                resultsTextarea.value = errorMessage;
                
                // Show error in popup
                showPopup(`<span class="popup-error">${errorMessage}</span>`);
                
                // Set a timer to automatically close the popup after 5 seconds
                setTimeout(hidePopup, 5000);
                return;
            }
            
            // Show loading message with report code
            const loadingMessage = `Fetching data for report ${reportCode}...\n` +
                (fightId ? `Fight ID: ${fightId}\nThis may take a moment if there are multiple pages of data...` : 'No fight ID specified, will list available fights');
            
            resultsTextarea.value = loadingMessage;
            
            // Show popup with loading message
            showPopup(`<span class="popup-progress">${loadingMessage}</span>`);
            
            // If no fight ID specified, fetch fights and show them
            if (!fightId) {
                try {
                    const fights = await window.api.fetchReportFights(reportCode);
                    
                    let fightList = `Report Code: ${reportCode}\n\n`;
                    fightList += 'Available Fights:\n';
                    fightList += '------------------------\n';
                    
                    if (fights && fights.length > 0) {
                        fights.forEach(fight => {
                            fightList += `ID: ${fight.id} - ${fight.name} (${formatTime(fight.endTime - fight.startTime)})\n`;
                        });
                        
                        fightList += '\nPlease add a fight ID to your URL (e.g., #fight=3) and try again.';
                    } else {
                        fightList += 'No fights found in this report.';
                    }
                    
                    // Update the textarea
                    resultsTextarea.value = fightList;
                    
                    // Show the fight list in the popup
                    showPopup(`<span class="popup-success">${fightList}</span>`);
                    
                    // Set a timer to automatically close the popup after 8 seconds
                    setTimeout(hidePopup, 8000);
                } catch (error) {
                    handleApiError(error);
                }
                return;
            }
            
            // Fetch cast data for the specified fight
            try {
                // Track total events
                let totalEvents = 0;
                let currentPage = 0;
                
                // Set up a progress update function
                const updateProgress = (page, pageEvents, total) => {
                    const progressMessage = `Fetching data for report ${reportCode}...\n` +
                        `Fight ID: ${fightId}\n` +
                        `Retrieving page ${page} of cast data...\n` +
                        `Retrieved ${total} events so far`;
                    
                    // Update the textarea
                    resultsTextarea.value = progressMessage;
                    
                    // Update the popup
                    showPopup(`<span class="popup-progress">${progressMessage}</span>`);
                };
                
                // Add event listener for console logs to update progress
                const originalConsoleLog = console.log;
                console.log = function(message) {
                    originalConsoleLog.apply(console, arguments);
                    
                    // Check if this is a progress message
                    if (typeof message === 'string') {
                        if (message.includes('Fetching page')) {
                            const pageMatch = message.match(/Fetching page (\d+)/);
                            if (pageMatch) {
                                currentPage = parseInt(pageMatch[1], 10);
                                updateProgress(currentPage, 0, totalEvents);
                            }
                        } else if (message.includes('Fetched')) {
                            const eventsMatch = message.match(/Fetched (\d+) events from page (\d+)/);
                            if (eventsMatch) {
                                const pageEvents = parseInt(eventsMatch[1], 10);
                                const page = parseInt(eventsMatch[2], 10);
                                totalEvents += pageEvents;
                                updateProgress(page, pageEvents, totalEvents);
                            }
                        } else if (message.includes('Finished fetching')) {
                            const finalMatch = message.match(/Finished fetching (\d+) pages with a total of (\d+) events/);
                            if (finalMatch) {
                                const pages = parseInt(finalMatch[1], 10);
                                const events = parseInt(finalMatch[2], 10);
                                const completionMessage = `Fetching data for report ${reportCode}...\n` +
                                    `Fight ID: ${fightId}\n` +
                                    `Completed! Retrieved ${events} events from ${pages} pages.\n` +
                                    `Formatting results...`;
                                
                                // Update the textarea
                                resultsTextarea.value = completionMessage;
                                
                                // Update the popup
                                showPopup(`<span class="popup-progress">${completionMessage}</span>`);
                            }
                        }
                    }
                };
                
                try {
                    // Fetch the data
                    const castData = await window.api.fetchCastData(reportCode, fightId);
                    
                    // Format and display the cast data
                    const formattedData = await window.api.formatCastData(castData);
                    resultsTextarea.value = formattedData;
                    
                    // Show the formatted data in the popup
                    showPopup(`<span class="popup-success">${formattedData}</span>`);
                    
                    // Set a timer to automatically close the popup after 8 seconds
                    setTimeout(hidePopup, 8000);
                    
                    // Automatically convert to MDT note
                    await convertToMRTNote();
                } catch (error) {
                    throw error;
                } finally {
                    // Always restore original console.log
                    console.log = originalConsoleLog;
                }
            } catch (error) {
                handleApiError(error);
            }
            
        } catch (error) {
            handleApiError(error);
        }
    });
    
    // Helper function to handle API errors
    function handleApiError(error) {
        console.error('Error:', error);
        
        let errorMessage = `Error: ${error.message}\n\n`;
        
        // Add more helpful information based on error type
        if (error.message.includes('Authentication')) {
            errorMessage += 'Your authentication token may be invalid or expired.\n' +
                'The system will attempt to retrieve a new token automatically.';
            // Try to get a new token
            window.auth.initializeAuthentication();
        } else if (error.message.includes('not found')) {
            errorMessage += 'The specified report or fight could not be found.\n' +
                'Please check the URL and try again.';
        } else if (error.message.includes('API request failed')) {
            errorMessage += 'The Warcraft Logs API returned an error.\n' +
                'This could be due to rate limiting or server issues.\n' +
                'Please try again later.';
        }
        
        // Update the results textarea
        resultsTextarea.value = errorMessage;
        
        // Show error in popup
        showPopup(`<span class="popup-error">${errorMessage}</span>`);
        
        // Set a timer to automatically close the popup after 8 seconds
        setTimeout(hidePopup, 8000);
    }
    
    // Helper function to format time in MM:SS format
    function formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
// Add example URL placeholder
    logUrlInput.placeholder = 'Enter Warcraft Logs URL (e.g., https://www.warcraftlogs.com/reports/AbCdEfGh1234#fight=3)';
});

// Update database status display
function updateDatabaseStatus(status, isConnected) {
    const dbStatus = document.getElementById('db-status');
    if (dbStatus) {
        dbStatus.textContent = status;
        dbStatus.className = isConnected ? 'connected' : 'disconnected';
    }
}

// Initialize filter UI
async function initFilterUI() {
    const addSpellIdButton = document.getElementById('add-spell-id');
    const spellIdInput = document.getElementById('spell-id-input');
    const clearFilterButton = document.getElementById('clear-filter');
    const exportFilterButton = document.getElementById('export-filter');
    const importFilterButton = document.getElementById('import-filter');
    
    // Load existing spell IDs
    await updateSpellIdList();
    
// Add spell ID button
    addSpellIdButton.addEventListener('click', async () => {
        const spellId = spellIdInput.value.trim();
        const spellName = document.getElementById('spell-name-input').value.trim();
        
        if (spellId && /^\d+$/.test(spellId)) {
            await addSpellIdWithBackup(spellId, spellName);
            spellIdInput.value = '';
            document.getElementById('spell-name-input').value = '';
            await updateSpellIdList();
        } else {
            alert('Please enter a valid spell ID (numbers only)');
        }
    });
    
    // Clear filter button
    clearFilterButton.addEventListener('click', async () => {
        if (confirm('Are you sure you want to clear all spell IDs from the filter?')) {
            await clearAllSpellIdsWithBackup();
            await updateSpellIdList();
        }
    });
    
    // Export filter button
    exportFilterButton.addEventListener('click', async () => {
        try {
            const spellEntries = await window.db.getAllSpellEntries();
            const exportData = JSON.stringify(spellEntries);
            
            // Create a temporary textarea to copy the data
            const textarea = document.createElement('textarea');
            textarea.value = exportData;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            
            alert('Filter data copied to clipboard. Save this somewhere to import later:\n\n' + exportData);
        } catch (error) {
            console.error('Error exporting filter:', error);
            alert('Error exporting filter: ' + error.message);
        }
    });
    
    // Import filter button
    importFilterButton.addEventListener('click', async () => {
        try {
            const importData = prompt('Paste the exported filter data:');
            
            if (importData) {
                const importedData = JSON.parse(importData);
                
                if (Array.isArray(importedData)) {
                    // Clear existing entries first
                    await window.db.clearAllSpellIDs();
                    
                    // Add each entry from the import
                    let importCount = 0;
                    for (const entry of importedData) {
                        // Handle both old format (just ID) and new format (ID and name)
                        if (typeof entry === 'object' && entry.id) {
                            await window.db.addSpellID(entry.id, entry.name || '');
                            importCount++;
                        } else if (typeof entry === 'string' || typeof entry === 'number') {
                            // Old format backup
                            await window.db.addSpellID(entry, '');
                            importCount++;
                        }
                    }
                    
                    // Update the UI
                    await updateSpellIdList();
                    
                    alert(`Successfully imported ${importCount} spell entries to the shared database.`);
                } else {
                    alert('Invalid import data. Expected an array of spell entries.');
                }
            }
        } catch (error) {
            console.error('Error importing filter:', error);
            alert('Error importing filter: ' + error.message);
        }
    });
    
// Add keyboard event for spell ID input
    spellIdInput.addEventListener('keypress', async (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            addSpellIdButton.click();
        }
    });
    
    // Add keyboard event for spell name input
    document.getElementById('spell-name-input').addEventListener('keypress', async (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            addSpellIdButton.click();
        }
    });
}

// Initialize class mapping UI
async function initClassMappingUI() {
    const addClassMappingButton = document.getElementById('add-class-mapping');
    const classSelect = document.getElementById('class-select');
    const playerNameInput = document.getElementById('player-name-input');
    const clearMappingsButton = document.getElementById('clear-mappings');
    const exportMappingsButton = document.getElementById('export-mappings');
    const importMappingsButton = document.getElementById('import-mappings');
    
    // Load existing class mappings
    await updateClassMappingList();
    
    // Add/update class mapping button
    addClassMappingButton.addEventListener('click', async () => {
        const className = classSelect.value;
        const playerName = playerNameInput.value.trim();
        
        if (className && playerName) {
            await setClassNameMappingWithBackup(className, playerName);
            playerNameInput.value = '';
            classSelect.selectedIndex = 0;
            await updateClassMappingList();
        } else {
            alert('Please select a class and enter a player name');
        }
    });
    
    // Clear mappings button
    clearMappingsButton.addEventListener('click', async () => {
        if (confirm('Are you sure you want to clear all class name mappings?')) {
            await clearAllClassNameMappingsWithBackup();
            await updateClassMappingList();
        }
    });
    
    // Export mappings button
    exportMappingsButton.addEventListener('click', async () => {
        try {
            const mappings = await window.db.getAllClassNameMappings();
            const exportData = JSON.stringify(mappings);
            
            // Create a temporary textarea to copy the data
            const textarea = document.createElement('textarea');
            textarea.value = exportData;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            
            alert('Class mappings copied to clipboard. Save this somewhere to import later:\n\n' + exportData);
        } catch (error) {
            console.error('Error exporting class mappings:', error);
            alert('Error exporting class mappings: ' + error.message);
        }
    }); 
    
    // Import mappings button
    importMappingsButton.addEventListener('click', async () => {
        try {
            const importData = prompt('Paste the exported class mappings data:');
            
            if (importData) {
                const importedData = JSON.parse(importData);
                
                if (Array.isArray(importedData)) {
                    // Clear existing mappings first
                    await window.db.clearAllClassNameMappings();
                    
                    // Add each mapping from the import
                    let importCount = 0;
                    for (const mapping of importedData) {
                        if (mapping.className && mapping.playerName) {
                            await window.db.setClassNameMapping(mapping.className, mapping.playerName);
                            importCount++;
                        }
                    }
                    
                    // Update the UI
                    await updateClassMappingList();
                    
                    alert(`Successfully imported ${importCount} class mappings to the shared database.`);
                } else {
                    alert('Invalid import data. Expected an array of class mappings.');
                }
            }
        } catch (error) {
            console.error('Error importing class mappings:', error);
            alert('Error importing class mappings: ' + error.message);
        }
    });
    
    // Add keyboard event for player name input
    playerNameInput.addEventListener('keypress', async (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            addClassMappingButton.click();
        }
    });
}

// Update the spell ID list display
async function updateSpellIdList() {
    const spellIdList = document.getElementById('spell-id-list');
    const spellEntries = await window.db.getAllSpellEntries();
    
    // Clear the list
    spellIdList.innerHTML = '';
    
    // Add each spell entry to the list
    spellEntries.forEach(entry => {
        const li = document.createElement('li');
        
        // Create spell info container
        const spellInfo = document.createElement('div');
        spellInfo.className = 'spell-info';
        
        // Add spell ID
        const spellIdElement = document.createElement('span');
        spellIdElement.className = 'spell-id';
        spellIdElement.textContent = `ID: ${entry.id}`;
        spellInfo.appendChild(spellIdElement);
        
        // Add spell name if available
        if (entry.name) {
            const spellNameElement = document.createElement('span');
            spellNameElement.className = 'spell-name';
            spellNameElement.textContent = `Name: ${entry.name}`;
            spellInfo.appendChild(spellNameElement);
        }
        
        li.appendChild(spellInfo);
        
        // Add remove button
        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.className = 'remove-spell-id';
        removeButton.addEventListener('click', async () => {
            await removeSpellIdWithBackup(entry.id);
            await updateSpellIdList();
        });
        
        li.appendChild(removeButton);
        spellIdList.appendChild(li);
    });
}

// Update the class mapping list display
async function updateClassMappingList() {
    const classMappingList = document.getElementById('class-mapping-list');
    const mappings = await window.db.getAllClassNameMappings();
    
    // Clear the list
    classMappingList.innerHTML = '';
    
    // Add each mapping to the list
    mappings.forEach(mapping => {
        const li = document.createElement('li');
        
        // Create mapping info container
        const mappingInfo = document.createElement('div');
        mappingInfo.className = 'mapping-info';
        
        // Add class name
        const classNameElement = document.createElement('span');
        classNameElement.className = 'class-name';
        classNameElement.textContent = mapping.className;
        mappingInfo.appendChild(classNameElement);
        
        // Add player name
        const playerNameElement = document.createElement('span');
        playerNameElement.className = 'player-name';
        playerNameElement.textContent = mapping.playerName;
        mappingInfo.appendChild(playerNameElement);
        
        li.appendChild(mappingInfo);
        
        // Add remove button
        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.className = 'remove-class-mapping';
        removeButton.addEventListener('click', async () => {
            await removeClassNameMappingWithBackup(mapping.className);
            await updateClassMappingList();
        });
        
        li.appendChild(removeButton);
        classMappingList.appendChild(li);
    });
}

// Add spell ID with backup
async function addSpellIdWithBackup(spellId, spellName = '') {
    await window.db.addSpellID(spellId, spellName);
    await window.db.backupToLocalStorage();
}

// Remove spell ID with backup
async function removeSpellIdWithBackup(spellId) {
    await window.db.removeSpellID(spellId);
    await window.db.backupToLocalStorage();
}

// Clear all spell IDs with backup
async function clearAllSpellIdsWithBackup() {
    await window.db.clearAllSpellIDs();
    await window.db.backupToLocalStorage();
}

// Set class name mapping with backup
async function setClassNameMappingWithBackup(className, playerName) {
    await window.db.setClassNameMapping(className, playerName);
    await window.db.backupToLocalStorage();
}

// Remove class name mapping with backup
async function removeClassNameMappingWithBackup(className) {
    await window.db.removeClassNameMapping(className);
    await window.db.backupToLocalStorage();
}

// Clear all class name mappings with backup
async function clearAllClassNameMappingsWithBackup() {
    await window.db.clearAllClassNameMappings();
    await window.db.backupToLocalStorage();
}

// MRT Note Conversion Functions

// Spell ID to Class mapping
const spellIdToClass = {
    // Priest (Discipline/Holy)
    '64843': 'Priest',
    '200183': 'Priest',
    '120517': 'Priest',
    '372760': 'Priest',
    '64901': 'Priest',
    '724': 'Priest',
    '209780': 'Priest',
    
    // Druid (Restoration)
    '740': 'Druid',
    '33891': 'Druid',
    '197721': 'Druid',
    '323764': 'Druid',
    
    // Monk (Mistweaver)
    '115310': 'Monk',
    '336874': 'Monk',
    '322118': 'Monk',
    '325197': 'Monk',
    '205406': 'Monk',
    
    // Paladin (Holy)
    '31821': 'Paladin',
    '114165': 'Paladin',
    '31884': 'Paladin',
    '216331': 'Paladin',
    '304971': 'Paladin',
    '200025': 'Paladin',
    
    // Shaman (Restoration)
    '108280': 'Shaman',
    '98008': 'Shaman',
    '207399': 'Shaman',
    '114052': 'Shaman',
    
    // Warrior
    '97462': 'Warrior',
    
    // Demon Hunter
    '196718': 'Demon Hunter',
    
    // Death Knight
    '51052': 'Death Knight'
};

// Initialize MRT note conversion UI
document.addEventListener('DOMContentLoaded', () => {
    const convertButton = document.getElementById('convert-button');
    const copyButton = document.getElementById('copy-button');
    
    if (convertButton) {
        convertButton.addEventListener('click', convertToMRTNote);
    }
    
    if (copyButton) {
        copyButton.addEventListener('click', copyMRTToClipboard);
    }
});

// Convert cast results to MRT note format
async function convertToMRTNote() {
    // Get content from results textarea
    const resultsContent = document.getElementById('results').value;
    
    // Parse the cast data
    const events = parseResultsContent(resultsContent);
    
    // Group events that occur within 5 seconds
    const groupedEvents = groupEventsByTime(events);
    
    // Format each group into MRT note format
    const mrtNotes = await formatMRTNotes(groupedEvents);
    
    // Display in MRT notes textarea
    document.getElementById('mrt-notes').value = mrtNotes;
}

// Parse the results content into structured events
function parseResultsContent(content) {
    const events = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
        // Match pattern: Time(0:00) SpellID(1122) Spell(Summon infernal)
        const match = line.match(/Time\((\d+:\d+)\) SpellID\((\d+)\) Spell\(([^)]+)\)/);
        if (match) {
            events.push({
                time: match[1],
                spellId: match[2],
                spellName: match[3],
                timeInSeconds: convertTimeToSeconds(match[1])
            });
        }
    }
    
    return events.sort((a, b) => a.timeInSeconds - b.timeInSeconds);
}

// Group events that occur within 5 seconds of each other
function groupEventsByTime(events) {
    const groups = [];
    let currentGroup = [];
    let currentGroupTime = null;
    
    for (const event of events) {
        if (currentGroupTime === null || 
            Math.abs(event.timeInSeconds - currentGroupTime) <= 5) {
            // Add to current group if within 5 seconds
            if (currentGroupTime === null) {
                currentGroupTime = event.timeInSeconds;
            }
            currentGroup.push(event);
        } else {
            // Start a new group
            if (currentGroup.length > 0) {
                groups.push([...currentGroup]);
            }
            currentGroup = [event];
            currentGroupTime = event.timeInSeconds;
        }
    }
    
    // Add the last group if not empty
    if (currentGroup.length > 0) {
        groups.push(currentGroup);
    }
    
    return groups;
}

// Format grouped events into MRT note format
async function formatMRTNotes(groups) {
    let mrtNotes = '';
    
    // Get all class name mappings with error handling
    let mappingLookup = {};
    try {
        if (window.db.isDatabaseAvailable()) {
            console.log('Getting class name mappings from database...');
            const classMappings = await window.db.getAllClassNameMappings();
            console.log(`Retrieved ${classMappings.length} class mappings`);
            
            // Create a lookup object for faster access
            classMappings.forEach(mapping => {
                mappingLookup[mapping.className] = mapping.playerName;
            });
        } else {
            console.warn('Database not available, using default class names');
        }
    } catch (error) {
        console.error('Error getting class mappings:', error);
        // Continue with empty mappings
    }
    
    for (const group of groups) {
        if (group.length === 0) continue;
        
        // Use the time of the first event in the group
        const time = group[0].time;
        
        // Start the line with the time format
        let line = `{time:${time}}${time}`;
        
        // Add each event in the group
        for (const event of group) {
            // Get the class name from the mapping, or use "Unknown" if not found
            const className = spellIdToClass[event.spellId] || 'Unknown';
            
            // Use the player name if a mapping exists, otherwise use the class name
            const displayName = mappingLookup[className] || className;
            
            line += ` - ${displayName} {spell:${event.spellId}}`;
        }
        
        mrtNotes += line + '\n';
    }
    
    return mrtNotes;
}

// Convert time string (MM:SS) to seconds
function convertTimeToSeconds(timeString) {
    const [minutes, seconds] = timeString.split(':').map(Number);
    return minutes * 60 + seconds;
}

// Copy MRT notes to clipboard
function copyMRTToClipboard() {
    const mrtTextarea = document.getElementById('mrt-notes');
    mrtTextarea.select();
    document.execCommand('copy');
    
    // Show feedback that it was copied
    alert('MRT note copied to clipboard!');
}

// Initialize Viserio conversion UI
document.addEventListener('DOMContentLoaded', () => {
    const convertToViserioButton = document.getElementById('convert-to-viserio-button');
    const copyViserioButton = document.getElementById('copy-viserio-button');
    
    if (convertToViserioButton) {
        convertToViserioButton.addEventListener('click', convertToViserio);
    }
    
    if (copyViserioButton) {
        copyViserioButton.addEventListener('click', copyViserioToClipboard);
    }
});

// Convert MRT note to Viserio format
async function convertToViserio() {
    const mrtNotes = document.getElementById('mrt-notes').value;
    const viserioOutput = document.getElementById('viserio-output');
    
    if (!mrtNotes) {
        viserioOutput.value = 'Please generate MRT notes first.';
        return;
    }
    
    viserioOutput.value = 'Converting to Viserio format...';
    
    try {
        // Call the server endpoint to convert MRT to Viserio
        const response = await fetch('/api/convert-to-viserio', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ mrtNotes }),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        viserioOutput.value = data.viserioData;
    } catch (error) {
        console.error('Error converting to Viserio format:', error);
        viserioOutput.value = `Error: ${error.message}`;
    }
}

// Copy Viserio output to clipboard
function copyViserioToClipboard() {
    const viserioOutput = document.getElementById('viserio-output');
    viserioOutput.select();
    document.execCommand('copy');
    
    // Show feedback that it was copied
    alert('Viserio data copied to clipboard!');
}
