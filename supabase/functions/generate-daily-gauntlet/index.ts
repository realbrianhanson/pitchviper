import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceRateLimit } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CHALLENGE_TYPES = [
  'objection_blast',
  'pitch_perfect',
  'discovery_questions',
  'spot_the_mistake',
  'quick_math',
  'competitor_quiz',
  'scenario_response'
];

type ChallengeType = typeof CHALLENGE_TYPES[number];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') { return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    // Require authenticated caller (or service role) to prevent abuse
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: Deno.env.get('SUPABASE_ANON_KEY')!, Authorization: `Bearer ${token}` } });
    if (!userResp.ok) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const userJson = await userResp.json();
    const userId: string | undefined = userJson?.id;
    if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rl = await enforceRateLimit(userId, 'generate-daily-gauntlet', { serviceClient: supabase });
    if (!rl.allowed) return rl.response!;

    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Check if challenge already exists for tomorrow
    const { data: existingChallenge } = await supabase
      .from('gauntlet_challenges')
      .select('id')
      .eq('challenge_date', tomorrowStr)
      .single();

    if (existingChallenge) {
      return new Response(
        JSON.stringify({ message: "Challenge already exists for tomorrow" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine which challenge type to use (rotate through types)
    const { data: lastChallenges } = await supabase
      .from('gauntlet_challenges')
      .select('challenge_type')
      .order('challenge_date', { ascending: false })
      .limit(7);

    const recentTypes = lastChallenges?.map(c => c.challenge_type) || [];
    let nextType: ChallengeType = CHALLENGE_TYPES[0];
    
    for (const type of CHALLENGE_TYPES) {
      if (!recentTypes.includes(type)) {
        nextType = type as ChallengeType;
        break;
      }
    }

    // If all types used recently, just pick next in rotation
    if (recentTypes.includes(nextType)) {
      const lastTypeIndex = CHALLENGE_TYPES.indexOf(recentTypes[0] as ChallengeType);
      nextType = CHALLENGE_TYPES[(lastTypeIndex + 1) % CHALLENGE_TYPES.length] as ChallengeType;
    }

    let content: Record<string, unknown> = {};
    let title = "";
    let description = "";
    let timeLimit = 300;
    let xpReward = 50;

    if (lovableApiKey) {
      // Use AI to generate challenge content
      const prompt = generatePromptForType(nextType);
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: "You are a sales training expert. Generate engaging, realistic sales challenges. Always respond with valid JSON only, no markdown."
            },
            { role: "user", content: prompt }
          ],
        }),
      });

      if (response.ok) {
        const aiData = await response.json();
        const aiContent = aiData.choices?.[0]?.message?.content;
        
        if (aiContent) {
          try {
            const parsed = JSON.parse(aiContent.replace(/```json\n?|\n?```/g, '').trim());
            content = parsed.content || parsed;
            title = parsed.title || getChallengeTitle(nextType);
            description = parsed.description || getChallengeDescription(nextType);
          } catch {
            // Fall back to default content
            const defaults = getDefaultContent(nextType);
            content = defaults.content;
            title = defaults.title;
            description = defaults.description;
          }
        }
      }
    } else {
      // Use default content
      const defaults = getDefaultContent(nextType);
      content = defaults.content;
      title = defaults.title;
      description = defaults.description;
    }

    timeLimit = getTimeLimit(nextType);
    xpReward = getXpReward(nextType);

    // Insert the new challenge
    const { data: newChallenge, error } = await supabase
      .from('gauntlet_challenges')
      .insert({
        challenge_date: tomorrowStr,
        challenge_type: nextType,
        title,
        description,
        content,
        time_limit_seconds: timeLimit,
        xp_reward: xpReward
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, challenge: newChallenge }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("internal_error");
    return new Response(
      JSON.stringify({ error: "internal_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generatePromptForType(type: string): string {
  switch (type) {
    case 'objection_blast':
      return `Generate 5 realistic sales objections for a B2B SaaS product. Return JSON:
{
  "title": "Objection Blast",
  "description": "Handle 5 objections in 30 seconds each. Score 70%+ to pass!",
  "content": {
    "objections": [{"id": 1, "text": "objection text", "time_limit": 30}],
    "passing_score": 70
  }
}`;
    case 'pitch_perfect':
      return `Generate a scenario for practicing a sales pitch. Include a product/service and target persona. Return JSON:
{
  "title": "Pitch Perfect",
  "description": "Craft the perfect pitch for this prospect!",
  "content": {
    "scenario": "description of prospect and situation",
    "product": "product to pitch",
    "key_elements": ["hook", "value prop 1", "value prop 2", "CTA"],
    "passing_score": 70
  }
}`;
    case 'discovery_questions':
      return `Generate a discovery call scenario with a prospect. Return JSON:
{
  "title": "Discovery Master",
  "description": "Ask 5 powerful discovery questions!",
  "content": {
    "prospect_scenario": "description of prospect and their company",
    "prospect_role": "their job title",
    "num_questions": 5,
    "evaluation_criteria": ["open-ended", "relevant", "insightful"],
    "passing_score": 70
  }
}`;
    case 'spot_the_mistake':
      return `Generate a call transcript with 5 sales mistakes hidden in it. Return JSON:
{
  "title": "Spot the Mistake",
  "description": "Find all the sales mistakes in this call!",
  "content": {
    "transcript": "full transcript text with mistakes",
    "mistakes": [{"id": 1, "text": "description of mistake", "location": "quote from transcript"}],
    "decoy_options": ["not actually a mistake 1", "not actually a mistake 2"]
  }
}`;
    case 'quick_math':
      return `Generate 5 sales math problems (ROI, discounts, commissions). Return JSON:
{
  "title": "Quick Math",
  "description": "Solve 5 sales calculations in 60 seconds each!",
  "content": {
    "problems": [
      {"id": 1, "question": "math problem", "answer": 12345, "time_limit": 60}
    ],
    "passing_score": 80
  }
}`;
    case 'competitor_quiz':
      return `Generate 5 multiple choice questions about handling competitor comparisons in sales. Return JSON:
{
  "title": "Competitor Quiz",
  "description": "Know your competition!",
  "content": {
    "questions": [
      {"id": 1, "question": "question text", "options": ["A", "B", "C", "D"], "correct": 0}
    ],
    "passing_score": 80
  }
}`;
    case 'scenario_response':
      return `Generate 3 mini roleplay scenarios where prospect says something and rep must respond. Return JSON:
{
  "title": "Scenario Response",
  "description": "Respond to these 3 prospect statements!",
  "content": {
    "scenarios": [
      {"id": 1, "prospect_says": "what prospect says", "context": "situation context"}
    ],
    "passing_score": 70
  }
}`;
    default:
      return "";
  }
}

function getChallengeTitle(type: string): string {
  const titles: Record<string, string> = {
    objection_blast: "Objection Blast",
    pitch_perfect: "Pitch Perfect",
    discovery_questions: "Discovery Master",
    spot_the_mistake: "Spot the Mistake",
    quick_math: "Quick Math",
    competitor_quiz: "Competitor Quiz",
    scenario_response: "Scenario Response"
  };
  return titles[type] || "Daily Challenge";
}

function getChallengeDescription(type: string): string {
  const descriptions: Record<string, string> = {
    objection_blast: "Handle 5 objections in 30 seconds each. Score 70%+ to pass!",
    pitch_perfect: "Craft the perfect pitch for this prospect scenario!",
    discovery_questions: "Ask 5 powerful discovery questions for this prospect!",
    spot_the_mistake: "Find all the sales mistakes hidden in this call transcript!",
    quick_math: "Solve 5 sales calculations. Get 4/5 correct to pass!",
    competitor_quiz: "Answer 5 questions about handling competitor comparisons!",
    scenario_response: "Respond to 3 prospect statements. Average 70%+ to pass!"
  };
  return descriptions[type] || "Complete today's challenge!";
}

function getTimeLimit(type: string): number {
  const limits: Record<string, number> = {
    objection_blast: 150,
    pitch_perfect: 180,
    discovery_questions: 300,
    spot_the_mistake: 180,
    quick_math: 300,
    competitor_quiz: 180,
    scenario_response: 180
  };
  return limits[type] || 300;
}

function getXpReward(type: string): number {
  const rewards: Record<string, number> = {
    objection_blast: 75,
    pitch_perfect: 100,
    discovery_questions: 75,
    spot_the_mistake: 50,
    quick_math: 50,
    competitor_quiz: 50,
    scenario_response: 75
  };
  return rewards[type] || 50;
}

function getDefaultContent(type: string): { content: Record<string, unknown>; title: string; description: string } {
  const defaults: Record<string, { content: Record<string, unknown>; title: string; description: string }> = {
    objection_blast: {
      title: "Objection Blast",
      description: "Handle 5 objections in 30 seconds each. Score 70%+ to pass!",
      content: {
        objections: [
          { id: 1, text: "We don't have budget for this right now.", time_limit: 30 },
          { id: 2, text: "I need to discuss with my team first.", time_limit: 30 },
          { id: 3, text: "We're happy with our current solution.", time_limit: 30 },
          { id: 4, text: "The price is too high compared to competitors.", time_limit: 30 },
          { id: 5, text: "We're not ready to make a decision yet.", time_limit: 30 }
        ],
        passing_score: 70
      }
    },
    pitch_perfect: {
      title: "Pitch Perfect",
      description: "Craft the perfect pitch for this prospect!",
      content: {
        scenario: "You're calling a VP of Sales at a 200-person SaaS company. They're scaling their team and struggling with onboarding and training consistency.",
        product: "Sales enablement platform",
        key_elements: ["Compelling hook", "Pain point acknowledgment", "Value proposition", "Social proof", "Clear CTA"],
        passing_score: 70
      }
    },
    discovery_questions: {
      title: "Discovery Master",
      description: "Ask 5 powerful discovery questions for this prospect!",
      content: {
        prospect_scenario: "Mid-market manufacturing company looking to modernize their sales process. They currently use spreadsheets and email to track deals.",
        prospect_role: "Director of Sales Operations",
        num_questions: 5,
        evaluation_criteria: ["Open-ended", "Relevant to pain points", "Uncovers deeper needs"],
        passing_score: 70
      }
    },
    spot_the_mistake: {
      title: "Spot the Mistake",
      description: "Find all the sales mistakes in this call!",
      content: {
        transcript: `Rep: "Hi, is this John? Great! I'm calling from TechCorp. We sell the best CRM in the market and I know you need it. Can I get 30 minutes of your time to show you a demo?"

John: "I'm actually pretty busy right now..."

Rep: "This will only take a moment. Our CRM has over 500 features and integrates with everything. Let me tell you about all of them. First, we have automated email sequences, then we have..."

John: "We already have a CRM we're happy with."

Rep: "But ours is better. Trust me, everyone switches to us eventually. So when can we schedule that demo? How about Tuesday at 2pm?"`,
        mistakes: [
          { id: 1, text: "No introduction or rapport building", location: "Opening line" },
          { id: 2, text: "Claims product is 'best' without backing", location: "We sell the best CRM" },
          { id: 3, text: "Assumed need without discovery", location: "I know you need it" },
          { id: 4, text: "Feature dumping instead of benefit focus", location: "500 features" },
          { id: 5, text: "Ignored objection and pushed harder", location: "But ours is better" }
        ],
        decoy_options: ["Asked for time commitment", "Mentioned integrations"]
      }
    },
    quick_math: {
      title: "Quick Math",
      description: "Solve 5 sales calculations. Get 4/5 correct to pass!",
      content: {
        problems: [
          { id: 1, question: "Your product costs $500/month. If a customer commits to annual billing with a 20% discount, what's the annual cost?", answer: 4800, time_limit: 60 },
          { id: 2, question: "You close a $50,000 deal with 8% commission. How much do you earn?", answer: 4000, time_limit: 60 },
          { id: 3, question: "A customer saves $2,000/month using your product which costs $500/month. What's the monthly ROI percentage?", answer: 300, time_limit: 60 },
          { id: 4, question: "You need to hit $100,000 in quota. Average deal size is $12,500. How many deals do you need?", answer: 8, time_limit: 60 },
          { id: 5, question: "Your close rate is 25%. To get 5 deals, how many opportunities do you need?", answer: 20, time_limit: 60 }
        ],
        passing_score: 80
      }
    },
    competitor_quiz: {
      title: "Competitor Quiz",
      description: "Answer 5 questions about handling competitor comparisons!",
      content: {
        questions: [
          { id: 1, question: "A prospect says they're also looking at a cheaper competitor. What's the best first response?", options: ["Immediately lower your price", "Ask what they value most in a solution", "Badmouth the competitor", "End the conversation"], correct: 1 },
          { id: 2, question: "When should you bring up competitors in a sales conversation?", options: ["Never - avoid the topic", "Only when the prospect mentions them first", "At the start to position yourself", "In every single call"], correct: 1 },
          { id: 3, question: "A prospect says 'Competitor X has feature Y that you don't.' Best response?", options: ["Agree that's a gap and move on", "Explain why that feature isn't important", "Ask how they would use that feature", "Promise to add it soon"], correct: 2 },
          { id: 4, question: "What's the biggest mistake when handling competitor objections?", options: ["Acknowledging competitor strengths", "Focusing only on your differentiators", "Speaking negatively about competitors", "Asking about their evaluation criteria"], correct: 2 },
          { id: 5, question: "A prospect is in a contract with a competitor. What's the best approach?", options: ["Tell them to break the contract", "Offer a huge discount to switch now", "Nurture the relationship for when contract ends", "Give up and move on"], correct: 2 }
        ],
        passing_score: 80
      }
    },
    scenario_response: {
      title: "Scenario Response",
      description: "Respond to 3 prospect statements. Average 70%+ to pass!",
      content: {
        scenarios: [
          { id: 1, prospect_says: "I've seen five demos this week and they all look the same to me.", context: "You're 5 minutes into a product demo with a Director of Marketing." },
          { id: 2, prospect_says: "We tried something similar last year and it was a disaster.", context: "Discovery call with a VP of Operations who seems hesitant." },
          { id: 3, prospect_says: "Just send me the pricing and I'll get back to you.", context: "End of first call with an interested but busy prospect." }
        ],
        passing_score: 70
      }
    }
  };
  return defaults[type] || { content: {}, title: "Daily Challenge", description: "Complete today's challenge!" };
}
