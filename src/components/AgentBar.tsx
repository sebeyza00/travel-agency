"use client";
// AUTH segment UI — signed-in agent indicator + logout.
// @spec AUTH-UI-004

import type { Agent } from "@/lib/auth/types";

export interface AgentBarProps {
  agent: Agent;
  onLogout: () => void;
}

export function AgentBar({ agent, onLogout }: AgentBarProps) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-slate-600">
        {agent.name} <span className="text-slate-400">({agent.email})</span>
      </span>
      <button type="button" onClick={onLogout} className="rounded border border-slate-300 px-2 py-1">
        Log out
      </button>
    </div>
  );
}
