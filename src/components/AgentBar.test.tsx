import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgentBar } from "@/components/AgentBar";
import type { Agent } from "@/lib/auth/types";

const agent: Agent = { id: 1, email: "sam@example.com", name: "Sam Rivera", createdAt: "2026-06-10T00:00:00.000Z" };

describe("AgentBar", () => {
  it("shows the signed-in agent and logs out", async () => {
    // @spec AUTH-UI-004
    const onLogout = vi.fn();
    render(<AgentBar agent={agent} onLogout={onLogout} />);
    expect(screen.getByText(/sam rivera/i)).toBeInTheDocument(); // current agent shown
    await userEvent.click(screen.getByRole("button", { name: /log ?out|sign ?out/i }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
