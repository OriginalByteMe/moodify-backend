import express from 'express';
import { analyzeTrack, getMoodTaxonomy } from '../controllers/analysisController.js';

const router = express.Router();

router.post('/track', analyzeTrack);
router.get('/moods', getMoodTaxonomy);

export default router;
