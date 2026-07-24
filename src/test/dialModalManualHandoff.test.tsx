import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// -----------------------------------------------------------------------------
// Regression #2 — useWorkspaceSetup must not query provider-specific columns.
// The Aloware per-rep mapping has been retired; mappedRepCount stays 0 until a
// real provider-neutral external-rep mapping exists.
// -----------------------------------------------------------------------------
describe("useWorkspaceSetup provider-neutral cleanup", () => {
  const src = readFileSync("src/hooks/useWorkspaceSetup.ts", "utf8");

  it("no longer queries profiles.aloware_user_id", () => {
    expect(src).not.toContain("aloware_user_id");
  });

  it("no longer selects from profiles for a mapping count", () => {
    // The previous implementation filtered profiles with `.not("aloware_user_id", ...)`.
    // Guard against any resurrection by ensuring no `profiles` select survives here.
    expect(src).not.toMatch(/from\("profiles"\)/);
  });

  it("returns mappedRepCount hard-coded to 0", () => {
    expect(src).toMatch(/mappedRepCount:\s*0/);
  });
});

// -----------------------------------------------------------------------------
// Regression #1 — Manual button opens LogCallModal with initial contact data.
// -----------------------------------------------------------------------------

// Silence the useCallLogging hook — we only care that the form renders with
// hydrated fields, not that it submits.
vi.mock("@/hooks/useCallLogging", () => ({
  useCallLogging: () => ({
    logCall: vi.fn(),
    isLogging: false,
    commonObjections: [] as string[],
  }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null }) }),
      }),
    }),
    rpc: async () => ({ data: null, error: null }),
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/components/research/ResearchButton", () => ({
  ResearchButton: () => null,
}));

vi.mock("@/components/ui/gold-celebration", () => ({
  fireGoldCelebration: () => {},
}));

import { ClickToDialProvider, useClickToDialContext } from "@/contexts/ClickToDialContext";
import { DialModal } from "@/components/calls/DialModal";
import { GlobalLogCallModal } from "@/components/calls/GlobalLogCallModal";

function OpenDialButton() {
  const { openDialModal } = useClickToDialContext();
  return (
    <button
      type="button"
      onClick={() =>
        openDialModal({
          phoneNumber: "+15550001111",
          contactName: "Jane Prospect",
          companyName: "Acme Widgets",
        })
      }
    >
      trigger
    </button>
  );
}

describe("DialModal → LogCallModal manual handoff", () => {
  it("opens LogCallModal with contact, company, phone, and outbound direction pre-filled", async () => {
    render(
      <ClickToDialProvider>
        <OpenDialButton />
        <DialModal />
        <GlobalLogCallModal />
      </ClickToDialProvider>,
    );

    fireEvent.click(screen.getByText("trigger"));
    const manualBtn = await screen.findByRole("button", { name: /log call manually/i });
    fireEvent.click(manualBtn);

    // Handoff is deferred via setTimeout(0); waitFor polls until the manual
    // form renders with hydrated fields.
    const contactInput = (await screen.findByLabelText(/contact name/i, {}, { timeout: 2000 })) as HTMLInputElement;
    const companyInput = screen.getByLabelText(/company/i) as HTMLInputElement;
    const phoneInput = screen.getByLabelText(/phone number/i) as HTMLInputElement;

    await waitFor(() => {
      expect(contactInput.value).toBe("Jane Prospect");
    });
    expect(companyInput.value).toBe("Acme Widgets");
    expect(phoneInput.value).toBe("+15550001111");

    // Outbound direction button reflects the pre-filled selection.
    const outbound = screen.getByRole("button", { name: /outbound/i });
    expect(outbound.className).toMatch(/border-primary/);
  });
});
