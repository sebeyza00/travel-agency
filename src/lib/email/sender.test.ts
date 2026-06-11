import { describe, it, expect } from "vitest";
import { MockEmailSender } from "@/lib/email/sender";

const msg = { to: "cust@example.com", subject: "Your booking", body: "..." };

describe("MockEmailSender", () => {
  it("records a message it successfully sends", async () => {
    // @spec EMAIL-API-001
    const sender = new MockEmailSender();
    await sender.send(msg);
    expect(sender.sent).toHaveLength(1);
    expect(sender.sent[0].to).toBe("cust@example.com");
  });

  it("rejects and records nothing when constructed in failing mode", async () => {
    // @spec EMAIL-API-002
    const sender = new MockEmailSender({ failing: true });
    await expect(sender.send(msg)).rejects.toThrow();
    expect(sender.sent).toHaveLength(0);
  });
});
