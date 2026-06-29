import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }

    // Verify Google ID Token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    const isNewUser = !existingUser;
    
    const initialTerminalPassword = isNewUser ? generateTerminalPassword() : undefined;

    // Upsert User in Database
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        picture,
        googleId, // Ensure googleId is updated if it was missing
      },
      create: {
        email,
        name,
        picture,
        googleId,
        isVerified: true,
        terminalPassword: initialTerminalPassword,
      },
    });

    if (isNewUser && initialTerminalPassword) {
      await sendEmail(email, null, 'WELCOME_TERMINAL', { terminalPassword: initialTerminalPassword });
    }

    // Generate our own JWT Session Token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' } // Session valid for 7 days
    );

    res.status(200).json({ token, user });
  } catch (error) {
    console.error('Google Login Error:', error);
    res.status(401).json({ error: 'Invalid Google token or authentication failed' });
  }
};



import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer'; // Used for mocking email in dev

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
const generateTerminalPassword = () => crypto.randomBytes(4).toString('hex');

const sendEmail = async (email, code, type, extraData = {}) => {
  // If SMTP is configured, send a real email
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const subjectMap = {
        'SIGNUP': 'Your QueryGen AI Verification Code',
        'LOGIN 2FA': 'Your QueryGen AI Login Code',
        'PASSWORD RESET': 'Your QueryGen AI Password Reset Code',
        'WELCOME_TERMINAL': 'Welcome to QueryGen AI - Your SQL Terminal Credentials'
      };

      let htmlContent = '';
      let textContent = '';
      if (type === 'WELCOME_TERMINAL') {
        textContent = `Welcome to QueryGen AI! Your SQL Terminal password is: ${extraData.terminalPassword}. You can change it once.`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #1e293b; margin-top: 0;">Welcome to QueryGen AI!</h2>
            <p style="color: #475569; font-size: 16px;">Thank you for registering on our platform.</p>
            <p style="color: #475569; font-size: 16px;">Here is your randomly generated 8-character SQL Terminal password:</p>
            <div style="background-color: #f1f5f9; padding: 16px; border-radius: 6px; text-align: center; margin: 24px 0;">
              <span style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #0f172a;">${extraData.terminalPassword}</span>
            </div>
            <p style="color: #64748b; font-size: 14px;">You can change this password exactly once in the SQL Terminal.</p>
          </div>
        `;
      } else {
        textContent = `Your ${type.toLowerCase()} verification code is: ${code}. This code will expire in 10 minutes.`;
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #1e293b; margin-top: 0;">QueryGen AI</h2>
            <p style="color: #475569; font-size: 16px;">You requested a code for <strong>${type.toLowerCase()}</strong>.</p>
            <div style="background-color: #f1f5f9; padding: 16px; border-radius: 6px; text-align: center; margin: 24px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #0f172a;">${code}</span>
            </div>
            <p style="color: #64748b; font-size: 14px;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
          </div>
        `;
      }

      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"QueryGen AI" <noreply@querygen.ai>',
        to: email,
        subject: subjectMap[type] || 'Your Verification Code',
        text: textContent,
        html: htmlContent
      });
      console.log(`[SMTP] Real email sent to ${email} for ${type}`);
      return;
    } catch (err) {
      console.error(`[SMTP ERROR] Failed to send email to ${email}:`, err);
      // Fall through to mock logging if real email fails during development
    }
  }

  // Fallback to mocking (printing to console)
  console.log(`\n========================================`);
  console.log(`[MOCK EMAIL SENT]`);
  console.log(`To: ${email}`);
  console.log(`Type: ${type}`);
  if (type === 'WELCOME_TERMINAL') {
    console.log(`TERMINAL PASSWORD: ${extraData.terminalPassword}`);
  } else {
    console.log(`OTP CODE: ${code}`);
  }
  console.log(`========================================\n`);
};

export const requestSignupOtp = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    if (existingUser && !existingUser.isVerified) {
      await prisma.user.update({
        where: { email },
        data: { password: hashedPassword, name }
      });
    } else {
      await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          isVerified: false
        }
      });
    }

    const otp = generateOTP();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete existing signup tokens
    await prisma.verificationToken.deleteMany({
      where: { email, type: 'SIGNUP' }
    });

    await prisma.verificationToken.create({
      data: { email, code: hashedOtp, type: 'SIGNUP', expiresAt }
    });

    await sendEmail(email, otp, 'SIGNUP');

    res.status(200).json({ success: true, message: 'Verification code sent to email' });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const verifySignup = async (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });

    const tokenRecord = await prisma.verificationToken.findUnique({
      where: { email_type: { email, type: 'SIGNUP' } }
    });

    if (!tokenRecord) return res.status(400).json({ error: 'Invalid or expired verification code' });

    if (new Date() > tokenRecord.expiresAt) {
      await prisma.verificationToken.delete({ where: { id: tokenRecord.id } });
      return res.status(400).json({ error: 'Verification code has expired' });
    }

    const isValid = await bcrypt.compare(code, tokenRecord.code);
    if (!isValid) return res.status(400).json({ error: 'Invalid verification code' });

    // Check if they were already verified, though this endpoint shouldn't really be called if they are,
    // but just to be safe so we don't regenerate password.
    const existingUser = await prisma.user.findUnique({ where: { email } });
    const needsPassword = !existingUser.isVerified && !existingUser.terminalPassword;
    const initialTerminalPassword = needsPassword ? generateTerminalPassword() : undefined;

    const user = await prisma.user.update({
      where: { email },
      data: { 
        isVerified: true,
        ...(needsPassword && { terminalPassword: initialTerminalPassword })
      }
    });

    if (needsPassword && initialTerminalPassword) {
       await sendEmail(email, null, 'WELCOME_TERMINAL', { terminalPassword: initialTerminalPassword });
    }

    await prisma.verificationToken.delete({ where: { id: tokenRecord.id } });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    res.status(200).json({ token, user, message: 'Account verified successfully' });
  } catch (error) {
    console.error('Verify Signup Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ error: 'Invalid email or password' });

    if (!user.isVerified) {
      return res.status(403).json({ error: 'Please verify your email first', requiresVerification: true });
    }

    const otp = generateOTP();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.verificationToken.deleteMany({
      where: { email, type: 'LOGIN' }
    });

    await prisma.verificationToken.create({
      data: { email, code: hashedOtp, type: 'LOGIN', expiresAt }
    });

    await sendEmail(email, otp, 'LOGIN 2FA');

    res.status(200).json({ success: true, requires2FA: true, message: 'Verification code sent to email' });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const verifyLogin = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });

    const tokenRecord = await prisma.verificationToken.findUnique({
      where: { email_type: { email, type: 'LOGIN' } }
    });

    if (!tokenRecord || new Date() > tokenRecord.expiresAt) {
      return res.status(401).json({ error: 'Invalid or expired verification code' });
    }

    const isValid = await bcrypt.compare(code, tokenRecord.code);
    if (!isValid) return res.status(401).json({ error: 'Invalid verification code' });

    const user = await prisma.user.findUnique({ where: { email } });

    await prisma.verificationToken.delete({ where: { id: tokenRecord.id } });

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' }
    );

    res.status(200).json({ token, user, message: 'Logged in successfully' });
  } catch (error) {
    console.error('Verify Login Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    
    // Always return success even if user not found to prevent email enumeration
    if (!user) return res.status(200).json({ success: true, message: 'If an account exists, a reset code was sent' });

    const otp = generateOTP();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.verificationToken.deleteMany({
      where: { email, type: 'RESET' }
    });

    await prisma.verificationToken.create({
      data: { email, code: hashedOtp, type: 'RESET', expiresAt }
    });

    await sendEmail(email, otp, 'PASSWORD RESET');

    res.status(200).json({ success: true, message: 'If an account exists, a reset code was sent' });
  } catch (error) {
    console.error('Request Reset Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) return res.status(400).json({ error: 'All fields are required' });

    const tokenRecord = await prisma.verificationToken.findUnique({
      where: { email_type: { email, type: 'RESET' } }
    });

    if (!tokenRecord || new Date() > tokenRecord.expiresAt) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    const isValid = await bcrypt.compare(code, tokenRecord.code);
    if (!isValid) return res.status(400).json({ error: 'Invalid verification code' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    });

    await prisma.verificationToken.delete({ where: { id: tokenRecord.id } });

    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
