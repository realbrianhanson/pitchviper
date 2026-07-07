import { describe, it, expect, vi } from "vitest";
import { enforceRateLimitCore } from "../../supabase/functions/_shared/rateLimit.core";

describe("enforceRateLimitCore", () => {
  it("passes through when the RPC allows the call", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { allowed: true, remaining_minute: 4, remaining_day: 42 },
      error: null,
    });

    const result = await enforceRateLimitCore("user-1", "test-fn", {}, rpc);

    expect(rpc).toHaveBeenCalledWith("check_and_increment_rate_limit", {
      _user_id: "user-1",
      _function_name: "test-fn",
      _per_minute: 10,
      _per_day: 100,
    });
    expect(result.allowed).toBe(true);
    expect(result.response).toBeUndefined();
  });

  it("returns a 429 Response with Retry-After when the RPC denies", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { allowed: false, limit_type: "per_minute", retry_after_seconds: 30 },
      error: null,
    });

    const result = await enforceRateLimitCore("user-1", "test-fn", {}, rpc);

    expect(result.allowed).toBe(false);
    expect(result.response).toBeInstanceOf(Response);
    expect(result.response!.status).toBe(429);
    expect(result.response!.headers.get("Retry-After")).toBe("30");

    const body = await result.response!.json();
    expect(body.error).toBe("rate_limited");
    expect(body.limit_type).toBe("per_minute");
    expect(body.retry_after_seconds).toBe(30);
  });

  it("uses the per-day message when the daily window is exhausted", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { allowed: false, limit_type: "per_day", retry_after_seconds: 3600 },
      error: null,
    });

    const result = await enforceRateLimitCore("user-1", "test-fn", {}, rpc);
    const body = await result.response!.json();
    expect(body.message).toMatch(/Daily limit/i);
  });

  it("respects per-minute and per-day overrides", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { allowed: true }, error: null });

    await enforceRateLimitCore(
      "user-1",
      "chat",
      { perMinute: 30, perDay: 500 },
      rpc,
    );

    expect(rpc).toHaveBeenCalledWith("check_and_increment_rate_limit", {
      _user_id: "user-1",
      _function_name: "chat",
      _per_minute: 30,
      _per_day: 500,
    });
  });

  it("fails open (allows the call) when the RPC itself errors", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "network down" },
    });

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await enforceRateLimitCore("user-1", "test-fn", {}, rpc);
    errSpy.mockRestore();

    expect(result.allowed).toBe(true);
    expect(result.response).toBeUndefined();
    expect(result.info).toEqual({ error: "network down" });
  });
});
