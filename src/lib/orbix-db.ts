import { createClient } from "./supabase/client";

const db = () => createClient();

// ─── Load ────────────────────────────────────────────────────────────────────

export async function loadAll() {
  const s = db();
  const [d, p, t, m, msg, mem] = await Promise.all([
    s.from("departments").select("data").order("key"),
    s.from("projects").select("data").order("created_at"),
    s.from("tasks").select("data").order("created_at"),
    s.from("meetings").select("data").order("created_at"),
    s.from("team_messages").select("data").order("created_at"),
    s.from("team_members").select("data"),
  ]);
  return {
    depts:    (d.data   || []).map((r: any) => r.data),
    projects: (p.data   || []).map((r: any) => r.data),
    tasks:    (t.data   || []).map((r: any) => r.data),
    meetings: (m.data   || []).map((r: any) => r.data),
    messages: (msg.data || []).map((r: any) => r.data),
    members:  (mem.data || []).map((r: any) => r.data),
  };
}

// ─── Departments ─────────────────────────────────────────────────────────────

export async function syncDepts(depts: any[]) {
  if (!depts.length) return;
  const s = db();
  const { data: existing } = await s.from("departments").select("key");
  const existingKeys = (existing || []).map((x: any) => x.key);
  const newKeys = depts.map((d) => d.key);
  const toDelete = existingKeys.filter((k: string) => !newKeys.includes(k));
  if (toDelete.length) await s.from("departments").delete().in("key", toDelete);
  await s.from("departments").upsert(depts.map((d) => ({ key: d.key, data: d, updated_at: new Date().toISOString() })));
}

// ─── Projects ────────────────────────────────────────────────────────────────

export async function syncProjects(projects: any[]) {
  const s = db();
  if (!projects.length) {
    await s.from("projects").delete().neq("id", -1);
    return;
  }
  await s.from("projects").upsert(
    projects.map((p) => ({ id: p.id, data: p, updated_at: new Date().toISOString() }))
  );
  const ids = projects.map((p) => p.id);
  await s.from("projects").delete().not("id", "in", `(${ids.join(",")})`);
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export async function syncTasks(tasks: any[]) {
  const s = db();
  if (!tasks.length) {
    await s.from("tasks").delete().neq("id", -1);
    return;
  }
  await s.from("tasks").upsert(
    tasks.map((t) => ({ id: t.id, data: t, updated_at: new Date().toISOString() }))
  );
  const ids = tasks.map((t) => t.id);
  await s.from("tasks").delete().not("id", "in", `(${ids.join(",")})`);
}

// ─── Meetings ────────────────────────────────────────────────────────────────

export async function syncMeetings(meetings: any[]) {
  const s = db();
  if (!meetings.length) {
    await s.from("meetings").delete().neq("id", -1);
    return;
  }
  await s.from("meetings").upsert(meetings.map((m) => ({ id: m.id, data: m })));
  const ids = meetings.map((m) => m.id);
  await s.from("meetings").delete().not("id", "in", `(${ids.join(",")})`);
}

// ─── Team Messages ───────────────────────────────────────────────────────────

export async function syncMessages(messages: any[]) {
  const s = db();
  if (!messages.length) {
    await s.from("team_messages").delete().neq("id", -1);
    return;
  }
  await s.from("team_messages").upsert(messages.map((m) => ({ id: m.id, data: m })));
  const ids = messages.map((m) => m.id);
  await s.from("team_messages").delete().not("id", "in", `(${ids.join(",")})`);
}

export async function deleteMessage(id: number) {
  await db().from("team_messages").delete().eq("id", id);
}

// ─── Team Members ────────────────────────────────────────────────────────────

export async function syncMembers(members: any[]) {
  if (!members.length) return;
  const s = db();
  await s.from("team_members").upsert(
    members.map((m) => ({ id: m.id, data: m, updated_at: new Date().toISOString() }))
  );
  const ids = members.map((m) => m.id);
  await s.from("team_members").delete().not("id", "in", `(${ids.join(",")})`);
}
