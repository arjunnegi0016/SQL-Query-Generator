import express from 'express';
import { queryController } from '../controllers/query.controller.js';

const router = express.Router();

router.post('/generate', queryController.generate);
router.get('/history', queryController.getHistory);

export default router;
