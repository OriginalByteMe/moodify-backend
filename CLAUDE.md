# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Moodify Backend is a Node.js/Express API for storing music data and analyzing album cover color palettes. The application uses PostgreSQL with Knex.js to store Spotify track metadata along with extracted color information from album artwork.

## Key Commands

- **Development**: `npm run dev` - Start server with nodemon for auto-reload
- **Production**: `npm start` - Start server with node
- **Database Migrations**: `npm run migrate` - Run latest migrations
- **Migration Rollback**: `npm run migrate:rollback` - Rollback last migration
- **Migration Reset**: `npm run migrate:reset` - Reset all migrations
- **Seed Database**: `npm run seed` - Run database seeds
- **Docker**: `docker build -t moodify-backend .` - Build Docker image
- **Deploy**: Configured for Fly.io deployment via `fly.toml`

## Architecture

### Database Structure
- Uses PostgreSQL with Knex.js query builder via `server/db/connection.js`
- Main tables:
  - `tracks` - Stores track metadata with unique constraints on spotifyId
  - `albums` - Stores album metadata with foreign key relationship to tracks
- MongoDB-compatible collection interfaces in connection.js for easier migration
- Unique constraints on `spotifyId` fields prevent duplicates
- JSONB columns for storing color palettes with GIN indexes for performance
- Timestamps (`created_at`, `updated_at`) on all tables

### API Routes
Located in `server/routes/`:
- `/spotify` - Main API endpoints for Spotify data:
  - `GET /spotify/tracks/:id` - Get single track by spotifyId
  - `GET /spotify/tracks/bulk` - Retrieve multiple tracks by array of IDs
  - `GET /spotify/albums/:id` - Get tracks by album ID
  - `POST /spotify/tracks` - Add single track with duplicate handling
  - `POST /spotify/tracks/bulk` - Batch insert with duplicate detection
  - `POST /spotify/albums` - Create new album
- `/palette` - Color palette generation endpoints:
  - `POST /palette/track` - Extract color palette from image URL
  - `POST /palette/album` - Extract color palette from album cover

### Service Layer Architecture
- **Controller Pattern**: Routes delegate to controllers for HTTP handling
- **Service Layer**: Business logic isolated in service files
- **Data Access**: MongoDB-style collection interfaces over Knex queries
- **Transaction Support**: Proper PostgreSQL transaction handling for bulk operations

### Color Analysis
The `PixelPeeper` class (`server/helpers/PixelPeeper.js`) implements:
- Median cut algorithm for color palette extraction
- Support for JPEG and PNG image processing 
- HSL-based vibrancy calculation for representative colors
- Configurable bucket sizes for palette generation

### Environment Configuration
- **Database**: Uses `DATABASE_URL` or individual PostgreSQL environment variables
- **Development**: `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- **SSL**: `POSTGRES_SSL` for secure connections
- Uses dotenv for environment variable management
- Port defaults to 5050 (development) or uses `PORT` environment variable

## Development Notes

- Uses ES6 modules (`"type": "module"` in package.json)
- PostgreSQL operations include comprehensive error handling for unique constraint violations
- JSONB columns store color palettes without manual JSON.stringify
- All database operations use async/await pattern with proper try/catch blocks
- Knex.js provides SQL query building with PostgreSQL-specific features
- Transaction support for bulk operations with proper rollback handling
- CORS is enabled for cross-origin requests