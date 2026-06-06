## Roleplay Arena — current state (read-only audit)

No code or data changes were made. Here is what already exists.

### 1. ElevenLabs secrets

Both runtime secrets are present in Lovable Cloud:

- `ELEVENLABS_API_KEY` — set
- `ELEVENLABS_AGENT_ID` — set (single agent ID, used for every scenario)

There is no per-scenario agent mapping — every roleplay scenario hits the same ElevenLabs agent.

### 2. Where the AI customer persona lives

The voice agent persona is **not defined in this codebase**. It lives in the ElevenLabs dashboard under the agent referenced by `ELEVENLABS_AGENT_ID` (system prompt, first message, voice, language are all configured there).

The codebase does have rich scenario data in `public.roleplay_scenarios` (8 seeded scenarios — Hot Lead, Price Objector, Tire Kicker, Gatekeeper, Feature Demander, Skeptical CFO, Competitor Loyal, Ghosted Follow-up) with fields: `prospect_persona`, `prospect_situation`, `objections_to_include`, `win_conditions`, `difficulty`, `xp_reward`.

The token edge function builds a `scenarioContext` string from those fields and returns it alongside the signed URL — **but the React client never reads `scenario_context` and never passes overrides to ElevenLabs**. So the agent today behaves the same way for every scenario, with whatever prompt is hard-coded in the ElevenLabs UI. The same applies to `company_settings` (product, value props, industry): fetched in `VoiceRoleplay`, never used.

### 3. The Roleplay Arena page

```text
/roleplay  → RoleplayArena.tsx   (lists 8 scenarios from roleplay_scenarios)
   └─ click scenario → /roleplay/:scenarioId → RoleplaySession.tsx
            ├─ Text mode  → roleplay-chat edge function (Lovable AI, Gemini)
            └─ Voice mode → VoiceRoleplay.tsx → ElevenLabs WebSocket
```

`RoleplayArena.tsx` is purely a scenario picker. The actual session — including voice — runs in `RoleplaySession.tsx` with a Text/Voice tab toggle.

### 4. Voice session: can it actually run?

Yes, the wiring is end-to-end functional:

1. User clicks "Start Voice Call" in `VoiceRoleplay`.
2. Browser mic permission is requested via `getUserMedia`.
3. Client calls the `elevenlabs-roleplay-token` edge function with `scenario_id`.
4. Edge function calls `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=...` server-side using `ELEVENLABS_API_KEY`, returns `{ signed_url, scenario_context }`.
5. Client starts the session with `useConversation` from `@elevenlabs/react` via `conversation.startSession({ signedUrl })` — a **WebSocket** connection (not WebRTC, despite the project memory note).
6. Connection state drives the UI (Connecting / Listening / Speaking, avatar ring + pulse).
7. "End Call" calls `conversation.endSession()` then `onSessionEnd()` which triggers analysis.

Caveats:
- No `agentId`, `conversationToken`, no `overrides`, no `dynamicVariables`, and no `clientTools` are passed — the agent runs purely on its dashboard configuration.
- The token endpoint reads `Authorization` from the request but never validates the JWT; it trusts the header's presence.

### 5. Transcript capture

Partially wired:

- `VoiceRoleplay.onMessage` listens for `user_transcript` and `agent_response` events from ElevenLabs and forwards each line to `RoleplaySession` via `onTranscriptUpdate`.
- `RoleplaySession` appends each line to its in-memory `messages[]` array (same array used by text mode).
- That array is what gets POSTed to `roleplay-analyze` at the end.

Gaps:
- The session row in `roleplay_sessions.transcript` is only seeded with the opening text-mode message; **voice transcript lines are never persisted to that row during the call**. They live only in component state until analysis runs.
- No timestamps, speaker labels, or audio recording are stored.
- Mid-call analysis (`addressed_objection`, `attempted_close`, `win_conditions_achieved`) is fired by the text-mode `roleplay-chat` function only; voice sessions don't get the live win-condition checklist.

### 6. Scoring

Yes, this exists and runs for both modes via `roleplay-analyze`:

- Sends the full transcript + scenario metadata to Lovable AI (`google/gemini-2.5-pro`).
- Returns JSON with: `outcome` (won/lost/progress), `overall_score` 0–100, 6 category scores (Opening, Discovery, Objection Handling, Value, Closing, Control), strengths, improvements, key_moment.
- Calculates `xp_earned` from base XP × outcome multiplier × score bonus, minus 10 XP per hint.
- Writes `score`, `feedback` (JSON), `duration_seconds`, `completed_at`, `status='completed'` back to `roleplay_sessions`.
- Updates `profiles.xp_points`.
- Inserts a `roleplay_completed` row into `activities`.
- Computes "new best score" vs prior completed sessions.

Results render in `RoleplayResults` after the analyzing screen.

### 7. Data on the ground

- `roleplay_scenarios`: 8 rows, seeded.
- `roleplay_sessions`: 68 rows (12 completed, 5 abandoned, **51 in-progress** — likely orphaned sessions from people who closed the tab).

### Summary

| Capability | Status |
|---|---|
| ElevenLabs API key in secrets | Yes |
| Configured agent | Yes (single agent ID, persona lives in ElevenLabs dashboard) |
| System prompt / scenario-specific persona in code | No — built server-side but never sent to the agent |
| Roleplay Arena page | Scenario picker only |
| Start a voice session | Yes, WebSocket via signed URL |
| Token handling | Server-side via `elevenlabs-roleplay-token` edge function |
| Live transcript capture | In-memory only, not persisted mid-call |
| Scoring | Yes — Gemini-based, writes score + XP + activity |
| Live win-condition tracking in voice mode | No (text mode only) |

Nothing changed. Tell me which gaps you want to address next (e.g. push scenario persona into the agent via overrides, persist voice transcript live, switch to WebRTC, add live win-condition tracking, clean up orphaned in-progress sessions) and I'll plan the edits.