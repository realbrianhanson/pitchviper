import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceRateLimit } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type QueryType = 'industry_trends' | 'competitive_landscape' | 'recent_news' | 'decision_maker_intel' | 'battlecard';

interface ResearchRequest {
  query_type: QueryType;
  company_name?: string;
  industry?: string;
  contact_name?: string;
  competitor_name?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);

    const { query_type, company_name, industry, contact_name, competitor_name }: ResearchRequest = await req.json();
    if (!query_type) throw new Error('Query type is required');

    // Cache lookup BEFORE spending an API call. Cache is keyed per-user by
    // (query_type, query_key), TTL enforced via expires_at.
    const queryKey = [company_name ?? '', industry ?? '', contact_name ?? '', competitor_name ?? ''].join('|');
    const { data: cached } = await admin
      .from('perplexity_cache')
      .select('research_data, citations, expires_at')
      .eq('user_id', userId)
      .eq('query_type', query_type)
      .eq('query_key', queryKey)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached?.research_data) {
      return new Response(
        JSON.stringify({
          success: true,
          content: (cached.research_data as any)?.content ?? '',
          citations: cached.citations ?? [],
          query_type,
          cached: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Rate-limit ONLY the paid path (cache hits should not consume budget).
    const rl = await enforceRateLimit(userId, 'perplexity-research', { serviceClient: admin });
    if (!rl.allowed) return rl.response!;

    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) throw new Error('Perplexity API key not configured');

    let query: string;
    let systemPrompt: string;

    switch (query_type) {
      case 'industry_trends':
        if (!industry && !company_name) throw new Error('Industry or company name required');
        query = `What are the current trends, challenges, and opportunities in the ${industry || company_name + "'s"} industry? Focus on recent developments from the last 3 months. Include specific examples and data points.`;
        systemPrompt = 'You are an industry analyst providing actionable insights for sales professionals. Be specific and cite recent developments.';
        break;

      case 'competitive_landscape':
        if (!company_name) throw new Error('Company name is required');
        query = `Who are the main competitors of ${company_name}? What is their market position? What differentiates them from competitors? Include pricing information if publicly available.`;
        systemPrompt = 'You are a competitive intelligence analyst. Provide structured, actionable information about market positioning and competition.';
        break;

      case 'recent_news':
        if (!company_name) throw new Error('Company name is required');
        query = `What are the most important news and announcements about ${company_name} from the last 30 days? Summarize key takeaways that would be relevant for a sales conversation.`;
        systemPrompt = 'You are a business news analyst. Summarize news with a focus on what matters for sales conversations - funding, leadership changes, product launches, partnerships, challenges.';
        break;

      case 'decision_maker_intel':
        if (!contact_name || !company_name) throw new Error('Contact name and company are required');
        query = `Find public information about ${contact_name} at ${company_name}. Look for: interviews, public statements, articles they've written, conference appearances, their stated business priorities or concerns.`;
        systemPrompt = 'You are a sales intelligence analyst. Focus on information that helps personalize outreach - their priorities, communication style, and professional background.';
        break;

      case 'battlecard':
        if (!competitor_name) throw new Error('Competitor name is required');
        query = `Provide a comprehensive competitive analysis of ${competitor_name}: 
        1. Their main products/services and pricing (if public)
        2. Their strengths and what customers praise
        3. Their weaknesses based on reviews and complaints
        4. Recent news and changes
        5. What makes them vulnerable to competition
        Include specific examples and sources.`;
        systemPrompt = 'You are a competitive intelligence analyst creating a sales battlecard. Be specific and actionable. Include both strengths to acknowledge and weaknesses to exploit.';
        break;

      default:
        throw new Error('Invalid query type');
    }

    console.log(`Perplexity research: ${query_type}`, { company_name, industry, contact_name, competitor_name });

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query },
        ],
        search_recency_filter: query_type === 'recent_news' ? 'month' : undefined,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    const citations = data.citations || [];

    // Populate cache for future hits.
    await admin.from('perplexity_cache').insert({
      user_id: userId,
      query_type,
      query_key: queryKey,
      research_data: { content },
      citations,
    });

    console.log('Perplexity research completed, citations:', citations.length);

    return new Response(
      JSON.stringify({ success: true, content, citations, query_type, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in Perplexity research:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
