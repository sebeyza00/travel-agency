import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/components/LoginForm";
import type { Agent } from "@/lib/auth/types";

const agent: Agent = { id: 1, email: "sam@example.com", name: "Sam", createdAt: "2026-06-10T00:00:00.000Z" };

describe("LoginForm", () => {
  it("presents email + password fields and signs in on success", async () => {
    // @spec AUTH-UI-001
    const login = vi.fn(() => Promise.resolve(agent));
    const onSuccess = vi.fn();
    render(<LoginForm login={login} onSuccess={onSuccess} />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/email/i), "sam@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "supersecret");
    await userEvent.click(screen.getByRole("button", { name: /log in|sign in/i }));
    expect(login).toHaveBeenCalledWith("sam@example.com", "supersecret");
    expect(await vi.waitFor(() => onSuccess.mock.calls.length)).toBe(1);
  });

  it("shows an error and does not navigate when login fails", async () => {
    // @spec AUTH-UI-002
    const login = vi.fn(() => Promise.reject(new Error("invalid email or password")));
    const onSuccess = vi.fn();
    render(<LoginForm login={login} onSuccess={onSuccess} />);
    await userEvent.type(screen.getByLabelText(/email/i), "sam@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /log in|sign in/i }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
