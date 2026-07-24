import { describe, expect, it } from "vitest";
import { parseFunctionErrorCode } from "@/lib/billingErrors";

function makeError(ctx: unknown) {
  return Object.assign(new Error("FunctionHttpError"), { context: ctx });
}

describe("parseFunctionErrorCode", () => {
  it("returns internal_error when there is no context", async () => {
    expect(await parseFunctionErrorCode(makeError(undefined))).toBe("internal_error");
    expect(await parseFunctionErrorCode(null)).toBe("internal_error");
  });

  it("parses a Response body with a known code", async () => {
    const res = new Response(JSON.stringify({ error: "billing_not_configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
    expect(await parseFunctionErrorCode(makeError(res))).toBe("billing_not_configured");
  });

  it("returns internal_error for unknown codes", async () => {
    const res = new Response(JSON.stringify({ error: "totally-made-up" }), { status: 500 });
    expect(await parseFunctionErrorCode(makeError(res))).toBe("internal_error");
  });

  it("falls back to internal_error on invalid JSON", async () => {
    const res = new Response("<html>gateway</html>", { status: 502 });
    expect(await parseFunctionErrorCode(makeError(res))).toBe("internal_error");
  });

  it("supports plain-object context shape", async () => {
    expect(
      await parseFunctionErrorCode(makeError({ error: "use_billing_portal" })),
    ).toBe("use_billing_portal");
    expect(
      await parseFunctionErrorCode(makeError({ error: "nope" })),
    ).toBe("internal_error");
  });

  it("does not consume the original Response body", async () => {
    const res = new Response(JSON.stringify({ error: "forbidden" }));
    await parseFunctionErrorCode(makeError(res));
    // Should still be readable
    expect(await res.json()).toEqual({ error: "forbidden" });
  });
});
