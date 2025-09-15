import express from "express";
import spotifyController from "../controllers/spotifyController.js";
import { generatePalette } from "../services/paletteService.js";

const router = express.Router();


// Retrieve multiple spotify songs via list of id's
router.get("/tracks/bulk", spotifyController.getTracksByIds);

// Retrieve one spotify song by id
router.get("/tracks/:id", spotifyController.getTrackById);

// Retrieve multiple spotify songs via list of id's
router.get("/albums/:id", spotifyController.getTracksByAlbumId);

// Create a new spotify track
router.post("/tracks", spotifyController.createTrack);

// Create multiple spotify tracks in bulk
router.post("/tracks/bulk", spotifyController.createBulkTracks);

// Create a new spotify album
router.post("/albums", spotifyController.createAlbum);

// Update a spotify track by Spotify ID
router.patch("/tracks/:id", spotifyController.patchTrack);

// Update a spotify album by Spotify ID
router.patch("/albums/:id", spotifyController.patchAlbum);

// Generate color palette from image URL (for frontend compatibility)
router.post("/palettizer", async (req, res) => {
    try {
        const { image_url, bucketSize } = req.query;
        if (!image_url) {
            return res.status(400).json({ error: "image_url query parameter is required." });
        }
        const palette = await generatePalette(image_url, parseInt(bucketSize) || 5);
        res.status(200).json({ palette });
    } catch (err) {
        console.error("Palette generation error:", err);
        
        // Send appropriate error responses based on error type
        if (err.message.includes('Missing image')) {
            return res.status(400).json({ error: err.message });
        } else if (err.message.includes('Failed to fetch')) {
            return res.status(502).json({ error: err.message });
        } else if (err.message.includes('Unsupported image type')) {
            return res.status(415).json({ error: err.message });
        }
        
        res.status(500).json({ error: `Error creating colour palette: ${err.message}` });
    }
});

export default router;
