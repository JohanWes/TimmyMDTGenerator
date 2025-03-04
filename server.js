// Express server with API endpoints for the Timtommy MDT generator
// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const app = express();
const dbServer = require('./db-server');
const path = require('path');
const fs = require('fs');
const { convertMrtToViserio } = require('./mrt-to-viserio');

// Get port and IP from environment variables with fallbacks
const port = process.env.PORT || 8005;
const publicIp = process.env.PUBLIC_IP || 'localhost';
const dbMode = process.env.DB_MODE || 'shared';
const basePath = process.env.BASE_PATH || '';
console.log(`Using base path: "${basePath}"`);

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the current directory with the base path
app.use(basePath, express.static('./'));

// API Endpoints for Spells
app.get(`${basePath}/api/spells`, (req, res) => {
    const spells = dbServer.getAllSpells();
    res.json(spells);
});

app.post(`${basePath}/api/spells`, (req, res) => {
    const { id, name } = req.body;
    
    if (!id) {
        return res.status(400).json({ error: 'Spell ID is required' });
    }
    
    const success = dbServer.addSpell(id, name || '');
    
    if (success) {
        res.status(201).json({ success: true, id, name });
    } else {
        res.status(500).json({ error: 'Failed to add spell' });
    }
});

app.delete(`${basePath}/api/spells/:id`, (req, res) => {
    const id = req.params.id;
    const success = dbServer.removeSpell(id);
    
    if (success) {
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Spell not found' });
    }
});

app.delete(`${basePath}/api/spells`, (req, res) => {
    const success = dbServer.clearAllSpells();
    
    if (success) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Failed to clear spells' });
    }
});

// API Endpoint for Warcraft Logs token
app.get(`${basePath}/api/warcraftlogs-token`, (req, res) => {
  const token = process.env.WARCRAFT_LOGS_TOKEN;
  
  if (token) {
    res.json({ 
      token,
      expires_at: process.env.WARCRAFT_LOGS_TOKEN_EXPIRES || null
    });
  } else {
    res.status(404).json({ error: 'No token available' });
  }
});

// API Endpoint for database configuration
app.get(`${basePath}/api/config`, (req, res) => {
  console.log(`[DB Config] Request received for /api/config endpoint`);
  console.log(`[DB Config] Current dbMode: ${dbMode}`);
  console.log(`[DB Config] Current basePath: "${basePath}"`);
  console.log(`[DB Config] Full request path: ${req.path}`);
  
  res.json({
    dbMode: dbMode
  });
  
  console.log(`[DB Config] Response sent with dbMode: ${dbMode}`);
});

// API Endpoints for Class Mappings
app.get(`${basePath}/api/class-mappings`, (req, res) => {
    const mappings = dbServer.getAllClassMappings();
    res.json(mappings);
});

// API Endpoint for Viserio conversion
app.post(`${basePath}/api/convert-to-viserio`, (req, res) => {
    const { mrtNotes } = req.body;
    
    if (!mrtNotes) {
        return res.status(400).json({ error: 'MRT notes are required' });
    }
    
    try {
        console.log('Converting MRT notes to Viserio format...');
        
        // Use our JavaScript implementation to convert MRT notes to Viserio format
        const viserioData = convertMrtToViserio(mrtNotes);
        
        console.log('Conversion successful');
        res.json({ viserioData });
    } catch (error) {
        console.error('Error converting to Viserio format:', error);
        res.status(500).json({ error: error.message || 'Unknown error' });
    }
});

app.post(`${basePath}/api/class-mappings`, (req, res) => {
    const { className, playerName } = req.body;
    
    if (!className || !playerName) {
        return res.status(400).json({ error: 'Class name and player name are required' });
    }
    
    const success = dbServer.setClassMapping(className, playerName);
    
    if (success) {
        res.status(201).json({ success: true, className, playerName });
    } else {
        res.status(500).json({ error: 'Failed to add class mapping' });
    }
});

app.delete(`${basePath}/api/class-mappings/:className`, (req, res) => {
    const className = req.params.className;
    const success = dbServer.removeClassMapping(className);
    
    if (success) {
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Class mapping not found' });
    }
});

app.delete(`${basePath}/api/class-mappings`, (req, res) => {
    const success = dbServer.clearAllClassMappings();
    
    if (success) {
        res.json({ success: true });
    } else {
        res.status(500).json({ error: 'Failed to clear class mappings' });
    }
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Timtommy MDT generator running at:`);
  console.log(`- Local: http://localhost:${port}${basePath}`);
  console.log(`- Public: http://${publicIp}${basePath}`);
  console.log(`\nMake sure your router is configured to forward port ${port} to this machine`);
});
