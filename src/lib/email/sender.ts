// EMAIL segment — sender interface + mock implementation.
// Traces to docs/llds/email.md and docs/specs/email.md.

export interface EmailMessage {
  to: string;
  subject: string;
  body: string; // plain text (MVP)
}

export interface EmailSender {
  /** Resolves on success; rejects on delivery failure. */
  send(message: EmailMessage): Promise<void>;
}

export interface MockEmailSenderOptions {
  failing?: boolean;
}

/**
 * Records "sent" messages; can be constructed in a failing mode to exercise the
 * best-effort failure path.
 * @spec EMAIL-API-001, EMAIL-API-002
 */
export class MockEmailSender implements EmailSender {
  readonly sent: EmailMessage[] = [];
  private readonly failing: boolean;

  constructor(options: MockEmailSenderOptions = {}) {
    this.failing = options.failing ?? false;
  }

  async send(message: EmailMessage): Promise<void> {
    if (this.failing) throw new Error("MockEmailSender: simulated delivery failure");
    this.sent.push(message);
  }
}

let singleton: EmailSender | null = null;

export function getEmailSender(): EmailSender {
  if (!singleton) singleton = new MockEmailSender();
  return singleton;
}
