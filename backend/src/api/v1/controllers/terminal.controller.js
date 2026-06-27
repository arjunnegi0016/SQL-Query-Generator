import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const terminalController = {
  async execute(req, res) {
    try {
      const { query, confirmDangerous } = req.body;
      const userId = req.user?.userId;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ success: false, error: "Valid query string is required" });
      }

      // 1. Determine command type
      const firstWordMatch = query.trim().match(/^(\w+)/);
      const commandType = firstWordMatch ? firstWordMatch[1].toUpperCase() : 'UNKNOWN';

      // 2. Validate dangerous commands
      const dangerousCommands = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER'];
      const isDangerous = dangerousCommands.includes(commandType);

      if (isDangerous && !confirmDangerous) {
        return res.status(400).json({ 
          success: false, 
          error: "Dangerous command detected. Please confirm execution.",
          requiresConfirmation: true
        });
      }

      const startTime = performance.now();
      
      let data = [];
      let affectedRows = 0;
      let message = "";

      // 3. Execute query
      
      // We use mysql2 directly here instead of Prisma for raw terminal execution.
      // Prisma's $executeRaw uses prepared statements which do NOT support the `USE` command.
      // By using a direct mysql2 connection and .query(), we can bypass this limitation.
      const mysql = await import('mysql2/promise');
      
      // Create a dedicated connection for this execution batch to ensure state (like USE db) 
      // persists across multiple statements in this specific batch.
      const connection = await mysql.createConnection(process.env.DATABASE_URL);
      
      try {
        // Split queries by semicolon, ignoring semicolons inside single quotes
        const statements = query
          .split(/;(?=(?:[^']*'[^']*')*[^']*$)/)
          .map(s => s.trim())
          .filter(s => s.length > 0);

        if (statements.length === 0) {
          await connection.end();
          return res.status(400).json({ success: false, error: "No valid SQL statements found" });
        }

        // If multiple statements, execute them sequentially and return the result of the last one
        for (let i = 0; i < statements.length; i++) {
          const stmt = statements[i];
          const isLast = i === statements.length - 1;
          
          const stmtFirstWordMatch = stmt.trim().match(/^(\w+)/);
          const stmtCommandType = stmtFirstWordMatch ? stmtFirstWordMatch[1].toUpperCase() : 'UNKNOWN';

          // Use connection.query instead of connection.execute to avoid prepared statements
          const [rows, fields] = await connection.query(stmt);
          
          if (isLast) {
            if (stmtCommandType === 'SELECT' || stmtCommandType === 'SHOW' || stmtCommandType === 'DESCRIBE' || stmtCommandType === 'EXPLAIN') {
              data = Array.isArray(rows) ? rows : [rows];
              message = statements.length > 1 ? "Multiple queries executed successfully" : "Query executed successfully";
            } else {
              affectedRows = rows.affectedRows || 0;
              
              if (['INSERT', 'UPDATE', 'DELETE'].includes(stmtCommandType)) {
                message = statements.length > 1 ? `Multiple queries executed. Last operation: ${affectedRows} row(s) affected` : `${affectedRows} row(s) affected`;
              } else if (['CREATE', 'DROP', 'ALTER', 'TRUNCATE'].includes(stmtCommandType)) {
                message = statements.length > 1 ? `Multiple queries executed. Last operation ${stmtCommandType} completed` : `Operation ${stmtCommandType} completed successfully`;
              } else if (['GRANT', 'REVOKE'].includes(stmtCommandType)) {
                message = `Permissions updated successfully`;
              } else if (stmtCommandType === 'USE') {
                message = `Database changed successfully`;
              } else {
                message = `Command executed successfully`;
              }
            }
          }
        }
      } catch (err) {
        await connection.end();
        throw err;
      }
      
      await connection.end();
      
      const endTime = performance.now();
      const executionTimeMs = (endTime - startTime).toFixed(2);

      // 4. Save to Query History
      if (userId) {
        try {
          await prisma.queryHistory.create({
            data: {
              userId,
              prompt: '-- Terminal Execution',
              generatedSql: query,
              explanation: message, // Storing the execution result message
              operationType: `TERMINAL_${commandType}`,
            }
          });
        } catch (historyErr) {
          console.error("Failed to save query history:", historyErr);
          // Don't fail the execution if history fails
        }
      }

      res.json({ 
        success: true, 
        data, 
        metadata: {
          executionTimeMs,
          affectedRows,
          rowCount: data.length,
          commandType,
          message
        }
      });
    } catch (error) {
      console.error("Terminal Execution Error:", error);
      res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to execute query." 
      });
    }
  }
};
