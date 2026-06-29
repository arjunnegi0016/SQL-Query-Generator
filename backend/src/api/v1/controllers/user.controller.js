import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getMe = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        picture: true,
        isVerified: true,
        isTerminalPasswordChanged: true
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('getMe error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
};

export const changeTerminalPassword = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.isTerminalPasswordChanged) {
      return res.status(400).json({ success: false, error: 'Terminal password can only be changed once' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        terminalPassword: newPassword,
        isTerminalPasswordChanged: true
      }
    });

    res.json({ success: true, message: 'Terminal password updated successfully' });
  } catch (error) {
    console.error('changeTerminalPassword error:', error);
    res.status(500).json({ success: false, error: 'Failed to update terminal password' });
  }
};
