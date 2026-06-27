import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getSettings = async (req, res) => {
  try {
    const userId = req.user?.userId;
    let settings = await prisma.userSettings.findUnique({
      where: { userId }
    });
    
    // Return default settings if none exist yet
    if (!settings) {
      settings = {
        userId,
        preferredDatabase: 'MySQL',
        theme: 'dark'
      };
    }
    
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve settings' });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { preferredDatabase, theme } = req.body;
    
    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: { preferredDatabase, theme },
      create: { userId, preferredDatabase, theme }
    });
    
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
};
