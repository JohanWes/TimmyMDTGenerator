# Warcraft Logs Cast Analyzer - Database Configuration

This document explains how to configure the database mode for the Warcraft Logs Cast Analyzer. The application now supports two database modes:

1. **Local Mode**: Each user has their own content stored in their browser using IndexedDB (browser-to-browser)
2. **Shared Mode**: A centralized database on the host PC that all users share

## Configuration

The database mode is controlled by an environment variable in the `.env` file:

```
# Database Configuration
# Set to "local" for browser-based storage or "shared" for server-based storage
DB_MODE=shared
```

To change the database mode:

1. Open the `.env` file in the root directory of the application
2. Find or add the `DB_MODE` setting
3. Set it to either `shared` or `local`
4. Restart the server for the changes to take effect

## Database Modes

### Shared Mode (Default)

When `DB_MODE=shared`:

- All users connect to the same database on the server
- Data is stored in JSON files in the `data/` directory
- Changes made by one user are visible to all other users
- Data persists even if users clear their browser data

This mode is ideal for:
- Teams working together on the same set of spell IDs and class mappings
- Environments where you want to maintain a single source of truth
- Setups where multiple users access the application from different devices

### Local Mode

When `DB_MODE=local`:

- Each user has their own database stored in their browser using IndexedDB
- Data is stored locally in the user's browser
- Changes made by one user are not visible to other users
- Data may be lost if the user clears their browser data

This mode is ideal for:
- Individual users who want to maintain their own set of spell IDs and class mappings
- Environments where users have different preferences
- Setups where privacy or separation of data is important

## Visual Indicator

The application displays the current database mode in the UI:

- **Shared Mode**: Green indicator showing "Database Mode: shared"
- **Local Mode**: Blue indicator showing "Database Mode: local"

This indicator appears in the Spell ID Filter section, next to the database status.

## Technical Implementation

The database mode is implemented using a factory pattern:

1. The server exposes the database mode via the `/api/config` endpoint
2. The client-side `db-factory.js` fetches this configuration
3. Based on the configuration, it dynamically loads either:
   - `db.js` for local mode (IndexedDB)
   - `db-client.js` for shared mode (Server API)
4. Both implementations expose the same interface, so the rest of the application works the same way regardless of the mode

## Fallback Mechanism

If there's an error connecting to the server database in shared mode, the application will automatically fall back to local mode. This ensures that users can still use the application even if there are issues with the server database.
