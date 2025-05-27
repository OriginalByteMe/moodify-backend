import express from "express";
import spotifyController from "../controllers/spotifyController.js";

const router = express.Router();


// Retrieve multiple spotify songs via list of id's
router.get("/bulk", spotifyController.getTracksByIds);

// Retrieve one spotify song by id
router.get("/:id", spotifyController.getTrackById);

// Create a new spotify track
router.post("/", spotifyController.createTrack);

// Create multiple spotify tracks in bulk
router.post("/bulk", spotifyController.createBulkTracks);

export default router;
