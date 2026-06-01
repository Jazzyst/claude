// @vitest-environment node
import { webcrypto } from "node:crypto";
// jose's webapi build requires a global `crypto` — polyfill for Node 18
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto });
}

import { describe, test, expect, vi, beforeEach } from "vitest";
import { jwtVerify, SignJWT } from "jose";

vi.mock("server-only", () => ({}));

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

const { createSession, getSession } = await import("../auth");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createSession", () => {
  test("sets the auth-token cookie", async () => {
    await createSession("user-1", "user@example.com");

    expect(mockCookieStore.set).toHaveBeenCalledOnce();
    const [name] = mockCookieStore.set.mock.calls[0];
    expect(name).toBe("auth-token");
  });

  test("cookie value is a JWT (three dot-separated segments)", async () => {
    await createSession("user-1", "user@example.com");

    const [, token] = mockCookieStore.set.mock.calls[0];
    expect(token.split(".")).toHaveLength(3);
  });

  test("cookie has httpOnly, sameSite lax, and path /", async () => {
    await createSession("user-1", "user@example.com");

    const [, , options] = mockCookieStore.set.mock.calls[0];
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  test("cookie expires approximately 7 days from now", async () => {
    const before = Date.now();
    await createSession("user-1", "user@example.com");
    const after = Date.now();

    const [, , options] = mockCookieStore.set.mock.calls[0];
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    expect(options.expires.getTime()).toBeGreaterThanOrEqual(before + sevenDays - 1000);
    expect(options.expires.getTime()).toBeLessThanOrEqual(after + sevenDays + 1000);
  });

  test("JWT payload contains userId and email", async () => {
    await createSession("user-42", "alice@example.com");

    const [, token] = mockCookieStore.set.mock.calls[0];
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "development-secret-key"
    );
    const { payload } = await jwtVerify(token, secret);

    expect(payload.userId).toBe("user-42");
    expect(payload.email).toBe("alice@example.com");
  });

  test("different users receive different tokens", async () => {
    await createSession("user-1", "user1@example.com");
    await createSession("user-2", "user2@example.com");

    const [, token1] = mockCookieStore.set.mock.calls[0];
    const [, token2] = mockCookieStore.set.mock.calls[1];
    expect(token1).not.toBe(token2);
  });

  test("secure flag is false outside production", async () => {
    const original = process.env.NODE_ENV;
    // NODE_ENV is read-only in some environments; guard the assignment
    try {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "test",
        writable: true,
        configurable: true,
      });
    } catch {
      // already writable
      process.env.NODE_ENV = "test";
    }

    await createSession("user-1", "user@example.com");

    const [, , options] = mockCookieStore.set.mock.calls[0];
    expect(options.secure).toBe(false);

    try {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: original,
        writable: true,
        configurable: true,
      });
    } catch {
      process.env.NODE_ENV = original;
    }
  });

  test("secure flag is true in production", async () => {
    try {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "production",
        writable: true,
        configurable: true,
      });
    } catch {
      process.env.NODE_ENV = "production";
    }

    await createSession("user-1", "user@example.com");

    const [, , options] = mockCookieStore.set.mock.calls[0];
    expect(options.secure).toBe(true);

    try {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "test",
        writable: true,
        configurable: true,
      });
    } catch {
      process.env.NODE_ENV = "test";
    }
  });
});

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "development-secret-key"
);

async function mintToken(
  payload: Record<string, unknown>,
  expiresIn = "7d"
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

describe("getSession", () => {
  test("returns null when no cookie is present", async () => {
    mockCookieStore.get.mockReturnValue(undefined);

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns null when cookie value is an empty string", async () => {
    mockCookieStore.get.mockReturnValue({ value: "" });

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns null when token is malformed", async () => {
    mockCookieStore.get.mockReturnValue({ value: "not.a.jwt" });

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns null when token is signed with a different secret", async () => {
    const wrongSecret = new TextEncoder().encode("wrong-secret");
    const token = await new SignJWT({ userId: "u1", email: "a@b.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .setIssuedAt()
      .sign(wrongSecret);
    mockCookieStore.get.mockReturnValue({ value: token });

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns null when token is expired", async () => {
    const token = await mintToken(
      { userId: "u1", email: "a@b.com" },
      "-1s"
    );
    mockCookieStore.get.mockReturnValue({ value: token });

    const session = await getSession();

    expect(session).toBeNull();
  });

  test("returns payload with userId and email for a valid token", async () => {
    const token = await mintToken({ userId: "user-99", email: "bob@example.com" });
    mockCookieStore.get.mockReturnValue({ value: token });

    const session = await getSession();

    expect(session).not.toBeNull();
    expect(session!.userId).toBe("user-99");
    expect(session!.email).toBe("bob@example.com");
  });

  test("reads the cookie named auth-token", async () => {
    const token = await mintToken({ userId: "u1", email: "a@b.com" });
    mockCookieStore.get.mockReturnValue({ value: token });

    await getSession();

    expect(mockCookieStore.get).toHaveBeenCalledWith("auth-token");
  });
});
