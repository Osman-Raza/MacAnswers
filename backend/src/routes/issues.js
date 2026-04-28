import { Router } from "express";
import { z } from "zod";
import supabase from "../lib/supabase.js";

const router = Router();

const CATEGORIES = ["electrical", "printer", "accessibility", "safety", "hvac", "plumbing", "wifi", "other"];

const IssueSchema = z.object({
  title: z.string().min(5).max(120),
  description: z.string().max(500).optional(),
  category: z.enum(CATEGORIES),
  latitude: z.number().min(43.2).max(43.3),   // rough McMaster campus bounds
  longitude: z.number().min(-79.95).max(-79.9),
  building: z.string().max(80).optional(),
});

// ── GET /api/issues — list open issues ────────────────────────────────────────
router.get("/", async (_req, res) => {
  const { data, error } = await supabase
    .from("campus_issues")
    .select("id, title, description, category, status, latitude, longitude, building, upvotes, reported_at")
    .neq("status", "resolved")
    .order("upvotes", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// ── POST /api/issues — report a new issue ────────────────────────────────────
router.post("/", async (req, res) => {
  const parsed = IssueSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid issue data.", details: parsed.error.flatten() });
  }

  const { data, error } = await supabase
    .from("campus_issues")
    .insert(parsed.data)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
});

// ── POST /api/issues/:id/upvote ───────────────────────────────────────────────
router.post("/:id/upvote", async (req, res) => {
  const { id } = req.params;
  const { voterToken } = req.body;

  if (!voterToken || typeof voterToken !== "string") {
    return res.status(400).json({ error: "voterToken required." });
  }

  const { error } = await supabase.rpc("increment_upvote", {
    issue_id: id,
    voter: voterToken,
  });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

// ── PATCH /api/issues/:id/resolve — mark resolved ────────────────────────────
router.patch("/:id/resolve", async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("campus_issues")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

export default router;
