/**
 * MRT to Viserio Converter
 * 
 * This module converts MRT notes to Viserio Base64 encoded format.
 * It implements the same functionality as the Python script but in JavaScript.
 */

const msgpack = require('msgpack-lite');

// Regular expressions for parsing MRT notes
const TIMESTAMP_PATTERN = /\{time:(\d+:\d+)\}(\d+:\d+)/;
const PLAYER_SPELL_PATTERN = /([A-Za-zÀ-ÖØ-öø-ÿ]+)\s+\{spell:(\d+)\}/g;

// Spell information database
const spellInfo = {
    // Priest
    '64843': {
        name: 'Divine Hymn',
        wowheadLink: 'https://www.wowhead.com/beta/spell=64843/divine-hymn',
        iconLink: '/viserio-cooldowns/images/priest/64843.jpg',
        playerSpellType: 'Major cds',
        spec: 'Holy',
        duration: 23,
        class: 'Priest'
    },
    '200183': {
        name: 'Apotheosis',
        wowheadLink: 'https://www.wowhead.com/spell=200183/apotheosis',
        iconLink: '/viserio-cooldowns/images/priest/200183.jpg',
        playerSpellType: 'Major cds',
        spec: 'Holy',
        duration: 20,
        class: 'Priest'
    },
    '120517': {
        name: 'Halo',
        wowheadLink: 'https://www.wowhead.com/spell=120517/halo',
        iconLink: '/viserio-cooldowns/images/priest/120517.jpg',
        playerSpellType: 'Minor cds',
        spec: 'Discipline',
        duration: 0,
        class: 'Priest'
    },
    '372760': {
        name: 'Divine Word',
        wowheadLink: 'https://www.wowhead.com/spell=372760/divine-word',
        iconLink: '/viserio-cooldowns/images/priest/372760.jpg',
        playerSpellType: 'Minor cds',
        spec: 'Holy',
        duration: 10,
        class: 'Priest'
    },
    '64901': {
        name: 'Symbol of Hope',
        wowheadLink: 'https://www.wowhead.com/spell=64901/symbol-of-hope',
        iconLink: '/viserio-cooldowns/images/priest/64901.jpg',
        playerSpellType: 'Minor cds',
        spec: 'Holy',
        duration: 4,
        class: 'Priest'
    },
    '724': {
        name: 'Lightwell',
        wowheadLink: 'https://www.wowhead.com/spell=724/lightwell',
        iconLink: '/viserio-cooldowns/images/priest/724.jpg',
        playerSpellType: 'Minor cds',
        spec: 'Holy',
        duration: 180,
        class: 'Priest'
    },
    '209780': {
        name: 'Evangelism',
        wowheadLink: 'https://www.wowhead.com/spell=209780/evangelism',
        iconLink: '/viserio-cooldowns/images/priest/209780.jpg',
        playerSpellType: 'Major cds',
        spec: 'Discipline',
        duration: 0,
        class: 'Priest'
    },
    '246287': {
        name: 'Evangelism',
        wowheadLink: 'https://www.wowhead.com/spell=246287/evangelism',
        iconLink: '/viserio-cooldowns/images/priest/246287.jpg',
        playerSpellType: 'Major cds',
        spec: 'Discipline',
        duration: 0,
        class: 'Priest'
    },
    
    // Druid
    '740': {
        name: 'Tranquility',
        wowheadLink: 'https://www.wowhead.com/spell=740/tranquility',
        iconLink: '/viserio-cooldowns/images/druid/740.jpg',
        playerSpellType: 'Major cds',
        spec: 'Restoration',
        duration: 8,
        class: 'Druid'
    },
    '33891': {
        name: 'Incarnation: Tree of Life',
        wowheadLink: 'https://www.wowhead.com/spell=33891/incarnation-tree-of-life',
        iconLink: '/viserio-cooldowns/images/druid/33891.jpg',
        playerSpellType: 'Major cds',
        spec: 'Restoration',
        duration: 30,
        class: 'Druid'
    },
    '197721': {
        name: 'Flourish',
        wowheadLink: 'https://www.wowhead.com/spell=197721/flourish',
        iconLink: '/viserio-cooldowns/images/druid/197721.jpg',
        playerSpellType: 'Minor cds',
        spec: 'Restoration',
        duration: 8,
        class: 'Druid'
    },
    '323764': {
        name: 'Convoke the Spirits',
        wowheadLink: 'https://www.wowhead.com/spell=323764/convoke-the-spirits',
        iconLink: '/viserio-cooldowns/images/druid/323764.jpg',
        playerSpellType: 'Minor cds',
        spec: 'Restoration',
        duration: 4,
        class: 'Druid'
    },
    
    // Monk
    '115310': {
        name: 'Revival',
        wowheadLink: 'https://www.wowhead.com/spell=115310/revival',
        iconLink: '/viserio-cooldowns/images/monk/115310.jpg',
        playerSpellType: 'Major cds',
        spec: 'Mistweaver',
        duration: 0,
        class: 'Monk'
    },
    '336874': {
        name: 'Invoke Chi-Ji, the Red Crane',
        wowheadLink: 'https://www.wowhead.com/spell=336874/invoke-chi-ji-the-red-crane',
        iconLink: '/viserio-cooldowns/images/monk/336874.jpg',
        playerSpellType: 'Major cds',
        spec: 'Mistweaver',
        duration: 25,
        class: 'Monk'
    },
    '322118': {
        name: 'Invoke Yulon, the Jade Serpent',
        wowheadLink: 'https://www.wowhead.com/spell=322118/invoke-yulon-the-jade-serpent',
        iconLink: '/viserio-cooldowns/images/monk/322118.jpg',
        playerSpellType: 'Major cds',
        spec: 'Mistweaver',
        duration: 25,
        class: 'Monk'
    },
    '325197': {
        name: 'Invoke Chi-Ji, the Red Crane',
        wowheadLink: 'https://www.wowhead.com/spell=325197/invoke-chi-ji-the-red-crane',
        iconLink: '/viserio-cooldowns/images/monk/325197.jpg',
        playerSpellType: 'Major cds',
        spec: 'Mistweaver',
        duration: 25,
        class: 'Monk'
    },
    '205406': {
        name: 'Sheilun\'s Gift',
        wowheadLink: 'https://www.wowhead.com/spell=205406/sheiluns-gift',
        iconLink: '/viserio-cooldowns/images/monk/205406.jpg',
        playerSpellType: 'Minor cds',
        spec: 'Mistweaver',
        duration: 0,
        class: 'Monk'
    },
    
    // Paladin
    '31821': {
        name: 'Aura Mastery',
        wowheadLink: 'https://www.wowhead.com/spell=31821/aura-mastery',
        iconLink: '/viserio-cooldowns/images/paladin/31821.jpg',
        playerSpellType: 'Group DR',
        spec: 'Holy',
        duration: 8,
        class: 'Paladin'
    },
    '114165': {
        name: 'Holy Prism',
        wowheadLink: 'https://www.wowhead.com/spell=114165/holy-prism',
        iconLink: '/viserio-cooldowns/images/paladin/114165.jpg',
        playerSpellType: 'Minor cds',
        spec: 'Holy',
        duration: 0,
        class: 'Paladin'
    },
    '31884': {
        name: 'Avenging Wrath',
        wowheadLink: 'https://www.wowhead.com/spell=31884/avenging-wrath',
        iconLink: '/viserio-cooldowns/images/paladin/31884.jpg',
        playerSpellType: 'Major cds',
        spec: 'Holy',
        duration: 20,
        class: 'Paladin'
    },
    '216331': {
        name: 'Avenging Crusader',
        wowheadLink: 'https://www.wowhead.com/spell=216331/avenging-crusader',
        iconLink: '/viserio-cooldowns/images/paladin/216331.jpg',
        playerSpellType: 'Minor cds',
        spec: 'Holy',
        duration: 12,
        class: 'Paladin'
    },
    '304971': {
        name: 'Divine Toll',
        wowheadLink: 'https://www.wowhead.com/spell=304971/divine-toll',
        iconLink: '/viserio-cooldowns/images/paladin/304971.jpg',
        playerSpellType: 'Minor cds',
        spec: 'Holy',
        duration: 0,
        class: 'Paladin'
    },
    '200025': {
        name: 'Beacon of Virtue',
        wowheadLink: 'https://www.wowhead.com/spell=200025/beacon-of-virtue',
        iconLink: '/viserio-cooldowns/images/paladin/200025.jpg',
        playerSpellType: 'Minor cds',
        spec: 'Holy',
        duration: 8,
        class: 'Paladin'
    },
    
    // Shaman
    '108280': {
        name: 'Healing Tide Totem',
        wowheadLink: 'https://www.wowhead.com/spell=108280/healing-tide-totem',
        iconLink: '/viserio-cooldowns/images/shaman/108280.jpg',
        playerSpellType: 'Major cds',
        spec: 'Restoration',
        duration: 10,
        class: 'Shaman'
    },
    '98008': {
        name: 'Spirit Link Totem',
        wowheadLink: 'https://www.wowhead.com/spell=98008/spirit-link-totem',
        iconLink: '/viserio-cooldowns/images/shaman/98008.jpg',
        playerSpellType: 'Group DR',
        spec: 'Restoration',
        duration: 6,
        class: 'Shaman'
    },
    '207399': {
        name: 'Ancestral Protection Totem',
        wowheadLink: 'https://www.wowhead.com/spell=207399/ancestral-protection-totem',
        iconLink: '/viserio-cooldowns/images/shaman/207399.jpg',
        playerSpellType: 'Group DR',
        spec: 'Restoration',
        duration: 30,
        class: 'Shaman'
    },
    '114052': {
        name: 'Ascendance',
        wowheadLink: 'https://www.wowhead.com/spell=114052/ascendance',
        iconLink: '/viserio-cooldowns/images/shaman/114052.jpg',
        playerSpellType: 'Major cds',
        spec: 'Restoration',
        duration: 15,
        class: 'Shaman'
    },
    // Add the correct Viserio spell ID for Ascendance
    '114049': {
        name: 'Ascendance',
        wowheadLink: 'https://www.wowhead.com/spell=114049/ascendance',
        iconLink: '/viserio-cooldowns/images/shaman/114049.jpg',
        playerSpellType: 'Major cds',
        spec: 'Restoration',
        duration: 15,
        class: 'Shaman'
    },
    
    // Warrior
    '97462': {
        name: 'Rallying Cry',
        wowheadLink: 'https://www.wowhead.com/spell=97462/rallying-cry',
        iconLink: '/viserio-cooldowns/images/warrior/97462.jpg',
        playerSpellType: 'Major cds',
        spec: 'Protection',
        duration: 10,
        class: 'Warrior'
    },
    
    // Demon Hunter
    '196718': {
        name: 'Darkness',
        wowheadLink: 'https://www.wowhead.com/spell=196718/darkness',
        iconLink: '/viserio-cooldowns/images/demonhunter/196718.jpg',
        playerSpellType: 'Major cds',
        spec: 'Vengeance',
        duration: 8,
        class: 'Demon Hunter'
    },
    
    // Death Knight
    '51052': {
        name: 'Anti-Magic Zone',
        wowheadLink: 'https://www.wowhead.com/beta/spell=51052/anti-magic-zone',
        iconLink: '/viserio-cooldowns/images/deathknight/51052.jpg',
        playerSpellType: 'Group DR',
        spec: 'Blood',
        duration: 8,
        class: 'Death Knight'
    },
    
    // Evoker
    '363534': {
        name: 'Rewind',
        wowheadLink: 'https://www.wowhead.com/beta/spell=363534/rewind',
        iconLink: '/viserio-cooldowns/images/evoker/363534.jpg',
        playerSpellType: 'Major cds',
        spec: 'Preservation',
        duration: 5,
        class: 'Evoker'
    },
    '359816': {
        name: 'Dream Flight',
        wowheadLink: 'https://www.wowhead.com/beta/spell=359816/dream-flight',
        iconLink: '/viserio-cooldowns/images/evoker/359816.jpg',
        playerSpellType: 'Major cds',
        spec: 'Preservation',
        duration: 30,
        class: 'Evoker'
    },
    '370537': {
        name: 'Stasis',
        wowheadLink: 'https://www.wowhead.com/beta/spell=370537/stasis',
        iconLink: '/viserio-cooldowns/images/evoker/370537.jpg',
        playerSpellType: 'Minor cds',
        spec: 'Preservation',
        duration: 90,
        class: 'Evoker'
    },
    '370984': {
        name: 'Emerald Communion',
        wowheadLink: 'https://www.wowhead.com/spell=370984/emerald-communion',
        iconLink: '/viserio-cooldowns/images/evoker/370984.jpg',
        playerSpellType: 'Minor cds',
        spec: 'Preservation',
        duration: 5,
        class: 'Evoker'
    },
    '374227': {
        name: 'Zephyr',
        wowheadLink: 'https://www.wowhead.com/spell=374227/zephyr',
        iconLink: '/viserio-cooldowns/images/evoker/374227.jpg',
        playerSpellType: 'Group DR',
        spec: 'Augmentation',
        duration: 8,
        class: 'Evoker'
    }
};

/**
 * Parse MRT notes and extract log entries
 * @param {string} mrtNotes - The MRT notes to parse
 * @returns {Array} - Array of log entries
 */
function parseMrtNotes(mrtNotes) {
    const logEntries = [];
    const lines = mrtNotes.trim().split('\n');
    
    for (const line of lines) {
        const timestampMatch = line.match(TIMESTAMP_PATTERN);
        if (!timestampMatch) continue;
        
        const timestamp = timestampMatch[2]; // Use the second timestamp (after the curly braces)
        const timestampSeconds = convertTimeToSeconds(timestamp);
        
        // Find all player-spell pairs in the line
        const playerSpellMatches = [...line.matchAll(PLAYER_SPELL_PATTERN)];
        
        for (const match of playerSpellMatches) {
            const playerName = match[1];
            const spellId = match[2];
            
            logEntries.push({
                timestamp,
                playerName,
                spellId,
                timestampSeconds
            });
        }
    }
    
    return logEntries.sort((a, b) => a.timestampSeconds - b.timestampSeconds);
}

/**
 * Convert time string (MM:SS) to seconds
 * @param {string} timeString - Time string in MM:SS format
 * @returns {number} - Time in seconds
 */
function convertTimeToSeconds(timeString) {
    const [minutes, seconds] = timeString.split(':').map(Number);
    return minutes * 60 + seconds;
}

/**
 * Map log entries to Viserio's data structure
 * @param {Array} logEntries - Array of log entries
 * @returns {Array} - Mapped data in Viserio's format
 */
function mapToViserio(logEntries) {
    // Group entries by player
    const playerMap = {};
    
    for (const entry of logEntries) {
        const { playerName, spellId, timestamp, timestampSeconds } = entry;
        
        // Handle special case for Ascendance spell ID
        let actualSpellId = spellId;
        if (spellId === '114052') {
            console.log(`Mapping Ascendance spell ID 114052 to 114049 for player ${playerName}`);
            actualSpellId = '114049'; // Map Ascendance to the correct Viserio spell ID
        }
        
        // Get spell info - first try the mapped ID, then the original ID
        let spell = spellInfo[actualSpellId];
        
        // If spell info is not found, log it and skip this entry
        if (!spell) {
            console.log(`Spell info not found for spell ID ${actualSpellId} (original: ${spellId}) for player ${playerName}`);
            continue;
        }
        
        // Log successful spell mapping
        console.log(`Processing spell: ${spell.name} (ID: ${actualSpellId}) for player ${playerName}`);
        
        // Initialize player if not exists
        if (!playerMap[playerName]) {
            playerMap[playerName] = {
                name: playerName,
                playerClass: spell.class,
                playerSpec: spell.spec,
                spells: [],
                notes: []
            };
        }
        
        // Add spell to player
        playerMap[playerName].spells.push({
            spell: {
                spellId: parseInt(actualSpellId),
                spellName: spell.name,
                wowheadLink: spell.wowheadLink,
                iconLink: spell.iconLink,
                note: '',
                checks: {},
                cooldown: 180, // Default cooldown
                duration: spell.duration
            },
            playerSpellType: spell.playerSpellType,
            guid: generateGuid(),
            startTime: timestampSeconds,
            actor: playerName,
            spec: spell.spec,
            notes: []
        });
    }
    
    // Convert map to array and log the result
    const result = Object.values(playerMap);
    console.log(`Mapped ${result.length} players with their spells`);
    return result;
}

/**
 * Generate a GUID
 * @returns {string} - A GUID
 */
function generateGuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Encode mapped data to Viserio's format
 * @param {Array} mappedData - Mapped data in Viserio's format
 * @returns {string} - Base64 encoded MessagePack data
 */
function encodeToViserio(mappedData) {
    // Convert the data to MessagePack format
    const packedData = msgpack.encode(mappedData);
    
    // Encode the MessagePack data as Base64
    return packedData.toString('base64');
}

/**
 * Convert MRT notes to Viserio Base64 encoded format
 * @param {string} mrtNotes - The MRT notes to convert
 * @returns {string} - The Viserio Base64 encoded format
 */
function convertMrtToViserio(mrtNotes) {
    // Parse the MRT notes
    const logEntries = parseMrtNotes(mrtNotes);
    
    if (logEntries.length === 0) {
        throw new Error('No valid log entries found in the MRT notes');
    }
    
    // Map the data to Viserio's structure
    const mappedData = mapToViserio(logEntries);
    
    // Encode the data to Viserio's format
    return encodeToViserio(mappedData);
}

module.exports = {
    convertMrtToViserio
};
