import OpenAI from 'openai';

export const openRouterService = {
  /**
   * Generates a SQL query and metadata based on a prompt and database schema.
   * @param {string} prompt User's natural language request
   * @param {object} schema JSON representation of the database tables and columns
   * @returns {Promise<object>} Parsed JSON response
   */
  async generateSql(prompt, schema) {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not configured.");
    }

    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      // OpenRouter requires HTTP referer and X-Title for rankings, but they are optional.
    });

    const systemInstruction = `You are an expert SQL Developer and Database Architect. 
Your task is to convert natural language prompts into optimized MySQL queries.

RULES:
1. If the provided DATABASE SCHEMA contains relevant tables and columns, you should prioritize using them.
2. However, if the SCHEMA is empty or does not contain tables relevant to the user's request, you MUST generate a general, custom SQL query using standard naming conventions (e.g., 'employees', 'salary') to fulfill the user's request.
3. NEVER return an error saying the table doesn't exist. Always provide a helpful SQL query.
4. Return ONLY a valid JSON object. Do NOT wrap the JSON in markdown code blocks (e.g. \`\`\`json). Just return the raw JSON object.
5. The JSON must exactly match this format without any literal newlines inside the string values. Format the SQL string as a single continuous line, or use properly escaped \\n:
{
  "sql": "SELECT ...;",
  "explanation": "A simple, human-readable explanation of what the query does.",
  "tables": ["table1", "table2"],
  "operation": "SELECT",
  "estimatedRows": "~100",
  "riskLevel": "Low",
  "optimization": "Suggestion on how to optimize the query (e.g. indexes).",
  "alternativeSql": "SELECT ...; /* Provide a valid alternative approach (e.g., using CTEs, subqueries, or different functions) */"
}`;

    const userPrompt = `
DATABASE SCHEMA:
${JSON.stringify(schema, null, 2)}

USER REQUEST:
${prompt}

Remember: Output valid JSON only.`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3-8b-instruct:free",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.1,
      // Optional: response_format: { type: "json_object" } is supported by some OR models,
      // but to be safe across all models, we rely on the prompt instructions.
    });

    const responseText = response.choices[0].message.content.trim();
    
    // Robustly extract JSON object even if the model adds conversational filler or markdown
    let cleanedText = responseText;
    const firstBrace = cleanedText.indexOf('{');
    const lastBrace = cleanedText.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
      cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);
    }

    try {
      return JSON.parse(cleanedText);
    } catch (e) {
      // Attempt to fix unescaped newlines and tabs inside strings
      let inString = false;
      let fixedText = '';
      for (let i = 0; i < cleanedText.length; i++) {
        let char = cleanedText[i];
        if (char === '"' && cleanedText[i-1] !== '\\') {
          inString = !inString;
        }
        
        if (inString) {
          if (char === '\n') fixedText += '\\n';
          else if (char === '\r') fixedText += '\\r';
          else if (char === '\t') fixedText += '\\t';
          else fixedText += char;
        } else {
          fixedText += char;
        }
      }

      try {
        return JSON.parse(fixedText);
      } catch (e2) {
        console.error("Failed to parse OpenRouter response even after fix:", responseText);
        throw new Error("OpenRouter JSON Error. Raw response: " + responseText);
      }
    }
  }
};
