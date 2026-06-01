import { createClient } from "./supabase/client";

type Setter<T> = React.Dispatch<React.SetStateAction<T[]>>;

function merge<T extends { id: any }>(prev: T[], item: T): T[] {
  const exists = prev.find(x => x.id === item.id);
  if (exists) return prev.map(x => x.id === item.id ? item : x);
  return [...prev, item];
}

function remove<T extends { id: any }>(prev: T[], id: any): T[] {
  return prev.filter(x => x.id !== id);
}

export function subscribeAll(opts: {
  setProjects: Setter<any>;
  setTasks: Setter<any>;
  setMessages: Setter<any>;
  setMeetings: Setter<any>;
  setDepts: Setter<any>;
  setUsers: Setter<any>;
}) {
  const s = createClient();

  const channel = s
    .channel("biosky-realtime")

    // ── Team Chat ─────────────────────────────────────────────────
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "team_messages" }, p => {
      opts.setMessages(prev => merge(prev, p.new.data));
    })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "team_messages" }, p => {
      opts.setMessages(prev => remove(prev, p.old.id));
    })

    // ── Tasks ─────────────────────────────────────────────────────
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "tasks" }, p => {
      opts.setTasks(prev => merge(prev, p.new.data));
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tasks" }, p => {
      opts.setTasks(prev => prev.map(t => t.id === p.new.id ? p.new.data : t));
    })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "tasks" }, p => {
      opts.setTasks(prev => remove(prev, p.old.id));
    })

    // ── Projects ──────────────────────────────────────────────────
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "projects" }, p => {
      opts.setProjects(prev => merge(prev, p.new.data));
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "projects" }, p => {
      opts.setProjects(prev => prev.map(x => x.id === p.new.id ? p.new.data : x));
    })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "projects" }, p => {
      opts.setProjects(prev => remove(prev, p.old.id));
    })

    // ── Meetings ──────────────────────────────────────────────────
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "meetings" }, p => {
      opts.setMeetings(prev => merge(prev, p.new.data));
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "meetings" }, p => {
      opts.setMeetings(prev => prev.map(x => x.id === p.new.id ? p.new.data : x));
    })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "meetings" }, p => {
      opts.setMeetings(prev => remove(prev, p.old.id));
    })

    // ── Team Members ──────────────────────────────────────────────
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "team_members" }, p => {
      opts.setUsers(prev => merge(prev, p.new.data));
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "team_members" }, p => {
      opts.setUsers(prev => prev.map(x => x.id === p.new.id ? p.new.data : x));
    })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "team_members" }, p => {
      opts.setUsers(prev => remove(prev, p.old.id));
    })

    // ── Departments ───────────────────────────────────────────────
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "departments" }, p => {
      opts.setDepts(prev => merge(prev, p.new.data));
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "departments" }, p => {
      opts.setDepts(prev => prev.map(x => x.key === p.new.key ? p.new.data : x));
    })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "departments" }, p => {
      opts.setDepts(prev => remove(prev, p.old.key));
    })

    .subscribe();

  // Return unsubscribe function
  return () => { s.removeChannel(channel); };
}
