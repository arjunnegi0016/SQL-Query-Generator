import mysql from 'mysql2/promise';

/**
 * Creates a MySQL connection based on the Prisma DATABASE_URL
 */
async function getConnection() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL is not defined in .env");
  
  // Basic parsing of mysql://user:pass@host:port/dbname
  // Using URL object
  const url = new URL(dbUrl);
  return await mysql.createConnection({
    host: url.hostname,
    port: url.port || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.replace('/', '')
  });
}

export const schemaService = {
  /**
   * Retrieves all user tables in the database.
   */
  async getTables() {
    const connection = await getConnection();
    try {
      const [rows] = await connection.query('SHOW TABLES');
      // The key of the returned object is something like `Tables_in_database`
      // We extract just the values
      return rows.map(row => Object.values(row)[0]);
    } finally {
      await connection.end();
    }
  },

  /**
   * Retrieves columns for a specific table.
   * @param {string} tableName 
   */
  async getColumns(tableName) {
    const connection = await getConnection();
    try {
      // Validate table name to prevent SQL injection (basic check)
      if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
        throw new Error("Invalid table name");
      }
      const [rows] = await connection.query(`SHOW COLUMNS FROM \`${tableName}\``);
      return rows.map(row => ({
        name: row.Field,
        type: row.Type,
        null: row.Null,
        key: row.Key
      }));
    } finally {
      await connection.end();
    }
  },

  /**
   * Retrieves the full schema (tables and their column names) in JSON format.
   * Format: { "table1": ["col1", "col2"], "table2": ["col1", "col2"] }
   */
  async getFullSchema() {
    const tables = await this.getTables();
    const schema = {};
    
    // In a real app, fetching all columns sequentially could be slow for huge DBs.
    // For a demo generator, it's perfectly fine.
    for (const table of tables) {
      // Ignore prisma internal tables
      if (table === '_prisma_migrations') continue;
      
      const columns = await this.getColumns(table);
      schema[table] = columns.map(c => c.name);
    }
    
    return schema;
  }
};
