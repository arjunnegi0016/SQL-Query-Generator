import { schemaService } from '../../../features/database-schema/schema.service.js';

export const schemaController = {
  async getFullSchema(req, res) {
    try {
      const schema = await schemaService.getFullSchema();
      res.json({ success: true, data: schema });
    } catch (error) {
      console.error("Schema Extraction Error:", error);
      res.status(500).json({ success: false, error: "Failed to extract database schema." });
    }
  },

  async getTables(req, res) {
    try {
      const tables = await schemaService.getTables();
      res.json({ success: true, data: tables });
    } catch (error) {
      console.error("Tables Extraction Error:", error);
      res.status(500).json({ success: false, error: "Failed to extract tables." });
    }
  },

  async getColumns(req, res) {
    try {
      const { table } = req.params;
      const columns = await schemaService.getColumns(table);
      res.json({ success: true, data: columns });
    } catch (error) {
      console.error(`Columns Extraction Error for ${req.params.table}:`, error);
      res.status(500).json({ success: false, error: "Failed to extract columns." });
    }
  }
};
