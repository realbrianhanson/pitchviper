import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  authenticatePost, corsHeaders, errorResponse, jsonResponse,
  readBoundedJson, boundedString, enumOf,
} from "../_shared/edgeAuth.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { safeExternalUrl } from "../_shared/ssrfSafe.ts";
import { requireTeamEntitlement } from "../_shared/entitlement.ts";

const QUERY_TYPES = ["industry_trends", "competitive_landscape", "recent_news", "decision_maker_intel", "battlecard"] as const;
const MAX_SCRAPE_CHARS = 15000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await authenticatePost(req);
  if (!auth.ok) return auth.response;
  const { userId, serviceClient } = auth.ctx;

  const ent = await requireTeamEntitlement(serviceClient, userId, "growth");
  if (!ent.ok) return ent.response;

  const rl = await enforceRateLimit(userId, "research-prospect", { serviceClient, perMinute: 5, perDay: 50 });
  if (!rl.allowed) return rl.response!;

  const body = await readBoundedJson(req, 16 * 1024);
  if (!body || typeof body !== "object") return errorResponse("invalid_body", 400);
  const b = body as Record<string, unknown>;

  const companyName = boundedString(b.company_name, 160);
  if (!companyName) return errorResponse("invalid_body", 400);
  const contactName = boundedString(b.contact_name, 160);
  const contactLinkedinUrl = b.contact_linkedin_url != null
    ? safeExternalUrl(b.contact_linkedin_url, { maxLength: 512 })
    : { ok: true, url: undefined };
  if (b.contact_linkedin_url != null && !contactLinkedinUrl.ok) return errorResponse("invalid_url", 400);

  let scrapeUrl: URL | undefined;
  if (b.company_url != null) {
    const r = safeExternalUrl(b.company_url, { maxLength: 512 });
    if (!r.ok) return errorResponse("invalid_url", 400);
    scrapeUrl = r.url;
  }

  const FIRECRAWL = Deno.env.get("FIRECRAWL_API_KEY");
  const LOVABLE = Deno.env.get("LOVABLE_API_KEY");
  if (!FIRECRAWL || !LOVABLE) return errorResponse("not_configured", 503);

  let scraped = "";
  const companyData: { links?: string[] } = {};
  if (scrapeUrl) {
    try {
      const r = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${FIRECRAWL}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url: scrapeUrl.toString(), formats: ["markdown", "links"], onlyMainContent: true, waitFor: 3000 }),
      });
      if (r.ok) {
        const d = await r.json();
        if (d?.success && d?.data) {
          scraped = String(d.data.markdown || "").slice(0, MAX_SCRAPE_CHARS);
          if (Array.isArray(d.data.links)) companyData.links = d.data.links.slice(0, 20);
        }
      } else {
        console.error("[research-prospect] scrape_failed", { status: r.status });
      }
    } catch {
      console.error("[research-prospect] scrape_error");
    }
  }

  if (companyData.links && scraped.length < MAX_SCRAPE_CHARS) {
    const aboutLink = companyData.links.find((l) => typeof l === "string" && /about|team/i.test(l));
    if (aboutLink) {
      const safe = safeExternalUrl(aboutLink, { maxLength: 512 });
      if (safe.ok && safe.url) {
        try {
          const r = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: { Authorization: `Bearer ${FIRECRAWL}`, "Content-Type": "application/json" },
            body: JSON.stringify({ url: safe.url.toString(), formats: ["markdown"], onlyMainContent: true }),
          });
          if (r.ok) {
            const d = await r.json();
            if (d?.success && d?.data?.markdown) {
              scraped = (scraped + "\n\n--- ABOUT ---\n\n" + String(d.data.markdown)).slice(0, MAX_SCRAPE_CHARS);
            }
          }
        } catch {
          // swallow
        }
      }
    }
  }

  const sys = "You are a sales research AI. Produce actionable, specific intelligence.";
  const userPrompt = `Analyze this prospect:\nCompany: ${companyName}\nCompany URL: ${scrapeUrl?.toString() ?? "n/a"}\nContact: ${contactName ?? "n/a"}\nLinkedIn: ${contactLinkedinUrl.url?.toString() ?? "n/a"}\n\n${scraped ? `WEBSITE CONTENT:\n${scraped}` : "No website content available."}\n\nReturn a research report.`;

  const ai = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: sys }, { role: "user", content: userPrompt }],
      tools: [{
        type: "function",
        function: {
          name: "generate_research_report",
          parameters: {
            type: "object",
            properties: {
              companyOverview: { type: "object", properties: { name: { type: "string" }, industry: { type: "string" }, size: { type: "string" }, location: { type: "string" }, recentNews: { type: "array", items: { type: "string" } }, logoUrl: { type: "string" } }, required: ["name", "industry"] },
              whatTheyDo: { type: "object", properties: { description: { type: "string" }, products: { type: "array", items: { type: "string" } }, targetMarket: { type: "string" } }, required: ["description"] },
              painPoints: { type: "array", items: { type: "object", properties: { pain: { type: "string" }, implication: { type: "string" } }, required: ["pain"] } },
              talkingPoints: { type: "array", items: { type: "object", properties: { topic: { type: "string" }, opener: { type: "string" }, context: { type: "string" } }, required: ["topic", "opener"] } },
              contactIntel: { type: "object", properties: { role: { type: "string" }, priorities: { type: "array", items: { type: "string" } }, communicationStyle: { type: "string" }, tips: { type: "array", items: { type: "string" } } } },
            },
            required: ["companyOverview", "whatTheyDo", "painPoints", "talkingPoints"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "generate_research_report" } },
    }),
  });

  if (!ai.ok) {
    if (ai.status === 429) return errorResponse("rate_limited", 429);
    if (ai.status === 402) return errorResponse("credits_exhausted", 402);
    console.error("[research-prospect] ai_error", { status: ai.status });
    return errorResponse("ai_failed", 502);
  }
  const aiData = await ai.json();
  const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return errorResponse("ai_failed", 502);
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(toolCall.function.arguments);
  } catch {
    return errorResponse("ai_failed", 502);
  }
  data.metadata = { scrapedAt: new Date().toISOString(), hasContactInfo: !!contactName };
  return jsonResponse({ success: true, data });
});
