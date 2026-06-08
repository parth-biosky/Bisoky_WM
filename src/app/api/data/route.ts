import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED = new Set([
  "projects", "tasks", "meetings", "team_messages", "team_members", "departments",
]);

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// GET /api/data — load all app data
export async function GET() {
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

// POST /api/data — upsert all rows for a table, delete removed ones
export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { table, items } = await req.json();
  if (!ALLOWED.has(table)) return NextResponse.json({ error: "Invalid table" }, { status: 400 });

  const a = createAdminClient();

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

  if (!items?.length) {
    await a.from(table).delete().neq("id", -1);
    return NextResponse.json({ ok: true });
  }

  const withTimestamp = ["projects", "tasks", "team_members"].includes(table);
  await a.from(table).upsert(
    (items as any[]).map((item: any) => ({
      id: item.id,
      data: item,
      ...(withTimestamp ? { updated_at: new Date().toISOString() } : {}),
    }))
  );
  const ids = (items as any[]).map((item: any) => item.id);
  await a.from(table).delete().not("id", "in", `(${ids.join(",")})`);

  return NextResponse.json({ ok: true });
}

// DELETE /api/data — delete a single row by id
export async function DELETE(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { table, id } = await req.json();
  if (!ALLOWED.has(table)) return NextResponse.json({ error: "Invalid table" }, { status: 400 });

  await createAdminClient().from(table).delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
