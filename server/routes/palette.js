import express from "express";
import { createPalette } from "../controllers/paletteController.js";
import { generatePalette } from "../services/paletteService.js";

const router = express.Router();

// Route only handles routing - logic is in the controller
router.post("/track", createPalette);

// You could add more routes for palette operations
// router.get("/popular", getPaletteController.getPopularPalettes);
// router.get("/:id", getPaletteController.getPaletteById);

router.post("/album", async (req, res) => {
    try {
        const { albumCover, bucketSize } = req.body;
        if (!albumCover) {
            return res.status(400).json({ error: "Album cover URL is required." });
        }
        const palette = await generatePalette(albumCover, bucketSize || 4);
        res.status(200).json(palette);
    } catch (err) {
        console.error("Album palette generation error:", err);
        
        // Send appropriate error responses based on error type
        if (err.message.includes('Missing image')) {
            return res.status(400).send(err.message);
        } else if (err.message.includes('Failed to fetch')) {
            return res.status(502).send(err.message);
        } else if (err.message.includes('Unsupported image type')) {
            return res.status(415).send(err.message);
        }
        
        res.status(500).send(`Error creating colour palette: ${err.message}`);
    }
});

export default router;