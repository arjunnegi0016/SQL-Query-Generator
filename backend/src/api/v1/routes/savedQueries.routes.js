import express from 'express';
import { getSavedQueries, saveQuery, deleteSavedQuery } from '../controllers/savedQueries.controller.js';

const router = express.Router();

router.get('/', getSavedQueries);
router.post('/', saveQuery);
router.delete('/:id', deleteSavedQuery);

export default router;
