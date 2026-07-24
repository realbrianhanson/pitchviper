type DynamicVariables = Record<string, string | number | boolean>;

export interface ElevenLabsRoleplayTokenPayload {
  conversation_token?: string | null;
  signed_url?: string | null;
  dynamic_variables?: DynamicVariables | null;
  scenario_context?: string | null;
  prospect_name?: string | null;
  scenario_name?: string | null;
  difficulty?: string | null;
}

export interface VoiceRoleplaySessionContext {
  prospectName: string;
  prospectTitle: string;
  prospectCompany: string;
  sellerCompanyName?: string | null;
  productDescription?: string | null;
  industry?: string | null;
  targetAudience?: string | null;
  valuePropositions?: string[] | null;
  commonUseCases?: string[] | null;
}

export type ElevenLabsRoleplaySessionOptions = {
  conversationToken?: string;
  signedUrl?: string;
  connectionType: "webrtc" | "websocket";
  dynamicVariables: DynamicVariables;
};

const compactString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const joinList = (value: string[] | null | undefined): string | undefined => {
  if (!Array.isArray(value)) return undefined;
  const joined = value.map((item) => item.trim()).filter(Boolean).join("; ");
  return joined.length > 0 ? joined : undefined;
};

const assignIfPresent = (target: DynamicVariables, key: string, value: unknown) => {
  const normalized = compactString(value);
  if (normalized) target[key] = normalized;
};

export function buildVoiceRoleplaySessionOptions(
  payload: ElevenLabsRoleplayTokenPayload,
  context: VoiceRoleplaySessionContext,
): ElevenLabsRoleplaySessionOptions {
  const conversationToken = compactString(payload.conversation_token);
  const signedUrl = compactString(payload.signed_url);

  if (!conversationToken && !signedUrl) {
    throw new Error("No voice connection credentials received");
  }

  const dynamicVariables: DynamicVariables = {
    ...(payload.dynamic_variables ?? {}),
    prospect_name: compactString(payload.prospect_name) ?? context.prospectName,
    prospect_title: context.prospectTitle,
    prospect_company: context.prospectCompany,
  };

  assignIfPresent(dynamicVariables, "scenario_name", payload.scenario_name);
  assignIfPresent(dynamicVariables, "difficulty", payload.difficulty);
  assignIfPresent(dynamicVariables, "scenario_context", payload.scenario_context);
  assignIfPresent(dynamicVariables, "seller_company_name", context.sellerCompanyName);
  assignIfPresent(dynamicVariables, "product_description", context.productDescription);
  assignIfPresent(dynamicVariables, "industry", context.industry);
  assignIfPresent(dynamicVariables, "target_audience", context.targetAudience);
  assignIfPresent(dynamicVariables, "value_propositions", joinList(context.valuePropositions));
  assignIfPresent(dynamicVariables, "common_use_cases", joinList(context.commonUseCases));

  return conversationToken
    ? { conversationToken, connectionType: "webrtc", dynamicVariables }
    : { signedUrl, connectionType: "websocket", dynamicVariables };
}