// API functionality for Warcraft Logs

// API endpoint for Warcraft Logs
const API_ENDPOINT = 'https://www.warcraftlogs.com/api/v2/client';

// Instructions for getting a token
const TOKEN_INSTRUCTIONS = `
To get a Warcraft Logs API token:
1. Go to https://www.warcraftlogs.com/
2. Log in to your account
3. Go to https://www.warcraftlogs.com/profile
4. Click on "API Clients" in the left menu
5. Create a new client if you don't have one
6. Copy the client ID and client secret
7. Use a tool like Postman or curl to get a token:
   curl -u {client_id}:{client_secret} -d grant_type=client_credentials https://www.warcraftlogs.com/oauth/token
8. Copy the access_token value from the response
`;

// Parse a Warcraft Logs URL to extract report code and fight ID
function parseWarcraftLogsUrl(url) {
    try {
        const urlObj = new URL(url);
        
        // Extract report code from path
        const pathMatch = urlObj.pathname.match(/\/reports\/([a-zA-Z0-9]+)/);
        const reportCode = pathMatch ? pathMatch[1] : null;
        
        // Extract fight ID from hash or search params
        let fightId = null;
        
        // Check hash for fight ID (e.g., #fight=3)
        if (urlObj.hash) {
            const hashMatch = urlObj.hash.match(/fight=(\d+)/);
            if (hashMatch) {
                fightId = parseInt(hashMatch[1], 10);
            }
        }
        
        // If not in hash, check search params
        if (!fightId && urlObj.searchParams.has('fight')) {
            fightId = parseInt(urlObj.searchParams.get('fight'), 10);
        }
        
        return {
            reportCode,
            fightId
        };
    } catch (error) {
        console.error('Error parsing URL:', error);
        return { reportCode: null, fightId: null };
    }
}

// Fetch report fights to get a list of available fights
async function fetchReportFights(reportCode) {
    const accessToken = window.auth.getAccessToken();
    
    if (!accessToken) {
        throw new Error('Authentication required');
    }
    
    const query = `
    query {
      reportData {
        report(code: "${reportCode}") {
          fights {
            id
            name
            startTime
            endTime
            encounterID
          }
        }
      }
    }`;
    
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ query })
        });
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.errors) {
            throw new Error(data.errors[0].message);
        }
        
        return data.data.reportData.report.fights;
    } catch (error) {
        console.error('Error fetching fights:', error);
        throw error;
    }
}

// Fetch cast data for a specific fight
async function fetchCastData(reportCode, fightId) {
    const accessToken = window.auth.getAccessToken();
    
    if (!accessToken) {
        throw new Error('Authentication required');
    }
    
    // First, get the fight details to get start/end times
    const fights = await fetchReportFights(reportCode);
    const fight = fights.find(f => f.id === fightId);
    
    if (!fight) {
        throw new Error(`Fight with ID ${fightId} not found`);
    }
    
    // Array to store all events from all pages
    let allEvents = [];
    // Start time for the next page (initially null)
    let nextPageTimestamp = null;
    // Flag to track if we're done fetching all pages
    let hasMorePages = true;
    // Counter to prevent infinite loops (just in case)
    let pageCount = 0;
    const MAX_PAGES = 10; // Reasonable limit to prevent excessive API calls
    
    // Variables to store report info from the first page
    let reportTitle, fightInfo, reportStartTime;
    
    // Fetch all pages of events
    while (hasMorePages && pageCount < MAX_PAGES) {
        // Construct the query with the appropriate startTime
        const startTimeParam = nextPageTimestamp || fight.startTime;
        
        const query = `
        query {
          reportData {
            report(code: "${reportCode}") {
              title
              startTime
              endTime
              fights(fightIDs: [${fightId}]) {
                id
                name
                startTime
                endTime
              }
              events(
                fightIDs: [${fightId}]
                dataType: Casts
                limit: 5000
                startTime: ${startTimeParam}
                endTime: ${fight.endTime}
              ) {
                data
                nextPageTimestamp
              }
            }
          }
        }`;
        
        try {
            console.log(`Fetching page ${pageCount + 1} of cast data...`);
            
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({ query })
            });
            
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.errors) {
                throw new Error(data.errors[0].message);
            }
            
            // If this is the first page, store the report info
            if (pageCount === 0) {
                reportTitle = data.data.reportData.report.title;
                fightInfo = data.data.reportData.report.fights[0];
                reportStartTime = data.data.reportData.report.startTime;
            }
            
            // Add events from this page to our collection
            const pageEvents = data.data.reportData.report.events.data || [];
            allEvents = [...allEvents, ...pageEvents];
            
            console.log(`Fetched ${pageEvents.length} events from page ${pageCount + 1}`);
            
            // Check if there are more pages
            nextPageTimestamp = data.data.reportData.report.events.nextPageTimestamp;
            hasMorePages = !!nextPageTimestamp;
            
            // Increment page counter
            pageCount++;
            
        } catch (error) {
            console.error('Error fetching cast data page:', error);
            throw error;
        }
    }
    
    console.log(`Finished fetching ${pageCount} pages with a total of ${allEvents.length} events`);
    
    // Return the combined data
    return {
        reportTitle: reportTitle,
        fight: fightInfo,
        reportStartTime: reportStartTime,
        castEvents: allEvents,
        hasMoreEvents: hasMorePages, // True if we hit the MAX_PAGES limit
        pagesRetrieved: pageCount
    };
}

// Format cast data for display
async function formatCastData(data) {
    if (!data || !data.castEvents || !data.castEvents.length) {
        return 'No cast data available';
    }
    
    try {
        const { reportTitle, fight, reportStartTime, castEvents, hasMoreEvents, pagesRetrieved } = data;
        
        // Start with report and fight info
        let formattedData = `Report: ${reportTitle}\n`;
        formattedData += `Fight: ${fight.name} (${formatTime(fight.endTime - fight.startTime)})\n`;
        
        // Add pagination info if available
        if (pagesRetrieved) {
            formattedData += `Data retrieved from ${pagesRetrieved} page${pagesRetrieved > 1 ? 's' : ''}\n`;
        }
        
        // Get filter settings
        const filterEnabled = document.getElementById('filter-enabled').checked;
        let filteredEvents = castEvents;
        
        if (filterEnabled) {
            // Get spell IDs from the filter
            const filterSpellIDs = await window.db.getAllSpellIDs();
            
            // Filter events based on spell IDs
            filteredEvents = castEvents.filter(event => {
                const spellId = event.abilityGameID || 0;
                return filterSpellIDs.includes(spellId.toString());
            });
            
            formattedData += `Total Events: ${filteredEvents.length} (filtered from ${castEvents.length})\n\n`;
        } else {
            formattedData += `Total Events: ${castEvents.length}${hasMoreEvents ? ' (maximum page limit reached, more events may be available)' : ''}\n\n`;
        }
        
        // Process individual cast events
        if (filteredEvents && filteredEvents.length > 0) {
            // Sort events by timestamp
            const sortedEvents = [...filteredEvents].sort((a, b) => a.timestamp - b.timestamp);
            
            // Get all spell entries for lookup
            const spellEntries = await window.db.getAllSpellEntries();
            const spellNameMap = {};
            spellEntries.forEach(entry => {
                if (entry.name) {
                    spellNameMap[entry.id] = entry.name;
                }
            });
            
            // Format each event
            for (const event of sortedEvents) {
                // Calculate time into the fight
                const timeIntoFight = event.timestamp - fight.startTime;
                const formattedTime = formatTime(timeIntoFight);
                
                // Get spell info
                const spellId = event.abilityGameID || 'Unknown';
                
                // Use our custom spell name if available, otherwise use the API-provided name
                let spellName;
                if (spellNameMap[spellId]) {
                    spellName = spellNameMap[spellId];
                } else {
                    spellName = event.ability ? event.ability.name : 'Unknown';
                }
                
                // Format the line
                formattedData += `Time(${formattedTime}) SpellID(${spellId}) Spell(${spellName})\n`;
            }
            
            if (hasMoreEvents && !filterEnabled) {
                formattedData += '\n(Note: Maximum page limit reached, more events may be available.)';
            }
        } else {
            formattedData += 'No cast events found for this fight.';
        }
        
        return formattedData;
    } catch (error) {
        console.error('Error formatting cast data:', error);
        return `Error formatting data: ${error.message}`;
    }
}

// Helper function to format time in MM:SS format
function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Export functions for use in other modules
window.api = {
    parseWarcraftLogsUrl,
    fetchReportFights,
    fetchCastData,
    formatCastData,
    TOKEN_INSTRUCTIONS
};
