import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
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

  // OpenAPI spec and docs
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Serve the OpenAPI spec
  app.get("/openapi.json", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../openapi/openapi.json"));
  });

  // Serve a simple Redoc UI without extra dependencies
  app.get("/docs", (_req, res) => {
    res
      .type("html")
      .send(`<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Moodify API Docs</title>
    <style>
      body { margin: 0; padding: 0; }
      .redoc-wrap { height: 100vh; }
    </style>
  </head>
  <body>
    <redoc spec-url="/openapi.json"></redoc>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
  </body>
  </html>`);
  });

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
