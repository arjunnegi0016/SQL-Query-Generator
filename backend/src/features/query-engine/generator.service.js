import { openRouterService } from '../ai-services/openrouter.service.js';
import { schemaService } from '../database-schema/schema.service.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const generatorService = {
  /**
   * Orchestrates the query generation process.
   * 1. Fetches current schema.
   * 2. Calls OpenRouter to generate SQL.
   * 3. Saves the generated query to the history.
   * @param {string} prompt User's prompt
   */
  async generateAndSaveQuery(prompt, userId) {
    if (!prompt) throw new Error("Prompt is required");
    if (!userId) throw new Error("User ID is required for generating queries");

    // 1. Fetch current schema dynamically
    let schema = {};
    try {
      schema = await schemaService.getFullSchema();
    } catch (e) {
      console.warn("Could not fetch live schema, proceeding with empty schema context.", e);
    }

    // 2. Call OpenRouter
    const result = await openRouterService.generateSql(prompt, schema);

    // 3. Save to database history
    const historyRecord = await prisma.queryHistory.create({
      data: {
        userId,
        prompt,
        generatedSql: result.sql,
        explanation: result.explanation,
        operationType: result.operation || "SELECT",
        estimatedRows: result.estimatedRows,
        riskLevel: result.riskLevel,
        optimization: result.optimization
      }
    });

    return {
      historyId: historyRecord.id,
      ...result
    };
  },

  /**
   * Retrieves the query history for a specific user.
   */
  async getHistory(userId) {
    if (!userId) throw new Error("User ID is required");
    return await prisma.queryHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to recent 50 for performance
    });
  }
};
