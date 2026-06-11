import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegisterForm } from "@/components/RegisterForm";
import type { Agent } from "@/lib/auth/types";

const agent: Agent = { id: 1, email: "sam@example.com", name: "Sam Rivera", createdAt: "2026-06-10T00:00:00.000Z" };

describe("RegisterForm", () => {
  it("presents name, email, and password fields and registers on success", async () => {
    // @spec AUTH-UI-003
    const registerFn = vi.fn(() => Promise.resolve(agent));
    const onSuccess = vi.fn();
    render(<RegisterForm register={registerFn} onSuccess={onSuccess} />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/name/i), "Sam Rivera");
    await userEvent.type(screen.getByLabelText(/email/i), "sam@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "supersecret");
    await userEvent.click(screen.getByRole("button", { name: /register|create account|sign up/i }));
    expect(registerFn).toHaveBeenCalledWith({ name: "Sam Rivera", email: "sam@example.com", password: "supersecret" });
    expect(await vi.waitFor(() => onSuccess.mock.calls.length)).toBe(1);
  });
});
