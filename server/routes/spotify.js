import express from "express";
import spotifyController from "../controllers/spotifyController.js";

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

export default router;
