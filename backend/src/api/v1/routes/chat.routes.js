import express from 'express';
import { getChatHistory, saveChat } from '../controllers/chat.controller.js';

const router = express.Router();

router.get('/', getChatHistory);
router.post('/', saveChat);

export default router;
