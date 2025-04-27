import express from "express";
import PixelPeeper from "../helpers/PixelPeeper.js";
import jpeg from 'jpeg-js'
import png from 'png-js';
// This will help us connect to the database
import db from "../db/connection.js";

// This help convert the id from string to ObjectId for the _id.
import { ObjectId } from "mongodb";

const router = express.Router();

router.get("/", async (req, res) => {
    try {
        const collection = db.collection("spotify");
        const results = await collection.find({}).toArray();
        res.status(200).json(results);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error getting spotify data");
    }
});

// Retrieve multiple spotify songs via list of id's
router.get("/list", async (req, res) => {
    try {
        const collection = db.collection("spotify");
        const ids = req.query.ids.split(",").map(id => ObjectId.createFromHexString(id));
        const query = { _id: { $in: ids } };
        const results = await collection.find(query).toArray();
        res.status(200).json(results);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error getting spotify data");
    }
});



// // Retrieve one spotify song by id
router.get("/:id", async (req, res) => {
    try {
        const collection = db.collection("spotify");
        const query = { _id: ObjectId.createFromHexString(req.params.id) };
        const result = await collection.findOne(query);

        if (!result) res.status(404).send("Not found");
        else res.status(200).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error getting spotify data");
    }
});

// Create colour palette
router.post("/palettizer", async (req, res) => {
    try {
        console.log("Palettizer endpoint called with parameters:", req.query);
        const url = req.query.image_url;
        if (!url) {
            return res.status(400).send('Missing image_url parameter');
        }

        const bucketSize = parseInt(req.query.bucketSize) || 4;

        // Fetch the image directly
        const imageResponse = await fetch(url);
        if (!imageResponse.ok) {
            return res.status(500).send(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
        }

        const contentType = imageResponse.headers.get('content-type');
        const arrayBuffer = await imageResponse.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const peeper = new PixelPeeper();
        let palette = [];

        if (contentType.includes('image/jpeg')) {
            try {
                const imageData = jpeg.decode(uint8Array, { useTArray: true });
                peeper.ExtractPixels(imageData);
                palette = peeper.GetColorPalette(bucketSize);
                return res.status(200).json(palette);
            } catch (e) {
                console.error('JPEG processing error:', e);
                return res.status(500).send('Error processing JPEG: ' + e.message);
            }
        }

        if (contentType.includes('image/png')) {
            try {
                const imageData = png.decode(Buffer.from(uint8Array));
                peeper.ExtractPixels(imageData);
                palette = peeper.GetColorPalette(bucketSize);
                return res.json(palette);
            } catch (e) {
                console.error('PNG processing error:', e);
                return res.status(500).send('Error in PNG processing: ' + e.message);
            }
        }

        return res.status(400).send('Unsupported image type: ' + contentType);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error creating colour palette");
    }
});

// This section will help you create a new record.
router.post("/", async (req, res) => {
    try {
        const newDocument = {
            spotifyId: req.body.spotifyId,
            title: req.body.title,
            artists: req.body.artists,
            album: req.body.album,
            albumCover: req.body.albumCover,
            songUrl: req.body.songUrl,
            colourPalette: req.body.colourPalette,
        };
        const collection = db.collection("spotify");
        const result = await collection.insertOne(newDocument);
        res.status(200).json(result);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error adding spotify data");
    }
});


export default router;
