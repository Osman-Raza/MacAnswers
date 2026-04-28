import { Router } from "express";
import { z } from "zod";
import { embed, generateAnswer } from "../lib/gemini.js";
import supabase from "../lib/supabase.js";

const router = Router();

const AskSchema = z.object({
  question: z.string().min(3).max(500),
});

router.post("/", async (req, res) => {
  const parsed = AskSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid question." });
  }

  const { question } = parsed.data;

  try {
    // 1. Embed the question
    const queryEmbedding = await embed(question);

    // 2. Vector similarity search
    const { data: chunks, error } = await supabase.rpc("match_chunks", {
      query_embedding: queryEmbedding,
      match_count: 5,
      match_threshold: 0.45,
    });

    if (error) throw error;

    if (!chunks || chunks.length === 0) {
      return res.json({
        answer: null,
        source: "https://mcmaster.ca",
        lowConfidence: true,
        message: "No relevant information found. Try checking the McMaster website directly.",
      });
    }

    // 3. Generate answer
    const { answer, source, lowConfidence } = await generateAnswer(question, chunks);

    return res.json({ answer, source, lowConfidence });
  } catch (err) {
    console.error("Ask error:", err);
    return res.status(500).json({ error: "Something went wrong. Try again." });
  }
});

export default router;
