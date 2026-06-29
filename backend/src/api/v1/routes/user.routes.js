import express from 'express';
import { getMe, changeTerminalPassword } from '../controllers/user.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/me', requireAuth, getMe);
router.put('/terminal-password', requireAuth, changeTerminalPassword);

export default router;
