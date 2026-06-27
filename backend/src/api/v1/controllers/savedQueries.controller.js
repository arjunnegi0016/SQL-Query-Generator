import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getSavedQueries = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const queries = await prisma.savedQuery.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: queries });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve saved queries' });
  }
};

export const saveQuery = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { title, generatedSql } = req.body;
    if (!title || !generatedSql) {
      return res.status(400).json({ success: false, error: 'Title and generatedSql are required' });
    }
    const savedQuery = await prisma.savedQuery.create({
      data: { userId, title, generatedSql }
    });
    res.json({ success: true, data: savedQuery });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to save query' });
  }
};

export const deleteSavedQuery = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    
    // Check ownership
    const query = await prisma.savedQuery.findUnique({ where: { id: parseInt(id) } });
    if (!query) return res.status(404).json({ success: false, error: 'Query not found' });
    if (query.userId !== userId) return res.status(403).json({ success: false, error: 'Unauthorized' });

    await prisma.savedQuery.delete({ where: { id: parseInt(id) } });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete query' });
  }
};
