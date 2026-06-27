import express from 'express';
import { terminalController } from '../controllers/terminal.controller.js';

const router = express.Router();

router.post('/execute', terminalController.execute);

export default router;
