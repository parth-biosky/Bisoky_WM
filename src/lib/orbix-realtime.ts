import type { Dispatch, SetStateAction } from "react";
import { createClient } from "./supabase/client";

type Setter<T> = Dispatch<SetStateAction<T[]>>;

/**
 * Safe merge — returns the SAME array reference if nothing changed.
 * Same reference = React skips re-render = sync effect doesn't fire = no infinite loop.
 */
function safeById(prev: any[], item: any): any[] {
  const i = prev.findIndex(x => x.id === item.id);
  if (i === -1) return [...prev, item];
  if (JSON.stringify(prev[i]) === JSON.stringify(item)) return prev; // identical → no change
  const next = [...prev]; next[i] = item; return next;
}
function safeByKey(prev: any[], item: any): any[] {
  const i = prev.findIndex(x => x.key === item.key);
  if (i === -1) return [...prev, item];
  if (JSON.stringify(prev[i]) === JSON.stringify(item)) return prev;
  const next = [...prev]; next[i] = item; return next;
}
function dropById(prev: any[], id: any): any[] {
  if (!prev.find(x => x.id === id)) return prev;
  return prev.filter(x => x.id !== id);
}
function dropByKey(prev: any[], key: string): any[] {
  if (!prev.find(x => x.key === key)) return prev;
  return prev.filter(x => x.key !== key);
}

export function subscribeAll(opts: {
  setProjects: Setter<any>;
  setTasks:    Setter<any>;
  setMessages: Setter<any>;
  setMeetings: Setter<any>;
  setDepts:    Setter<any>;
  setUsers:    Setter<any>;
}) {
  const s = createClient();

  // DB schema: each row = { id|key, data: JSONB, ... }
  // Actual app object lives in the `data` column → p.new["data"]

  const channel = s
    .channel("biosky-rt-v2")

    // ── Team Chat ─────────────────────────────────────────────────
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "team_messages" }, ({ new: r }) => {
      opts.setMessages(prev => safeById(prev, r["data"]));
    })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "team_messages" }, ({ old: r }) => {
      opts.setMessages(prev => dropById(prev, r["id"]));
    })

    // ── Tasks (includes subtasks, subtask chat, subtask notes) ────
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "tasks" }, ({ new: r }) => {
      opts.setTasks(prev => safeById(prev, r["data"]));
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tasks" }, ({ new: r }) => {
      opts.setTasks(prev => safeById(prev, r["data"]));
    })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "tasks" }, ({ old: r }) => {
      opts.setTasks(prev => dropById(prev, r["id"]));
    })

    // ── Projects ──────────────────────────────────────────────────
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "projects" }, ({ new: r }) => {
      opts.setProjects(prev => safeById(prev, r["data"]));
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "projects" }, ({ new: r }) => {
      opts.setProjects(prev => safeById(prev, r["data"]));
    })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "projects" }, ({ old: r }) => {
      opts.setProjects(prev => dropById(prev, r["id"]));
    })

    // ── Meetings / Calendar ───────────────────────────────────────
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "meetings" }, ({ new: r }) => {
      opts.setMeetings(prev => safeById(prev, r["data"]));
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "meetings" }, ({ new: r }) => {
      opts.setMeetings(prev => safeById(prev, r["data"]));
    })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "meetings" }, ({ old: r }) => {
      opts.setMeetings(prev => dropById(prev, r["id"]));
    })

    // ── Team Members ──────────────────────────────────────────────
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "team_members" }, ({ new: r }) => {
      opts.setUsers(prev => safeById(prev, r["data"]));
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "team_members" }, ({ new: r }) => {
      opts.setUsers(prev => safeById(prev, r["data"]));
    })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "team_members" }, ({ old: r }) => {
      opts.setUsers(prev => dropById(prev, r["id"]));
    })

    // ── Departments / Categories ──────────────────────────────────
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "departments" }, ({ new: r }) => {
      opts.setDepts(prev => safeByKey(prev, r["data"]));
    })
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "departments" }, ({ new: r }) => {
      opts.setDepts(prev => safeByKey(prev, r["data"]));
    })
    .on("postgres_changes", { event: "DELETE", schema: "public", table: "departments" }, ({ old: r }) => {
      opts.setDepts(prev => dropByKey(prev, r["key"]));
    })

    .subscribe();

  return () => { s.removeChannel(channel); };
}
