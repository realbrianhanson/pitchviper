-- Create difficulty enum
CREATE TYPE public.roleplay_difficulty AS ENUM ('rookie', 'pro', 'expert', 'nightmare');

-- Create session status enum
CREATE TYPE public.roleplay_session_status AS ENUM ('in_progress', 'completed', 'abandoned');

-- Create roleplay_scenarios table
CREATE TABLE public.roleplay_scenarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty public.roleplay_difficulty NOT NULL,
  prospect_persona TEXT NOT NULL,
  prospect_situation TEXT NOT NULL,
  win_conditions TEXT[] NOT NULL,
  objections_to_include TEXT[] NOT NULL,
  estimated_minutes INTEGER NOT NULL DEFAULT 5,
  xp_reward INTEGER NOT NULL DEFAULT 100,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.roleplay_scenarios ENABLE ROW LEVEL SECURITY;

-- Anyone can view active scenarios
CREATE POLICY "Anyone can view active scenarios"
ON public.roleplay_scenarios
FOR SELECT
USING (is_active = true);

-- Create roleplay_sessions table
CREATE TABLE public.roleplay_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  scenario_id UUID NOT NULL REFERENCES public.roleplay_scenarios(id),
  status public.roleplay_session_status NOT NULL DEFAULT 'in_progress',
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  score INTEGER,
  feedback TEXT,
  duration_seconds INTEGER,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.roleplay_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions"
ON public.roleplay_sessions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own sessions
CREATE POLICY "Users can insert own sessions"
ON public.roleplay_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions
CREATE POLICY "Users can update own sessions"
ON public.roleplay_sessions
FOR UPDATE
USING (auth.uid() = user_id);

-- Seed the 8 scenarios
INSERT INTO public.roleplay_scenarios (name, description, difficulty, prospect_persona, prospect_situation, win_conditions, objections_to_include, estimated_minutes, xp_reward, sort_order) VALUES
(
  'The Hot Lead',
  'A dream scenario — the prospect is ready to buy and just needs confirmation. Don''t overthink it, just close!',
  'rookie',
  'Marketing Manager at a mid-size e-commerce company. Already did their research, loves your product, budget approved.',
  'They reached out through your website, watched all the demos, and their boss already gave the green light. They just need to finalize details.',
  ARRAY['Close the deal', 'Get a signed commitment or verbal yes', 'Confirm implementation timeline'],
  ARRAY['Just want to make sure we are making the right choice', 'Can you walk me through the onboarding one more time?', 'What happens if we need to scale up?'],
  5,
  75,
  1
),
(
  'The Price Objector',
  'This prospect loves your solution but keeps hammering on price. Hold your ground while finding creative value angles.',
  'pro',
  'Operations Director at a manufacturing company. Clearly sees the value but has a tight budget and answers to a CFO who watches every penny.',
  'They''ve seen two demos, loved everything, but now it''s negotiation time. They want a 30% discount that you can''t give.',
  ARRAY['Get commitment without discounting more than 10%', 'Maintain relationship for future upsell', 'Schedule implementation call'],
  ARRAY['Your competitor offered us 25% less', 'We really need to stay within budget', 'Can you throw in extra features for free?', 'I''ll need to run this by my CFO at this price'],
  10,
  150,
  2
),
(
  'The Tire Kicker',
  'They say they''re "just looking" and "not ready to buy." Your job: create urgency and move them forward.',
  'pro',
  'Small business owner exploring options to modernize their operations. Has been "evaluating" for 6 months.',
  'Downloaded your whitepaper 3 months ago, attended a webinar, but always has an excuse for why "now isn''t the right time."',
  ARRAY['Create genuine urgency', 'Get commitment to a specific next step', 'Qualify their real timeline and budget'],
  ARRAY['We''re just in research mode right now', 'I need to discuss with my partner first', 'Maybe next quarter', 'Send me some more information'],
  8,
  125,
  3
),
(
  'The Gatekeeper',
  'The admin is blocking you from the decision maker. Be respectful but persistent.',
  'pro',
  'Executive Assistant to the VP of Sales. Protective of their boss''s time and has seen every sales trick in the book.',
  'You''ve been trying to reach the VP for weeks. The assistant answers every call and email, politely deflecting.',
  ARRAY['Get transferred to the decision maker', 'Get the decision maker''s direct line', 'Schedule a call directly with the decision maker'],
  ARRAY['They''re in meetings all day', 'You can send me the information and I''ll pass it along', 'We''re not looking at new vendors right now', 'They don''t take unsolicited calls'],
  7,
  125,
  4
),
(
  'The Feature Demander',
  'They want features you don''t have. Redirect the conversation to the value you DO provide.',
  'pro',
  'Tech Lead at a SaaS company. Very specific about requirements and has a checklist of must-have features.',
  'They''ve done extensive research and have a spreadsheet comparing vendors. You''re missing 2-3 features they want.',
  ARRAY['Redirect focus to your strengths', 'Get agreement that your solution solves their core problem', 'Book a technical deep-dive'],
  ARRAY['Do you have [specific feature] integration?', 'Your competitor has this feature built-in', 'This is a deal-breaker for us', 'Can you build this feature for us?'],
  8,
  150,
  5
),
(
  'The Skeptical CFO',
  'This analytical buyer needs hard numbers and ROI proof. Come prepared with data.',
  'expert',
  'CFO of a 500-person company. Former consultant, spreadsheet-obsessed, doesn''t make emotional decisions.',
  'The department head loves your product but the CFO controls the budget and has killed similar purchases before.',
  ARRAY['Provide compelling ROI calculation', 'Book follow-up with both CFO and department head', 'Get agreement on evaluation criteria'],
  ARRAY['What''s the total cost of ownership over 3 years?', 'Show me case studies with measurable results', 'How does this impact our bottom line?', 'I''ve seen these projections before — they never pan out'],
  12,
  200,
  6
),
(
  'The Competitor Loyal',
  'They''re happy with your competitor. Find the crack in the armor.',
  'expert',
  'Director of Customer Success using a competitor product for 3 years. Comfortable but not excited about their current solution.',
  'They agreed to the call as a favor to a mutual connection. They''re not actively looking but are open to listening.',
  ARRAY['Identify a genuine pain point', 'Get agreement to see a demo', 'Plant seeds of doubt about competitor'],
  ARRAY['We''ve been with [Competitor] for years and it works fine', 'The switching costs are too high', 'My team is already trained on the current system', 'I don''t have time to evaluate new vendors'],
  10,
  200,
  7
),
(
  'The Ghosted Follow-up',
  'They were interested, then disappeared. Re-engage without being pushy.',
  'expert',
  'VP of Marketing who had two great calls with you, then went completely silent for 3 weeks.',
  'Everything was going well — they loved the demo, asked for pricing, said they''d "circle back next week." That was 3 weeks ago. Emails and calls unanswered.',
  ARRAY['Re-engage the conversation', 'Understand what happened', 'Get a meeting scheduled'],
  ARRAY['Sorry, things got crazy here', 'We''re putting this on hold for now', 'Actually, we went with someone else', 'I''m not sure this is the right time'],
  8,
  175,
  8
);