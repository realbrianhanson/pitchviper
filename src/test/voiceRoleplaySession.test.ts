import { describe, expect, it } from "vitest";
import { buildVoiceRoleplaySessionOptions } from "@/lib/elevenlabsRoleplaySession";

const context = {
  prospectName: "Taylor Martinez",
  prospectTitle: "Office Manager",
  prospectCompany: "Acme Dental",
  sellerCompanyName: "PitchViper",
  productDescription: "Sales performance coaching",
  industry: "Dental",
  targetAudience: "Practice owners",
  valuePropositions: ["More booked consults", "Cleaner follow-up"],
  commonUseCases: ["Objection handling", "Call reviews"],
};

describe("buildVoiceRoleplaySessionOptions", () => {
  it("uses WebRTC tokens without sending disabled ElevenLabs overrides", () => {
    const options = buildVoiceRoleplaySessionOptions(
      {
        conversation_token: "token-123",
        signed_url: "wss://fallback.example",
        scenario_context: "Gatekeeper scenario",
        prospect_name: "Alex Chen",
        scenario_name: "The Gatekeeper",
        difficulty: "medium",
        dynamic_variables: { existing: "kept" },
      },
      context,
    );

    expect(options).toMatchObject({
      conversationToken: "token-123",
      connectionType: "webrtc",
      dynamicVariables: {
        existing: "kept",
        prospect_name: "Alex Chen",
        prospect_title: "Office Manager",
        prospect_company: "Acme Dental",
        scenario_name: "The Gatekeeper",
        difficulty: "medium",
        scenario_context: "Gatekeeper scenario",
        seller_company_name: "PitchViper",
        value_propositions: "More booked consults; Cleaner follow-up",
        common_use_cases: "Objection handling; Call reviews",
      },
    });
    expect(options).not.toHaveProperty("overrides");
  });

  it("falls back to signed URL websocket credentials", () => {
    const options = buildVoiceRoleplaySessionOptions(
      { signed_url: "wss://signed.example", dynamic_variables: null },
      context,
    );

    expect(options).toMatchObject({
      signedUrl: "wss://signed.example",
      connectionType: "websocket",
      dynamicVariables: {
        prospect_name: "Taylor Martinez",
        prospect_title: "Office Manager",
        prospect_company: "Acme Dental",
      },
    });
    expect(options).not.toHaveProperty("conversationToken");
    expect(options).not.toHaveProperty("overrides");
  });

  it("fails closed when the token function returns no credentials", () => {
    expect(() => buildVoiceRoleplaySessionOptions({}, context)).toThrow(
      "No voice connection credentials received",
    );
  });
});