import express from 'express';
import { 
  googleLogin, 
  requestSignupOtp,
  verifySignup,
  login,
  verifyLogin,
  requestPasswordReset,
  resetPassword
} from '../controllers/auth.controller.js';

const router = express.Router();

// OAuth
router.post('/google', googleLogin);

// Email/Password Signup
router.post('/signup-request', requestSignupOtp);
router.post('/signup-verify', verifySignup);

// Email/Password Login
router.post('/login', login);
router.post('/login-verify', verifyLogin);

// Password Reset
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);

export default router;
