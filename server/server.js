import express from "express";
import cors from "cors";
import spotify from "./routes/spotify.js";
import palette from "./routes/palette.js"
import health from "./routes/health.js"
import 'dotenv/config'

const PORT = process.env.PORT || 5050;
const app = express();

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`\n\n====================== DEBUG LOG ======================`);
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Query Parameters:', JSON.stringify(req.query, null, 2));
  console.log('Request Body:', JSON.stringify(req.body, null, 2));
  console.log(`=====================================================\n\n`);
  next();
});
app.use("/spotify", spotify);
app.use("/palette", palette);
app.use("/health", health);

// start the Express server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});