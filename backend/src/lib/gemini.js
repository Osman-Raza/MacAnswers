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
import Groq from "groq-sdk";
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function generateAnswer(question, chunks) {
  const context = chunks
    .map((c, i) => `[${i + 1}] (${c.source_name} — ${c.source_url})\n${c.content}`)
    .join("\n\n");

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You are MacAnswers, a helpful assistant for McMaster University students.
Answer questions ONLY using the provided context chunks.
Always end your answer with the source URL on its own line, formatted as:
Source: <url>
If the context does not contain enough information to answer confidently, reply ONLY with:
LOW_CONFIDENCE: <source_url>
Do not make up information. Do not reference anything outside the provided chunks.`
      },
      {
        role: "user",
        content: `--- CONTEXT ---\n${context}\n\n--- QUESTION ---\n${question}`
      }
    ],
  });

  const text = completion.choices[0].message.content.trim();

  if (text.startsWith("LOW_CONFIDENCE:")) {
    const source = text.replace("LOW_CONFIDENCE:", "").trim();
    return { answer: null, source, lowConfidence: true };
  }

  const sourceMatch = text.match(/Source:\s*(https?:\/\/\S+)/i);
  const source = sourceMatch ? sourceMatch[1] : chunks[0]?.source_url ?? "";
  const answer = text.replace(/Source:\s*https?:\/\/\S+/i, "").trim();

  return { answer, source, lowConfidence: false };
}