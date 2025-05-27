import express from "express";
import cors from "cors";
import records from "./routes/record.js";
import spotify from "./routes/spotify.js";
import 'dotenv/config'

const PORT = process.env.PORT || 5050;
const app = express();

app.use(cors());
app.use(express.json());

// Request logging middleware
// app.use((req, res, next) => {
//   console.log(`\n\n====================== DEBUG LOG ======================`);
//   console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
//   console.log('Headers:', JSON.stringify(req.headers, null, 2));
//   console.log('Query Parameters:', JSON.stringify(req.query, null, 2));
//   console.log('Request Body:', JSON.stringify(req.body, null, 2));
//   console.log(`=====================================================\n\n`);
//   next();
// });
app.use("/spotify", spotify);

// start the Express server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});