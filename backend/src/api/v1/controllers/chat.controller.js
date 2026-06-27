import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getChatHistory = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const history = await prisma.chatHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve chat history' });
  }
};

export const saveChat = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { userMessage, assistantResponse } = req.body;
    if (!userMessage || !assistantResponse) {
      return res.status(400).json({ success: false, error: 'Messages are required' });
    }
    const chat = await prisma.chatHistory.create({
      data: { userId, userMessage, assistantResponse }
    });
    res.json({ success: true, data: chat });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to save chat' });
  }
};
