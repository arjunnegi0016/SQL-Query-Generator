import { generatorService } from '../../../features/query-engine/generator.service.js';

export const queryController = {
  async generate(req, res) {
    try {
      const { prompt } = req.body;
      const userId = req.user?.userId;
      if (!prompt) {
        return res.status(400).json({ success: false, error: "Prompt is required" });
      }
      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const result = await generatorService.generateAndSaveQuery(prompt, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Query Generation Error:", error);
      res.status(500).json({ success: false, error: error.message || "Failed to generate query." });
    }
  },

  async getHistory(req, res) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }
      const history = await generatorService.getHistory(userId);
      res.json({ success: true, data: history });
    } catch (error) {
      console.error("History Retrieval Error:", error);
      res.status(500).json({ success: false, error: "Failed to retrieve history." });
    }
  }
};
