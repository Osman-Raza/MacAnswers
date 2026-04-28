import cron from "node-cron";
import { Resend } from "resend";
import supabase from "../lib/supabase.js";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const CATEGORY_LABELS = {
  electrical: "⚡ Electrical",
  printer: "🖨️ Printer",
  accessibility: "♿ Accessibility",
  safety: "🚨 Safety",
  hvac: "🌡️ HVAC",
  plumbing: "🔧 Plumbing",
  wifi: "📶 WiFi",
  other: "📌 Other",
};

async function sendWeeklyDigest() {
  // Fetch top open issues by upvotes
  if (!resend) { console.log("Resend not configured — skipping digest."); return; }
  const { data: issues, error } = await supabase
    .from("campus_issues")
    .select("title, description, category, building, upvotes, reported_at, latitude, longitude")
    .neq("status", "resolved")
    .order("upvotes", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Digest fetch error:", error);
    return;
  }

  if (!issues || issues.length === 0) {
    console.log("No open issues — digest skipped.");
    return;
  }

  const issueRows = issues
    .map(
      (i) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee">${CATEGORY_LABELS[i.category] || i.category}</td>
        <td style="padding:8px;border-bottom:1px solid #eee"><strong>${i.title}</strong><br/><small>${i.description || ""}</small></td>
        <td style="padding:8px;border-bottom:1px solid #eee">${i.building || "—"}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.upvotes}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;font-size:12px">${new Date(i.reported_at).toLocaleDateString()}</td>
      </tr>`
    )
    .join("");

  const html = `
    <h2 style="font-family:sans-serif">MacAnswers — Weekly Campus Issue Digest</h2>
    <p style="font-family:sans-serif;color:#555">Top reported open issues as of ${new Date().toDateString()}.</p>
    <table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:14px">
      <thead>
        <tr style="background:#7a003c;color:white">
          <th style="padding:10px;text-align:left">Category</th>
          <th style="padding:10px;text-align:left">Issue</th>
          <th style="padding:10px;text-align:left">Building</th>
          <th style="padding:10px;text-align:center">Upvotes</th>
          <th style="padding:10px;text-align:left">Reported</th>
        </tr>
      </thead>
      <tbody>${issueRows}</tbody>
    </table>
    <p style="font-family:sans-serif;font-size:12px;color:#999;margin-top:24px">
      This digest is sent automatically every Monday by MacAnswers.
    </p>`;

  await resend.emails.send({
    from: "MacAnswers <digest@macanswers.ca>",
    to: process.env.DIGEST_RECIPIENT_EMAIL || "facilities@mcmaster.ca",
    subject: `MacAnswers Weekly Digest — ${issues.length} open issues`,
    html,
  });

  console.log(`Weekly digest sent: ${issues.length} issues.`);
}

// Run every Monday at 8:00 AM
export function scheduleDigest() {
  cron.schedule("0 8 * * 1", sendWeeklyDigest, { timezone: "America/Toronto" });
  console.log("Weekly digest scheduled (Mondays 8am ET).");
}

export { sendWeeklyDigest };
