"use client";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import type { Agent } from "@/lib/auth/types";

export default function LoginPage() {
  const router = useRouter();

  async function login(email: string, password: string): Promise<Agent> {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error("invalid email or password");
    return (await res.json()) as Agent;
  }

  return (
    <main className="mx-auto max-w-md p-12">
      <LoginForm login={login} onSuccess={() => router.push("/")} />
    </main>
  );
}
