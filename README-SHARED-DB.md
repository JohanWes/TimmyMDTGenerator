# Warcraft Logs Cast Analyzer - Shared Database Implementation

This document explains the implementation of a shared database for the Warcraft Logs Cast Analyzer. This allows all users to see the same spell IDs and class mappings, rather than having each user maintain their own local database.

## Overview

The original implementation used IndexedDB, which is a client-side database that stores data locally in each user's browser. This meant that changes made by one user were not visible to others.

The new implementation adds a server-side database that stores the data in JSON files on the server, making it accessible to all users.

## Implementation Details

### Server-Side Components

1. **db-server.js**: A simple JSON file-based database implementation that stores spell IDs and class mappings in files on the server.
   - Stores data in `data/spells.json` and `data/class-mappings.json`
   - Provides functions for CRUD operations on the data

2. **API Endpoints in server.js**: RESTful API endpoints for interacting with the server-side database:
   - GET `/api/spells` - Get all spell IDs
   - POST `/api/spells` - Add a new spell ID
   - DELETE `/api/spells/:id` - Remove a spell ID
   - DELETE `/api/spells` - Clear all spell IDs
   - GET `/api/class-mappings` - Get all class mappings
   - POST `/api/class-mappings` - Add/update a class mapping
   - DELETE `/api/class-mappings/:className` - Remove a class mapping
   - DELETE `/api/class-mappings` - Clear all class mappings

### Client-Side Components

1. **db-client.js**: A drop-in replacement for the original IndexedDB implementation that communicates with the server API instead of using local storage.
   - Implements the same interface as the original db.js
   - Makes HTTP requests to the server API endpoints

2. **Updated index.html**: References db-client.js instead of db.js

3. **Updated app.js**: Modified to work with the server-side database
   - Removed localStorage backup functionality (no longer needed)
   - Updated import/export functionality to work with the server-side database

## How It Works

1. When a user adds a spell ID or class mapping, the data is sent to the server via the API
2. The server stores the data in JSON files
3. When other users load the page, they fetch the latest data from the server
4. All users see the same spell IDs and class mappings

## Benefits

- All users see the same spell IDs and class mappings
- No need to manually share or import/export data between users
- Data persists even if users clear their browser data

## Setup

1. Make sure the `data` directory exists in the application root (it will be created automatically if it doesn't)
2. Start the server as usual with `npm start`
3. The shared database functionality will be available to all users

## Fallback

The client-side code still includes the backup/restore functionality for compatibility, but it doesn't actually do anything in the server version. This ensures that the application will continue to work even if there are issues with the server-side database.
