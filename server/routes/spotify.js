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
router.get("/bulk", async (req, res) => {
    try {
        const collection = db.collection("spotify");
        const { ids } = req.body;
        if (!Array.isArray(ids)) {
            return res.status(400).json({ error: "Invalid request body. 'ids' should be an array." });
        }
        const query = { spotifyId: { $in: ids } };
        const results = await collection.find(query).toArray();
        res.status(200).json(results);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error getting spotify data");
    }
});



// Retrieve one spotify song by id
router.get("/:id", async (req, res) => {
    try {
        const collection = db.collection("spotify");
        
        if (!req.params.id) {
            return res.status(400).json({ error: "Spotify ID is required." });
        }
        
        const query = { spotifyId: Number(req.params.id) };
        const result = await collection.findOne(query);

        if (!result) {
            res.status(404).json({ error: "Spotify track not found." });
        } else {
            res.status(200).json(result);
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error retrieving Spotify data" });
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
        // Validate required fields
        if (!req.body.spotifyId || !req.body.title || !req.body.artists) {
            return res.status(400).json({
                error: "Missing required fields: spotifyId, title, and artists are required"
            });
        }
        
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
        
        // Check if record already exists before attempting insert
        const existing = await collection.findOne({ spotifyId: req.body.spotifyId });
        if (existing) {
            // Record exists, but don't throw an error - just notify
            return res.status(200).json({
                message: "Record with this spotifyId already exists - no changes made",
                existingId: existing._id,
                success: false,
                existing: existing
            });
        }
        
        const result = await collection.insertOne(newDocument);
        res.status(201).json({
            ...result,
            success: true
        });
    } catch (err) {
        console.error(err);
        
        // Check for duplicate key error (MongoDB error code 11000)
        if (err.code === 11000) {
            // Extract the spotifyId from the error message if possible
            const duplicateKeyMatch = err.message.match(/spotifyId: "([^"]+)"/); 
            const spotifyId = duplicateKeyMatch ? duplicateKeyMatch[1] : null;
            
            // Try to find the existing record
            try {
                const existing = spotifyId ? 
                    await collection.findOne({ spotifyId }) : 
                    null;
                    
                return res.status(200).json({
                    message: "Record with this spotifyId already exists - no changes made",
                    existingId: existing?._id,
                    success: false,
                    existing: existing || { spotifyId }
                });
            } catch (findErr) {
                return res.status(200).json({
                    message: "Record with this spotifyId already exists - no changes made",
                    success: false
                });
            }
        }
        
        res.status(500).json({
            error: "Error adding spotify data",
            message: err.message
        });
    }
});

router.post("/bulk", async (req, res) => {
    try {
        if (!Array.isArray(req.body) || req.body.length === 0) {
            return res.status(400).json({
                error: "Request body must be a non-empty array of Spotify track objects"
            });
        }
        
        const collection = db.collection("spotify");
        
        // Validate all documents have required fields
        const invalidItems = req.body.filter(item => 
            !item.spotifyId || !item.title || !Array.isArray(item.artists));
            
        if (invalidItems.length > 0) {
            return res.status(400).json({
                error: "Some items are missing required fields (spotifyId, title, artists)",
                invalidItems: invalidItems.map(item => item.spotifyId || 'unknown')
            });
        }
        
        // Check for duplicate spotifyIds within the request body
        const spotifyIds = req.body.map(item => item.spotifyId);
        const uniqueIds = new Set(spotifyIds);
        
        if (uniqueIds.size !== spotifyIds.length) {
            const duplicatesInRequest = spotifyIds.filter((id, index) => 
                spotifyIds.indexOf(id) !== index);
            
            return res.status(400).json({
                error: "Request contains duplicate spotifyIds",
                duplicateIds: [...new Set(duplicatesInRequest)]
            });
        }
        
        // Check which IDs already exist in the database
        const existingRecords = await collection.find({
            spotifyId: { $in: spotifyIds }
        }).toArray();
        
        let newDocuments = [];
        let skippedRecords = [];
        
        if (existingRecords.length > 0) {
            // Some records already exist in database
            const existingIds = existingRecords.map(record => record.spotifyId);
            
            // Filter out existing records
            newDocuments = req.body.filter(item => !existingIds.includes(item.spotifyId));
            skippedRecords = existingRecords;
        } else {
            // No existing records found
            newDocuments = req.body;
        }
        
        // Format the documents for insertion
        const formattedDocuments = newDocuments.map((data) => ({
            spotifyId: data.spotifyId,
            title: data.title,
            artists: data.artists,
            album: data.album || "",
            albumCover: data.albumCover || "",
            songUrl: data.songUrl || "",
            colourPalette: data.colourPalette || [],
        }));
        
        let results = { insertedCount: 0, insertedIds: {} };
        
        // Only attempt to insert if we have new documents
        if (formattedDocuments.length > 0) {
            results = await collection.insertMany(formattedDocuments, { ordered: true });
        }
        
        // Return a combined result with both new and skipped records
        res.status(200).json({
            success: true,
            inserted: {
                count: results.insertedCount,
                ids: results.insertedIds
            },
            skipped: {
                count: skippedRecords.length,
                records: skippedRecords.map(r => ({ spotifyId: r.spotifyId, _id: r._id }))
            },
            total: {
                processed: req.body.length,
                inserted: results.insertedCount,
                skipped: skippedRecords.length
            }
        });
    } catch (err) {
        console.error(err);
        
        // Handle duplicate key errors (MongoDB error code 11000)
        if (err.code === 11000 || (err.writeErrors && err.writeErrors.some(e => e.code === 11000))) {
            // Extract successfully inserted documents if any
            const insertedCount = err.result ? err.result.nInserted : 0;
            
            // Get info about the duplicates if possible
            let duplicateIds = [];
            
            if (err.writeErrors) {
                // Extract duplicate IDs from write errors if possible
                try {
                    duplicateIds = err.writeErrors
                        .filter(e => e.code === 11000)
                        .map(e => {
                            const match = e.errmsg.match(/spotifyId: "([^"]+)"/); 
                            return match ? match[1] : null;
                        })
                        .filter(id => id !== null);
                } catch (parseErr) {
                    console.error("Error parsing duplicate keys:", parseErr);
                }
            }
            
            return res.status(200).json({
                success: true,
                message: "Partial success - some records were inserted, others already existed",
                inserted: {
                    count: insertedCount
                },
                skipped: {
                    count: duplicateIds.length || 'unknown',
                    ids: duplicateIds.length ? duplicateIds : ['unknown']
                }
            });
        }
        
        res.status(500).json({
            error: "Error adding spotify data",
            message: err.message
        });
    }
});

export default router;
