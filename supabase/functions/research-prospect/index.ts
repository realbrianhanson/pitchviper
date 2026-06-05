import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const userResp = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`, { headers: { apikey: Deno.env.get('SUPABASE_ANON_KEY')!, Authorization: `Bearer ${token}` } });
    if (!userResp.ok) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { company_name, company_url, contact_name, contact_linkedin_url } = await req.json();

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!FIRECRAWL_API_KEY) {
      throw new Error('Firecrawl API key not configured');
    }

    if (!LOVABLE_API_KEY) {
      throw new Error('AI API key not configured');
    }

    if (!company_name) {
      throw new Error('Company name is required');
    }

    console.log('Researching prospect:', company_name, company_url);

    let scrapedContent = '';
    let companyData: any = {};

    // Scrape company website if URL provided
    if (company_url) {
      let formattedUrl = company_url.trim();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = `https://${formattedUrl}`;
      }

      console.log('Scraping company website:', formattedUrl);

      try {
        const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: formattedUrl,
            formats: ['markdown', 'links'],
            onlyMainContent: true,
            waitFor: 3000,
          }),
        });

        const scrapeData = await scrapeResponse.json();
        
        if (scrapeData.success && scrapeData.data) {
          scrapedContent = scrapeData.data.markdown || '';
          companyData.metadata = scrapeData.data.metadata || {};
          companyData.links = scrapeData.data.links || [];
          console.log('Successfully scraped company website, content length:', scrapedContent.length);
        }
      } catch (scrapeError) {
        console.error('Error scraping company website:', scrapeError);
      }
    }

    // Try to scrape About and News pages if we have links
    if (companyData.links && companyData.links.length > 0) {
      const aboutLink = companyData.links.find((l: string) => 
        l.toLowerCase().includes('about') || l.toLowerCase().includes('team')
      );
      
      if (aboutLink) {
        try {
          const aboutResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: aboutLink,
              formats: ['markdown'],
              onlyMainContent: true,
            }),
          });

          const aboutData = await aboutResponse.json();
          if (aboutData.success && aboutData.data?.markdown) {
            scrapedContent += '\n\n--- ABOUT PAGE ---\n\n' + aboutData.data.markdown;
          }
        } catch (e) {
          console.error('Error scraping about page:', e);
        }
      }
    }

    // Process with AI to generate insights
    console.log('Processing scraped content with AI...');

    const systemPrompt = `You are a sales research AI assistant. Your job is to analyze company information and generate actionable intelligence for sales reps.

Based on the provided information about a company (and optionally a contact), generate a structured research report.

Be specific and actionable. Focus on insights that would help a sales rep have a productive conversation.`;

    const userPrompt = `Analyze this prospect and generate a research report:

Company Name: ${company_name}
Company URL: ${company_url || 'Not provided'}
Contact Name: ${contact_name || 'Not provided'}
Contact LinkedIn: ${contact_linkedin_url || 'Not provided'}

${scrapedContent ? `SCRAPED WEBSITE CONTENT:
${scrapedContent.substring(0, 15000)}` : 'No website content available - use your knowledge about companies with this name.'}

Generate a comprehensive research report with the following sections:

1. Company Overview: Name, industry, estimated size, location, recent news
2. What They Do: Business description, key products/services, target market
3. Potential Pain Points: Common challenges for companies like this
4. Talking Points: 3-5 conversation starters personalized to this company
5. Contact Intel (if contact name provided): Role insights, priorities, communication suggestions

Return as JSON with these exact keys: companyOverview, whatTheyDo, painPoints, talkingPoints, contactIntel`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_research_report',
              description: 'Generate structured prospect research report',
              parameters: {
                type: 'object',
                properties: {
                  companyOverview: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      industry: { type: 'string' },
                      size: { type: 'string' },
                      location: { type: 'string' },
                      recentNews: { type: 'array', items: { type: 'string' } },
                      logoUrl: { type: 'string' },
                    },
                    required: ['name', 'industry'],
                  },
                  whatTheyDo: {
                    type: 'object',
                    properties: {
                      description: { type: 'string' },
                      products: { type: 'array', items: { type: 'string' } },
                      targetMarket: { type: 'string' },
                    },
                    required: ['description'],
                  },
                  painPoints: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        pain: { type: 'string' },
                        implication: { type: 'string' },
                      },
                      required: ['pain'],
                    },
                  },
                  talkingPoints: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        topic: { type: 'string' },
                        opener: { type: 'string' },
                        context: { type: 'string' },
                      },
                      required: ['topic', 'opener'],
                    },
                  },
                  contactIntel: {
                    type: 'object',
                    properties: {
                      role: { type: 'string' },
                      priorities: { type: 'array', items: { type: 'string' } },
                      communicationStyle: { type: 'string' },
                      tips: { type: 'array', items: { type: 'string' } },
                    },
                  },
                },
                required: ['companyOverview', 'whatTheyDo', 'painPoints', 'talkingPoints'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'generate_research_report' } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      throw new Error('No research data returned from AI');
    }

    const researchData = JSON.parse(toolCall.function.arguments);

    // Add metadata
    researchData.metadata = {
      scrapedAt: new Date().toISOString(),
      sourceUrl: company_url,
      hasContactInfo: !!contact_name,
    };

    console.log('Research completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        data: researchData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error researching prospect:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
