import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ── Embedding ─────────────────────────────────────────────────────────────────
const embeddingModel = genAI.getGenerativeModel({ model: "models/gemini-embedding-001" });

/**
 * Embed a single string. Returns a float array (length 768).
 */
export async function embed(text) {
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}

// ── Generation ────────────────────────────────────────────────────────────────
const generationModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

const SYSTEM_PROMPT = `You are MacAnswers, a helpful assistant for McMaster University students.
Answer questions ONLY using the provided context chunks.
Always end your answer with the source URL on its own line, formatted as:
Source: <url>
If the context does not contain enough information to answer confidently, reply ONLY with:
LOW_CONFIDENCE: <source_url>
Do not make up information. Do not reference anything outside the provided chunks.`;

/**
 * Generate an answer from retrieved chunks.
 * @param {string} question
 * @param {Array<{content: string, source_url: string, source_name: string}>} chunks
 * @returns {{ answer: string, source: string, lowConfidence: boolean }}
 */
export async function generateAnswer(question, chunks) {
  const context = chunks
    .map((c, i) => `[${i + 1}] (${c.source_name} — ${c.source_url})\n${c.content}`)
    .join("\n\n");

  const prompt = `${SYSTEM_PROMPT}

--- CONTEXT ---
${context}

--- QUESTION ---
${question}`;

  const result = await generationModel.generateContent(prompt);
  const text = result.response.text().trim();

  if (text.startsWith("LOW_CONFIDENCE:")) {
    const source = text.replace("LOW_CONFIDENCE:", "").trim();
    return { answer: null, source, lowConfidence: true };
  }

  // Parse "Source: <url>" from the end
  const sourceMatch = text.match(/Source:\s*(https?:\/\/\S+)/i);
  const source = sourceMatch ? sourceMatch[1] : chunks[0]?.source_url ?? "";
  const answer = text.replace(/Source:\s*https?:\/\/\S+/i, "").trim();

  return { answer, source, lowConfidence: false };
}
