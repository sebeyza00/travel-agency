"use client";
// AUTH segment UI — registration form.
// @spec AUTH-UI-003

import { useState } from "react";
import type { Agent } from "@/lib/auth/types";

export interface RegisterFormProps {
  register: (input: { name: string; email: string; password: string }) => Promise<Agent>;
  onSuccess: (agent: Agent) => void;
}

export function RegisterForm({ register, onSuccess }: RegisterFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const agent = await register({ name, email, password });
      onSuccess(agent);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account.");
    } finally {
      setBusy(false);
    }
  };

  const inputClass = "rounded border border-slate-300 px-3 py-2 text-sm";

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex w-80 flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6">
      <h1 className="text-lg font-semibold">Create an account</h1>
      <div className="flex flex-col gap-1">
        <label htmlFor="reg-name" className="text-sm font-medium text-slate-700">Name</label>
        <input id="reg-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="reg-email" className="text-sm font-medium text-slate-700">Email</label>
        <input id="reg-email" type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="reg-password" className="text-sm font-medium text-slate-700">Password</label>
        <input id="reg-password" type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        Create account
      </button>
      <a href="/login" className="text-center text-sm text-slate-600 underline">Already have an account? Log in</a>
    </form>
  );
}
