"use client";
import { useRouter } from "next/navigation";
import { RegisterForm } from "@/components/RegisterForm";
import type { Agent } from "@/lib/auth/types";

export default function RegisterPage() {
  const router = useRouter();

  async function register(input: { name: string; email: string; password: string }): Promise<Agent> {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message ?? "Could not create the account.");
    }
    return (await res.json()) as Agent;
  }

  return (
    <main className="mx-auto max-w-md p-12">
      <RegisterForm register={register} onSuccess={() => router.push("/")} />
    </main>
  );
}
