"use client";
// AUTH segment UI — login form.
// @spec AUTH-UI-001, AUTH-UI-002

import { useState } from "react";
import type { Agent } from "@/lib/auth/types";

export interface LoginFormProps {
  login: (email: string, password: string) => Promise<Agent>;
  onSuccess: (agent: Agent) => void;
}

export function LoginForm({ login, onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const agent = await login(email, password);
      onSuccess(agent);
    } catch {
      setError("Invalid email or password.");
    } finally {
      setBusy(false);
    }
  };

  const inputClass = "rounded border border-slate-300 px-3 py-2 text-sm";

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex w-80 flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6">
      <h1 className="text-lg font-semibold">Log in</h1>
      <div className="flex flex-col gap-1">
        <label htmlFor="login-email" className="text-sm font-medium text-slate-700">Email</label>
        <input id="login-email" type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="login-password" className="text-sm font-medium text-slate-700">Password</label>
        <input id="login-password" type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        Log in
      </button>
      <a href="/register" className="text-center text-sm text-slate-600 underline">Create an account</a>
    </form>
  );
}
