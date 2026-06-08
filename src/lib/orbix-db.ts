// All DB operations go through the /api/data server route.
// The service role key stays server-side — the browser never touches Supabase directly.

export async function loadAll() {
  const res = await fetch("/api/data");
  if (!res.ok) throw new Error(`loadAll failed: ${res.status}`);
  return res.json() as Promise<{
    depts: any[]; projects: any[]; tasks: any[];
    meetings: any[]; messages: any[]; members: any[];
  }>;
}

async function syncTable(table: string, items: any[]) {
  await fetch("/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table, items }),
  });
}

export const syncDepts    = (depts: any[])    => depts.length ? syncTable("departments",   depts)    : Promise.resolve();
export const syncProjects = (projects: any[]) => syncTable("projects",      projects);
export const syncTasks    = (tasks: any[])    => syncTable("tasks",         tasks);
export const syncMeetings = (meetings: any[]) => syncTable("meetings",      meetings);
export const syncMessages = (messages: any[]) => syncTable("team_messages", messages);
export const syncMembers  = (members: any[])  => members.length ? syncTable("team_members", members) : Promise.resolve();

export async function deleteMessage(id: number) {
  await fetch("/api/data", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table: "team_messages", id }),
  });
}
