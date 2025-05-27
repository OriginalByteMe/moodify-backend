import express from "express";
import { createPalette } from "../controllers/paletteController.js";

const router = express.Router();

// Route only handles routing - logic is in the controller
router.post("/record", createPalette);

// You could add more routes for palette operations
// router.get("/popular", getPaletteController.getPopularPalettes);
// router.get("/:id", getPaletteController.getPaletteById);

router.post("/album", async (req, res) => {
    try {
        const { albumCover } = req.body;
        if (!albumCover) {
            return res.status(400).json({ error: "Album cover URL is required." });
        }
        const palette = await this.GetColorPalette(albumCover);
        res.status(200).json(palette);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error creating colour palette");
    }
});