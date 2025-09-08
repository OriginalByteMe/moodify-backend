import express from "express";
import cors from "cors";
import spotify from "./routes/spotify.js";
import palette from "./routes/palette.js"
import health from "./routes/health.js"
import 'dotenv/config'
import { createDatabaseConnection } from "./db/connection.js";
import { createSpotifyService } from "./services/spotifyService.js";

export function createApp(db) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  const spotifyService = createSpotifyService(db);

  app.use((req, res, next) => {
    req.spotifyService = spotifyService;
    next();
  });

  app.use("/spotify", spotify);
  app.use("/palette", palette);
  app.use("/health", health);

  return app;
}

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 5050;
  const db = createDatabaseConnection(process.env.DATABASE_URL);
  const app = createApp(db);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}