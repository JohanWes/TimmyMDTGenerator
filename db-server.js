// Server-side database for shared spell ID filtering and class name mappings
const fs = require('fs');
const path = require('path');

// Database file paths
const SPELL_DB_FILE = path.join(__dirname, 'data', 'spells.json');
const CLASS_MAPPING_DB_FILE = path.join(__dirname, 'data', 'class-mappings.json');

// Ensure data directory exists
function ensureDataDirectory() {
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
}

// Initialize database files if they don't exist
function initDatabaseFiles() {
    ensureDataDirectory();
    
    // Initialize spells database if it doesn't exist
    if (!fs.existsSync(SPELL_DB_FILE)) {
        fs.writeFileSync(SPELL_DB_FILE, JSON.stringify([], null, 2));
    }
    
    // Initialize class mappings database if it doesn't exist
    if (!fs.existsSync(CLASS_MAPPING_DB_FILE)) {
        fs.writeFileSync(CLASS_MAPPING_DB_FILE, JSON.stringify([], null, 2));
    }
}

// Read spells from database
function getAllSpells() {
    try {
        const data = fs.readFileSync(SPELL_DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading spells database:', error);
        return [];
    }
}

// Write spells to database
function saveAllSpells(spells) {
    try {
        fs.writeFileSync(SPELL_DB_FILE, JSON.stringify(spells, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing to spells database:', error);
        return false;
    }
}

// Add a spell to the database
function addSpell(spellId, spellName = '') {
    const spells = getAllSpells();
    
    // Check if spell already exists
    const existingIndex = spells.findIndex(spell => spell.id === spellId);
    
    if (existingIndex >= 0) {
        // Update existing spell
        spells[existingIndex].name = spellName;
    } else {
        // Add new spell
        spells.push({ id: spellId, name: spellName });
    }
    
    return saveAllSpells(spells);
}

// Remove a spell from the database
function removeSpell(spellId) {
    const spells = getAllSpells();
    const filteredSpells = spells.filter(spell => spell.id !== spellId);
    
    if (filteredSpells.length < spells.length) {
        return saveAllSpells(filteredSpells);
    }
    
    return false; // Spell not found
}

// Clear all spells
function clearAllSpells() {
    return saveAllSpells([]);
}

// Read class mappings from database
function getAllClassMappings() {
    try {
        const data = fs.readFileSync(CLASS_MAPPING_DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading class mappings database:', error);
        return [];
    }
}

// Write class mappings to database
function saveAllClassMappings(mappings) {
    try {
        fs.writeFileSync(CLASS_MAPPING_DB_FILE, JSON.stringify(mappings, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing to class mappings database:', error);
        return false;
    }
}

// Add or update a class mapping
function setClassMapping(className, playerName) {
    const mappings = getAllClassMappings();
    
    // Check if mapping already exists
    const existingIndex = mappings.findIndex(mapping => mapping.className === className);
    
    if (existingIndex >= 0) {
        // Update existing mapping
        mappings[existingIndex].playerName = playerName;
    } else {
        // Add new mapping
        mappings.push({ className, playerName });
    }
    
    return saveAllClassMappings(mappings);
}

// Remove a class mapping
function removeClassMapping(className) {
    const mappings = getAllClassMappings();
    const filteredMappings = mappings.filter(mapping => mapping.className !== className);
    
    if (filteredMappings.length < mappings.length) {
        return saveAllClassMappings(filteredMappings);
    }
    
    return false; // Mapping not found
}

// Clear all class mappings
function clearAllClassMappings() {
    return saveAllClassMappings([]);
}

// Initialize database on module load
initDatabaseFiles();

module.exports = {
    // Spell functions
    getAllSpells,
    addSpell,
    removeSpell,
    clearAllSpells,
    
    // Class mapping functions
    getAllClassMappings,
    setClassMapping,
    removeClassMapping,
    clearAllClassMappings
};
