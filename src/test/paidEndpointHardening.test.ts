import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(resolve(p), "utf-8");

const migration = read("supabase/migrations/20260724034533_ecba35d7-04c8-49dd-9e22-4f9bcb56a480.sql");
const evaluateGauntlet = read("supabase/functions/evaluate-gauntlet/index.ts");
const roleplayAnalyze = read("supabase/functions/roleplay-analyze/index.ts");
const roleplayVoiceAnalyze = read("supabase/functions/roleplay-voice-analyze/index.ts");
const scoreObjection = read("supabase/functions/score-objection-response/index.ts");
const transcribe = read("supabase/functions/transcribe-voice-response/index.ts");
const appendTranscript = read("supabase/functions/roleplay-append-transcript/index.ts");
const abandon = read("supabase/functions/roleplay-abandon-session/index.ts");
const useGauntlet = read("src/hooks/useGauntlet.ts");
const useAudioTraining = read("src/hooks/useAudioTraining.ts");
const roleplayPage = read("src/pages/RoleplaySession.tsx");
const unfinishedPrompt = read("src/components/roleplay/UnfinishedSessionPrompt.tsx");
const edgeAuth = read("supabase/functions/_shared/edgeAuth.ts");

const paidFunctions = [
  ["evaluate-gauntlet", evaluateGauntlet],
  ["roleplay-analyze", roleplayAnalyze],
  ["roleplay-voice-analyze", roleplayVoiceAnalyze],
  ["score-objection-response", scoreObjection],
  ["transcribe-voice-response", transcribe],
] as const;

describe("migration locks down completions + sessions", () => {
  it("revokes client writes on user_gauntlet_completions and keeps SELECT only", () => {
    expect(migration).toMatch(/REVOKE INSERT, UPDATE, DELETE ON public\.user_gauntlet_completions FROM PUBLIC, anon, authenticated/);
    expect(migration).toMatch(/GRANT SELECT ON public\.user_gauntlet_completions TO authenticated/);
    expect(migration).toMatch(/DROP POLICY IF EXISTS "Users can create their own completions"/);
    expect(migration).toMatch(/DROP POLICY IF EXISTS "Users can update their own completions"/);
  });

  it("revokes client UPDATE/DELETE on roleplay_sessions and drops the update policy", () => {
    expect(migration).toMatch(/REVOKE UPDATE, DELETE ON public\.roleplay_sessions FROM PUBLIC, anon, authenticated/);
    expect(migration).toMatch(/DROP POLICY IF EXISTS "Users can update own sessions"/);
  });

  it("provides service-only claim/finalize/release/abandon RPCs with revoked auth grants", () => {
    for (const fn of [
      "svc_claim_roleplay_analysis",
      "svc_finalize_roleplay_analysis",
      "svc_release_roleplay_claim",
      "svc_abandon_roleplay_session",
      "svc_upsert_gauntlet_completion",
    ]) {
      expect(migration).toContain(fn);
      const re = new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn}[^;]*FROM PUBLIC, anon, authenticated`);
      expect(migration).toMatch(re);
      const grant = new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${fn}[^;]*TO service_role`);
      expect(migration).toMatch(grant);
    }
  });

  it("finalize is idempotent via xp_awards ledger and unique event", () => {
    expect(migration).toMatch(/INSERT INTO public\.xp_awards[\s\S]*'roleplay_completed'/);
    expect(migration).toMatch(/unique_violation/);
    expect(migration).toMatch(/DELETE FROM public\.roleplay_analysis_claims/);
    // Only one activity insert per finalize path
    expect(migration.match(/INSERT INTO public\.activities/g) ?? []).toHaveLength(1);
  });
});

describe("shared edge auth helper", () => {
  it("is POST-only and rejects missing/blank bearer tokens", () => {
    expect(edgeAuth).toMatch(/req\.method !== "POST"/);
    expect(edgeAuth).toContain("method_not_allowed");
    expect(edgeAuth).toContain("unauthorized");
    expect(edgeAuth).toContain("authClient.auth.getUser");
  });
});

describe("all paid endpoints authenticate, rate-limit, and never trust the anon key", () => {
  for (const [name, src] of paidFunctions) {
    it(`${name}: uses authenticatePost + enforceRateLimit + no publishable-key fallback`, () => {
      expect(src, name).toContain("authenticatePost(req)");
      expect(src, name).toContain("enforceRateLimit(");
      expect(src, name).not.toMatch(/SUPABASE_ANON_KEY[^)]*Authorization/);
      // No raw provider body / user answer / transcript preview logging
      expect(src, name).not.toMatch(/console\.log\([^)]*(transcript|user_response|user_message|raw|preview|arguments)/i);
    });
  }

  it("evaluate-gauntlet loads challenge server-side and never trusts client challengeContent/passing_score", () => {
    expect(evaluateGauntlet).not.toMatch(/challengeContent/);
    expect(evaluateGauntlet).toMatch(/from\(["']gauntlet_challenges["']\)/);
    expect(evaluateGauntlet).toMatch(/svc_upsert_gauntlet_completion/);
    // Never returns a fake pass when the AI key is missing
    expect(evaluateGauntlet).not.toMatch(/passed:\s*true[^,)]*Great job/);
    expect(evaluateGauntlet).toContain("ai_not_configured");
  });

  it("roleplay-analyze claims atomically, releases on failure, finalizes once", () => {
    expect(roleplayAnalyze).toContain("svc_claim_roleplay_analysis");
    expect(roleplayAnalyze).toContain("svc_finalize_roleplay_analysis");
    expect(roleplayAnalyze).toContain("svc_release_roleplay_claim");
    // Failure paths must release the claim
    const releaseCount = (roleplayAnalyze.match(/svc_release_roleplay_claim/g) ?? []).length;
    expect(releaseCount).toBeGreaterThanOrEqual(3);
    // No direct profile XP writes
    expect(roleplayAnalyze).not.toMatch(/from\(["']profiles["']\)\s*\.update/);
    // No direct roleplay_sessions completion write
    expect(roleplayAnalyze).not.toMatch(/from\(["']roleplay_sessions["']\)\s*\.update/);
    // Bounded input
    expect(roleplayAnalyze).toContain("normalizeTranscript");
    expect(roleplayAnalyze).toMatch(/MAX_MESSAGES\s*=\s*200/);
  });

  it("transcribe-voice-response enforces size/mime and requires exactly one audio field", () => {
    expect(transcribe).toMatch(/MAX_BYTES\s*=\s*20\s*\*\s*1024\s*\*\s*1024/);
    expect(transcribe).toContain("audio_too_large");
    expect(transcribe).toContain("unsupported_audio_type");
    expect(transcribe).toContain("empty_audio");
    expect(transcribe).toMatch(/entries\.length !== 1/);
    // No leaking transcript / provider body / file name in logs
    expect(transcribe).not.toMatch(/console\.log\([^)]*(text|words|transcription|audioFile\.name)/i);
  });

  it("score-objection-response validates categories, difficulties, and clamps AI output", () => {
    expect(scoreObjection).toContain("CATEGORIES");
    expect(scoreObjection).toContain("DIFFICULTIES");
    expect(scoreObjection).toContain("clampInt(parsed.score, 0, 100");
    expect(scoreObjection).not.toMatch(/console\.log\([^)]*(user_response|objection_text)/i);
  });

  it("roleplay-voice-analyze bounds messages and filters win conditions to the server list", () => {
    expect(roleplayVoiceAnalyze).toContain("boundedString(body.user_message, 2000)");
    expect(roleplayVoiceAnalyze).toContain("boundedString(body.agent_message, 2000)");
    expect(roleplayVoiceAnalyze).toMatch(/winSet\.has/);
  });
});

describe("append transcript is auth-bounded and abandon is server-only", () => {
  it("append-transcript authenticates first, then bounds messages/chars", () => {
    expect(appendTranscript).toContain("authenticatePost(req)");
    expect(appendTranscript).toMatch(/MAX_MESSAGES\s*=\s*100/);
    expect(appendTranscript).toMatch(/MAX_MESSAGE_CHARS\s*=\s*5000/);
    expect(appendTranscript).toContain("session_not_active");
    // Server sets timestamp; does not trust client-provided value
    expect(appendTranscript).toContain("nowIso()");
  });

  it("roleplay-abandon-session delegates to the service-only RPC", () => {
    expect(abandon).toContain("authenticatePost(req)");
    expect(abandon).toContain("svc_abandon_roleplay_session");
  });
});

describe("client hooks no longer write completions or session results directly", () => {
  it("useGauntlet uses functions.invoke for evaluate + skip and no direct completion writes", () => {
    expect(useGauntlet).toContain('supabase.functions.invoke("evaluate-gauntlet"');
    expect(useGauntlet).not.toMatch(/from\(['"]user_gauntlet_completions['"]\)\s*\.insert/);
    expect(useGauntlet).not.toMatch(/from\(['"]user_gauntlet_completions['"]\)\s*\.update/);
    expect(useGauntlet).not.toContain("VITE_SUPABASE_PUBLISHABLE_KEY");
    expect(useGauntlet).not.toContain("award_event_xp"); // XP now server-side
  });

  it("useAudioTraining routes STT + scoring through supabase.functions.invoke", () => {
    expect(useAudioTraining).toContain("supabase.functions.invoke('transcribe-voice-response'");
    expect(useAudioTraining).toContain("supabase.functions.invoke('score-objection-response'");
    // The old raw-fetch call sites (with publishable key bearer) must be gone
    expect(useAudioTraining).not.toMatch(/functions\/v1\/transcribe-voice-response/);
    expect(useAudioTraining).not.toMatch(/functions\/v1\/score-objection-response/);
  });

  it("RoleplaySession routes analyze/abandon/opening line through edge functions", () => {
    expect(roleplayPage).toContain('supabase.functions.invoke("roleplay-analyze"');
    expect(roleplayPage).toContain('supabase.functions.invoke("roleplay-abandon-session"');
    expect(roleplayPage).toContain('supabase.functions.invoke("roleplay-append-transcript"');
    // No direct completion/abandon writes to roleplay_sessions
    expect(roleplayPage).not.toMatch(/from\(["']roleplay_sessions["']\)\s*\.update/);
  });

  it("UnfinishedSessionPrompt uses the authenticated abandon endpoint", () => {
    expect(unfinishedPrompt).toContain('supabase.functions.invoke("roleplay-abandon-session"');
    expect(unfinishedPrompt).not.toMatch(/from\(["']roleplay_sessions["']\)\s*\.update/);
  });
});
