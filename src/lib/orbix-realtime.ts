import type { Dispatch, SetStateAction } from "react";
import { createClient } from "./supabase/client";

type Setter<T> = Dispatch<SetStateAction<T[]>>;

// Generic merge by id — for projects, tasks, meetings, messages, team_members
function mergeById(prev: any[], item: any): any[] {
  if (prev.find(x => x.id === item.id)) return prev.map(x => x.id === item.id ? item : x);
  return [...prev, item];
}
function removeById(prev: any[], id: any): any[] {
  return prev.filter(x => x.id !== id);
}

// Department-specific — primary key is `key` (string)
function mergeDept(prev: any[], item: any): any[] {
  if (prev.find(x => x.key === item.key)) return prev.map(x => x.key === item.key ? item : x);
  return [...prev, item];
}
function removeDept(prev: any[], key: string): any[] {
  return prev.filter(x => x.key !== key);
}

export function subscribeAll(opts: {
  setProjects: Setter<any>;
  setTasks:    Setter<any>;
  setMessages: Setter<any>;
  setMeetings: Setter<any>;
  setDepts:    Setter<any>;
  setUsers:    Setter<any>;
  onRealtimeEvent: () => void;   // called every time a realtime change arrives
}) {
  const s = createClient();
  const rt = opts.onRealtimeEvent;

  // Our DB schema: each row is { id/key, data: JSONB, ... }
  // p.new.data = the actual JS object stored in the JSONB column

  const channel = s
    .channel("biosky-realtime")

    // ── Team Chat ─────────────────────────────────────────────────
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "team_messages" }, p => {
      rt(); opts.setMessages(prev => mergeById(prev, p.new["data"]));
    })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "team_messages" }, p => {
      rt(); opts.setMessages(prev => removeById(prev, p.old["id"]));
    })

    // ── Tasks ─────────────────────────────────────────────────────
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "tasks" }, p => {
      rt(); opts.setTasks(prev => mergeById(prev, p.new["data"]));
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tasks" }, p => {
      rt(); opts.setTasks(prev => prev.map(t => t.id === p.new["id"] ? p.new["data"] : t));
    })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "tasks" }, p => {
      rt(); opts.setTasks(prev => removeById(prev, p.old["id"]));
    })

    // ── Projects ──────────────────────────────────────────────────
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "projects" }, p => {
      rt(); opts.setProjects(prev => mergeById(prev, p.new["data"]));
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "projects" }, p => {
      rt(); opts.setProjects(prev => prev.map(x => x.id === p.new["id"] ? p.new["data"] : x));
    })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "projects" }, p => {
      rt(); opts.setProjects(prev => removeById(prev, p.old["id"]));
    })

    // ── Meetings ──────────────────────────────────────────────────
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "meetings" }, p => {
      rt(); opts.setMeetings(prev => mergeById(prev, p.new["data"]));
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "meetings" }, p => {
      rt(); opts.setMeetings(prev => prev.map(x => x.id === p.new["id"] ? p.new["data"] : x));
    })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "meetings" }, p => {
      rt(); opts.setMeetings(prev => removeById(prev, p.old["id"]));
    })

    // ── Team Members ──────────────────────────────────────────────
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "team_members" }, p => {
      rt(); opts.setUsers(prev => mergeById(prev, p.new["data"]));
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "team_members" }, p => {
      rt(); opts.setUsers(prev => prev.map(x => x.id === p.new["id"] ? p.new["data"] : x));
    })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "team_members" }, p => {
      rt(); opts.setUsers(prev => removeById(prev, p.old["id"]));
    })

    // ── Departments ───────────────────────────────────────────────
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "departments" }, p => {
      rt(); opts.setDepts(prev => mergeDept(prev, p.new["data"]));
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "departments" }, p => {
      rt(); opts.setDepts(prev => prev.map(x => x.key === p.new["key"] ? p.new["data"] : x));
    })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "departments" }, p => {
      rt(); opts.setDepts(prev => removeDept(prev, p.old["key"]));
    })

    .subscribe();

  return () => { s.removeChannel(channel); };
}
