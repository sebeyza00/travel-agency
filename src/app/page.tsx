"use client";
// Flight Desk — orchestrates search -> results -> booking for an agent.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SearchForm } from "@/components/SearchForm";
import { ResultsView } from "@/components/ResultsView";
import { BookingFlow } from "@/components/BookingFlow";
import { AgentBar } from "@/components/AgentBar";
import type { SearchCriteria } from "@/lib/search/criteria";
import type { FlightOption, SearchResult } from "@/lib/flights/types";
import type { BookingInput, BookingResult } from "@/lib/booking/types";
import type { Agent } from "@/lib/auth/types";

type Step = "search" | "results" | "booking";

export default function Home() {
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [step, setStep] = useState<Step>("search");
  const [criteria, setCriteria] = useState<SearchCriteria | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [option, setOption] = useState<FlightOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(setAgent)
      .catch(() => setAgent(null));
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  async function handleSearch(c: SearchCriteria) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(c),
      });
      if (!res.ok) throw new Error("search failed");
      const data = (await res.json()) as SearchResult & { criteria: SearchCriteria };
      setCriteria(data.criteria);
      setResult({ options: data.options, total: data.total });
      setStep("results");
    } catch {
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function submitBooking(input: BookingInput): Promise<BookingResult> {
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error("booking failed");
    return (await res.json()) as BookingResult;
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Flight Desk</h1>
        {agent && <AgentBar agent={agent} onLogout={logout} />}
        {step !== "search" && (
          <button
            type="button"
            className="text-sm text-slate-600 underline"
            onClick={() => {
              if (step === "booking") setStep("results");
              else setStep("search");
            }}
          >
            ← Back
          </button>
        )}
      </header>

      {error && (
        <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {step === "search" && <SearchForm onSearch={handleSearch} />}
      {loading && <p className="text-sm text-slate-500">Searching all sources…</p>}

      {step === "results" && result && criteria && (
        <ResultsView
          result={result}
          criteria={criteria}
          onBook={(o) => {
            setOption(o);
            setStep("booking");
          }}
        />
      )}

      {step === "booking" && criteria && option && (
        <BookingFlow criteria={criteria} option={option} submit={submitBooking} />
      )}
    </main>
  );
}
