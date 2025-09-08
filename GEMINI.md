# Gemini AI Agent Context

This document provides context for the Gemini AI agent to understand the `moodify-backend` project.

## Project Overview

`moodify-backend` is a Node.js application that stores data and analyzes images to extract color palettes. It appears to interact with the Spotify API to retrieve song information and album art.

## Tech Stack

*   **Backend:** Node.js, Express.js
*   **Database:** PostgreSQL (migrated from another database)
*   **Database Migrations:** Knex.js
*   **Testing:** Jest
*   **Dependency Management:** npm
*   **Containerization:** Docker

## Recent Changes

### August 26, 2025

*   **Added `.nvmrc` file:** To enforce a specific Node.js version for the project.
*   **Added Spotify Audio Features:** A new database migration (`20250826160413_add_spotify_audio_features.js`) was created to add columns for Spotify's audio features (e.g., danceability, energy, valence) to the `tracks` table.

### August 25, 2025

*   **Migrated to PostgreSQL:** The project was migrated to use a PostgreSQL database.
*   **Added Color Palette Generation Route:** A new route was added to `server/routes/spotify.js` to handle generating color palettes from image URLs.
*   **Added Health Check Route:** A new health check route was added to `server/routes/health.js` to monitor the application's status.

## Getting Started

1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Run Database Migrations:**
    ```bash
    npx knex migrate:latest
    ```
3.  **Start the Server:**
    ```bash
    npm start
    ```
