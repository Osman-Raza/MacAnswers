import { Router } from "express";
import supabase from "../lib/supabase.js";

const router = Router();

// HSR GTFS static files live at:
// https://www.hamilton.ca/sites/default/files/media/browser/2022-07/HSR_GTFS.zip
// For real-time arrivals use the GTFS-RT feed.
// This route returns the next departures for a given route number from cache
// (scrapers pre-load a `transit_schedule` table — see scraper/scrapers/hsr.py).

// ── GET /api/transit/next?route=51&stop=3456 ──────────────────────────────────
router.get("/next", async (req, res) => {
  const { route, stop } = req.query;

  if (!route) {
    return res.status(400).json({ error: "route query param required." });
  }

  try {
    // Query pre-parsed schedule from Supabase (loaded by scraper)
    let query = supabase
      .from("transit_departures")
      .select("route_short_name, trip_headsign, departure_time, stop_id, stop_name")
      .eq("route_short_name", route)
      .order("departure_time", { ascending: true })
      .limit(5);

    if (stop) query = query.eq("stop_id", stop);

    const { data, error } = await query;
    if (error) throw error;

    // Filter to only upcoming departures (today)
    const now = new Date();
    const todaySeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    const upcoming = (data || []).filter((d) => {
      const [h, m, s] = d.departure_time.split(":").map(Number);
      return h * 3600 + m * 60 + s > todaySeconds;
    });

    return res.json({ route, upcoming });
  } catch (err) {
    console.error("Transit error:", err);
    return res.status(500).json({ error: "Could not fetch transit data." });
  }
});

// ── GET /api/transit/shuttle — McMaster shuttle schedule ─────────────────────
router.get("/shuttle", async (_req, res) => {
  const { data, error } = await supabase
    .from("shuttle_schedule")
    .select("*")
    .order("day_order", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

export default router;
