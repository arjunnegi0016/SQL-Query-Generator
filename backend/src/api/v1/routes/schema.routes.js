import express from 'express';
import { schemaController } from '../controllers/schema.controller.js';

const router = express.Router();

router.get('/', schemaController.getFullSchema);
router.get('/tables', schemaController.getTables);
router.get('/:table', schemaController.getColumns);

export default router;
