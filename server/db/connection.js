import { MongoClient, ServerApiVersion } from "mongodb";
import 'dotenv/config'
const uri = process.env.ATLAS_URI || "";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  autoSelectFamily: false, // Prevent TLS issues on Fly.io
});

// Define schema validation for Spotify collection
const spotifySchema = {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["spotifyId", "title", "artists"],
      properties: {
        spotifyId: {
          bsonType: "string",
          description: "Spotify track ID - must be a string"
        },
        title: {
          bsonType: "string",
          description: "Track title"
        },
        artists: {
          bsonType: "array",
          description: "List of artists"
        },
        album: {
          bsonType: "string"
        },
        albumCover: {
          bsonType: "string"
        },
        songUrl: {
          bsonType: "string"
        },
        colourPalette: {
          bsonType: "array",
          description: "Colour palette - must be an array of RGB values"
        }
      }
    }
  },
  validationLevel: "moderate", // Apply to all inserts and updates
  validationAction: "error"   // Reject invalid documents
};

// Connect and set up validation
async function setupDatabase() {
  try {
    // Connect the client to the server
    await client.connect();
    
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    
    const db = client.db("Spotify-db");
    
    // Check if collection exists, and apply/update validation
    const collections = await db.listCollections({ name: "spotify" }).toArray();
    
    if (collections.length > 0) {
      // Collection exists, modify it to add validation
      await db.command({
        collMod: "spotify",
        ...spotifySchema
      });
      console.log("Updated validation schema for spotify collection");
    } else {
      // Create collection with validation
      await db.createCollection("spotify", spotifySchema);
      console.log("Created spotify collection with validation");
    }
    
    // Create a unique index on spotifyId to ensure no duplicates
    try {
      await db.collection("spotify").createIndex({ "spotifyId": 1 }, { unique: true });
      console.log("Created unique index on spotifyId field");
    } catch (indexErr) {
      console.error("Error creating unique index:", indexErr);
      // If there are existing duplicate records, this will fail
      // We don't want to stop the application, so we'll just log the error
    }
    
    return db;
  } catch (err) {
    console.error("Database setup error:", err);
    throw err;
  }
}

let db = null;

try {
  db = await setupDatabase();
} catch (err) {
  console.error("Failed to set up database with validation:", err);
  // Fallback to basic connection without validation
  db = client.db("Spotify-db");
}

export default db;