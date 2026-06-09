import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ── Allowed tables whitelist ──────────────────────────────────────────────────
const ALLOWED_TABLES = new Set([
  "projects", "tasks", "meetings", "team_messages", "team_members", "departments",
]);

// ── Allowed origins (CORS) ────────────────────────────────────────────────────
const ALLOWED_ORIGINS = new Set([
  "https://bisoky-wm.onrender.com",
  "http://localhost:3000",
]);

// ── Rate limiter: 200 req / 60s per IP ───────────────────────────────────────
const _hits = new Map<string, [number, number]>(); // ip -> [count, resetAt]

function isRateLimited(req: NextRequest): boolean {
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const now = Date.now();
  const rec = _hits.get(ip);
  if (!rec || now > rec[1]) { _hits.set(ip, [1, now + 60_000]); return false; }
  if (rec[0] >= 200) return true;
  rec[0]++;
  return false;
}

// ── Origin guard ──────────────────────────────────────────────────────────────
function isAllowedOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin requests have no Origin header
  return ALLOWED_ORIGINS.has(origin);
}

// ── Input validation ──────────────────────────────────────────────────────────
function validateItems(table: string, items: unknown): string | null {
  if (!Array.isArray(items)) return "items must be an array";
  if (items.length > 500) return "max 500 items per request";
  if (table === "departments") {
    if (items.some((d: any) => typeof d?.key !== "string" || !d.key))
      return "every department item must have a non-empty string key";
  } else {
    if (items.some((x: any) => x?.id === undefined || x?.id === null))
      return "every item must have an id";
  }
  return null;
}

// ── Session guard ─────────────────────────────────────────────────────────────
async function requireUser() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

// ── CORS preflight ────────────────────────────────────────────────────────────
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "";
  if (!ALLOWED_ORIGINS.has(origin)) return new NextResponse(null, { status: 403 });
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    },
  });
}

// ── GET /api/data — load all tables ──────────────────────────────────────────
export async function GET(req: NextRequest) {
  if (isRateLimited(req))     return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  if (!isAllowedOrigin(req))  return NextResponse.json({ error: "Forbidden" },         { status: 403 });

  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const a = createAdminClient();
  const [d, p, t, m, msg, mem] = await Promise.all([
    a.from("departments").select("data").order("key"),
    a.from("projects").select("data").order("created_at"),
    a.from("tasks").select("data").order("created_at"),
    a.from("meetings").select("data").order("created_at"),
    a.from("team_messages").select("data").order("created_at"),
    a.from("team_members").select("data"),
  ]);

  return NextResponse.json({
    depts:    (d.data   || []).map((r: any) => r.data),
    projects: (p.data   || []).map((r: any) => r.data),
    tasks:    (t.data   || []).map((r: any) => r.data),
    meetings: (m.data   || []).map((r: any) => r.data),
    messages: (msg.data || []).map((r: any) => r.data),
    members:  (mem.data || []).map((r: any) => r.data),
  });
}

// ── POST /api/data — sync a table (upsert all, delete removed) ───────────────
export async function POST(req: NextRequest) {
  if (isRateLimited(req))    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  if (!isAllowedOrigin(req)) return NextResponse.json({ error: "Forbidden" },         { status: 403 });

  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const { table, items } = body ?? {};
  if (typeof table !== "string" || !ALLOWED_TABLES.has(table))
    return NextResponse.json({ error: "Invalid or missing table" }, { status: 400 });

  // Validate non-empty payloads
  if (items?.length) {
    const err = validateItems(table, items);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }

  const a = createAdminClient();

  // ── departments ────────────────────────────────────────────────────────────
  if (table === "departments") {
    if (!items?.length) return NextResponse.json({ ok: true });
    const { data: existing } = await a.from("departments").select("key");
    const existingKeys = (existing || []).map((x: any) => x.key);
    const newKeys = (items as any[]).map((d: any) => d.key);
    const toDelete = existingKeys.filter((k: string) => !newKeys.includes(k));
    if (toDelete.length) await a.from("departments").delete().in("key", toDelete);
    await a.from("departments").upsert(
      (items as any[]).map((d: any) => ({ key: d.key, data: d, updated_at: new Date().toISOString() }))
    );
    return NextResponse.json({ ok: true });
  }

  // ── all other tables ───────────────────────────────────────────────────────
  if (!items?.length) {
    await a.from(table).delete().neq("id", -1);
    return NextResponse.json({ ok: true });
  }

  const withTs = ["projects", "tasks", "team_members"].includes(table);
  await a.from(table).upsert(
    (items as any[]).map((item: any) => ({
      id: item.id,
      data: item,
      ...(withTs ? { updated_at: new Date().toISOString() } : {}),
    }))
  );
  const ids = (items as any[]).map((x: any) => x.id);
  await a.from(table).delete().not("id", "in", `(${ids.join(",")})`);

  return NextResponse.json({ ok: true });
}

// ── DELETE /api/data — delete a single row ────────────────────────────────────
export async function DELETE(req: NextRequest) {
  if (isRateLimited(req))    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  if (!isAllowedOrigin(req)) return NextResponse.json({ error: "Forbidden" },         { status: 403 });

  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const { table, id } = body ?? {};
  if (typeof table !== "string" || !ALLOWED_TABLES.has(table))
    return NextResponse.json({ error: "Invalid table" }, { status: 400 });
  if (id === undefined || id === null)
    return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await createAdminClient().from(table).delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
