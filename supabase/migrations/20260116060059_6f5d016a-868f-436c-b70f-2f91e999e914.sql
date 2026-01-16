-- Create module_type enum
CREATE TYPE public.module_type AS ENUM ('video', 'reading', 'quiz', 'roleplay');

-- Create module_status enum
CREATE TYPE public.module_status AS ENUM ('not_started', 'in_progress', 'completed');

-- Create learning_paths table
CREATE TABLE public.learning_paths (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'book',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT false,
  team_id UUID REFERENCES public.teams(id),
  estimated_hours DECIMAL NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create training_modules table
CREATE TABLE public.training_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  path_id UUID NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  module_type public.module_type NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  duration_minutes INTEGER NOT NULL DEFAULT 10,
  xp_reward INTEGER NOT NULL DEFAULT 50,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_module_progress table
CREATE TABLE public.user_module_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  module_id UUID NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  status public.module_status NOT NULL DEFAULT 'not_started',
  score INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  progress_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_id)
);

-- Create certifications table
CREATE TABLE public.certifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  path_id UUID NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES public.badges(id),
  icon TEXT NOT NULL DEFAULT 'award',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_certifications table
CREATE TABLE public.user_certifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  certification_id UUID NOT NULL REFERENCES public.certifications(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, certification_id)
);

-- Enable RLS
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_module_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_certifications ENABLE ROW LEVEL SECURITY;

-- Learning paths policies
CREATE POLICY "Anyone can view learning paths"
ON public.learning_paths
FOR SELECT
USING (
  team_id IS NULL 
  OR team_id IN (
    SELECT team_id FROM profiles WHERE user_id = auth.uid() AND team_id IS NOT NULL
  )
);

-- Training modules policies
CREATE POLICY "Anyone can view active training modules"
ON public.training_modules
FOR SELECT
USING (is_active = true);

-- User module progress policies
CREATE POLICY "Users can view own progress"
ON public.user_module_progress
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
ON public.user_module_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
ON public.user_module_progress
FOR UPDATE
USING (auth.uid() = user_id);

-- Certifications policies
CREATE POLICY "Anyone can view certifications"
ON public.certifications
FOR SELECT
USING (true);

-- User certifications policies
CREATE POLICY "Users can view own certifications"
ON public.user_certifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can earn certifications"
ON public.user_certifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Seed learning paths with modules
INSERT INTO public.learning_paths (name, description, icon, sort_order, is_required, estimated_hours) VALUES
('New Rep Foundations', 'Essential skills every new sales rep needs to succeed. Complete this path in your first week.', 'graduation-cap', 1, true, 4),
('Discovery Mastery', 'Learn to uncover customer needs and qualify opportunities effectively.', 'search', 2, false, 3),
('Objection Handling Pro', 'Master the art of handling any objection with confidence and skill.', 'shield', 3, false, 2.5),
('Advanced Closing Techniques', 'Close more deals with proven techniques used by top performers.', 'target', 4, false, 3),
('Enterprise Sales Strategies', 'Navigate complex enterprise deals with multiple stakeholders.', 'building', 5, false, 4),
('Product Deep Dive', 'Comprehensive product knowledge to answer any customer question.', 'package', 6, false, 5);

-- Seed modules for New Rep Foundations
INSERT INTO public.training_modules (path_id, title, description, module_type, content, duration_minutes, xp_reward, sort_order) VALUES
((SELECT id FROM learning_paths WHERE name = 'New Rep Foundations'), 
 'Welcome to Sales', 'Introduction to our sales methodology and culture', 'video',
 '{"video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "transcript": "Welcome to the team! In this video, we will cover the fundamentals of our sales approach..."}'::jsonb,
 15, 50, 1),
((SELECT id FROM learning_paths WHERE name = 'New Rep Foundations'),
 'Understanding Our Product', 'Learn what we sell and why customers love it', 'reading',
 '{"content": "# Understanding Our Product\n\nOur product solves real problems for real customers. In this module, you will learn:\n\n## Key Features\n- **Feature 1**: Description of the first key feature\n- **Feature 2**: Description of the second key feature\n- **Feature 3**: Description of the third key feature\n\n## Target Market\nWe primarily serve mid-market companies in the technology sector...\n\n## Value Proposition\nOur unique value proposition centers on three pillars:\n1. Speed to value\n2. Ease of use\n3. Exceptional support"}'::jsonb,
 20, 75, 2),
((SELECT id FROM learning_paths WHERE name = 'New Rep Foundations'),
 'Sales Process Overview', 'Master our proven sales process from first touch to close', 'video',
 '{"video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "transcript": "Our sales process consists of five key stages..."}'::jsonb,
 25, 100, 3),
((SELECT id FROM learning_paths WHERE name = 'New Rep Foundations'),
 'Knowledge Check', 'Test your understanding of the foundations', 'quiz',
 '{"questions": [{"id": "q1", "question": "What is the first step in our sales process?", "options": ["Discovery", "Cold Call", "Demo", "Close"], "correct": 0}, {"id": "q2", "question": "What is our primary target market?", "options": ["Enterprise", "Mid-Market", "SMB", "Consumer"], "correct": 1}, {"id": "q3", "question": "What makes our product unique?", "options": ["Low price", "Speed to value", "Complex features", "Slow support"], "correct": 1}], "passing_score": 80}'::jsonb,
 10, 150, 4);

-- Seed modules for Discovery Mastery
INSERT INTO public.training_modules (path_id, title, description, module_type, content, duration_minutes, xp_reward, sort_order) VALUES
((SELECT id FROM learning_paths WHERE name = 'Discovery Mastery'),
 'The Art of Asking Questions', 'Learn powerful questioning techniques', 'video',
 '{"video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "transcript": "Great discovery starts with great questions..."}'::jsonb,
 20, 75, 1),
((SELECT id FROM learning_paths WHERE name = 'Discovery Mastery'),
 'Active Listening Skills', 'Hear what customers are really saying', 'reading',
 '{"content": "# Active Listening in Sales\n\n## Why It Matters\nActive listening is the foundation of effective discovery. When you truly listen, you:\n- Build trust and rapport\n- Uncover hidden needs\n- Identify buying signals\n\n## Techniques\n1. **Paraphrase**: Repeat back what you heard in your own words\n2. **Clarify**: Ask follow-up questions to understand better\n3. **Summarize**: Periodically recap the key points"}'::jsonb,
 15, 50, 2),
((SELECT id FROM learning_paths WHERE name = 'Discovery Mastery'),
 'Discovery Call Practice', 'Practice your discovery skills in a roleplay', 'roleplay',
 '{"scenario_name": "Cold Prospect Discovery", "min_score": 70}'::jsonb,
 15, 200, 3);

-- Seed modules for Objection Handling Pro
INSERT INTO public.training_modules (path_id, title, description, module_type, content, duration_minutes, xp_reward, sort_order) VALUES
((SELECT id FROM learning_paths WHERE name = 'Objection Handling Pro'),
 'Why Objections Are Good', 'Reframe your mindset around objections', 'video',
 '{"video_url": "https://www.youtube.com/embed/dQw4w9WgXcQ", "transcript": "Objections mean your prospect is engaged..."}'::jsonb,
 15, 50, 1),
((SELECT id FROM learning_paths WHERE name = 'Objection Handling Pro'),
 'The LAER Framework', 'Listen, Acknowledge, Explore, Respond', 'reading',
 '{"content": "# The LAER Framework\n\nLAER is our proven framework for handling any objection:\n\n## L - Listen\nLet the prospect finish completely. Do not interrupt.\n\n## A - Acknowledge\nShow empathy: \"I understand why you might feel that way...\"\n\n## E - Explore\nAsk questions to understand the real concern.\n\n## R - Respond\nAddress the actual underlying concern."}'::jsonb,
 20, 75, 2),
((SELECT id FROM learning_paths WHERE name = 'Objection Handling Pro'),
 'Common Objection Responses', 'Scripts for the most common objections', 'reading',
 '{"content": "# Common Objections & Responses\n\n## \"Your price is too high\"\n**Response**: \"I appreciate you being direct. Help me understand - too high compared to what?\"\n\n## \"We are happy with our current solution\"\n**Response**: \"That is great to hear. What made you take this call today?\"\n\n## \"I need to think about it\"\n**Response**: \"Of course. What specific aspects would you like to think through?\""}'::jsonb,
 15, 50, 3),
((SELECT id FROM learning_paths WHERE name = 'Objection Handling Pro'),
 'Objection Handling Quiz', 'Test your knowledge', 'quiz',
 '{"questions": [{"id": "q1", "question": "What does LAER stand for?", "options": ["Listen, Acknowledge, Explore, Respond", "Learn, Ask, Explain, Resolve", "Look, Accept, Engage, React", "Lead, Attract, Evaluate, Retain"], "correct": 0}, {"id": "q2", "question": "When a prospect objects, you should first:", "options": ["Immediately counter", "Listen fully", "Change the subject", "Offer a discount"], "correct": 1}], "passing_score": 80}'::jsonb,
 10, 100, 4);

-- Create certifications
INSERT INTO public.certifications (name, description, path_id, icon) VALUES
('Certified New Rep', 'Completed the New Rep Foundations path', (SELECT id FROM learning_paths WHERE name = 'New Rep Foundations'), 'graduation-cap'),
('Discovery Master', 'Completed the Discovery Mastery path', (SELECT id FROM learning_paths WHERE name = 'Discovery Mastery'), 'search'),
('Objection Handler', 'Completed the Objection Handling Pro path', (SELECT id FROM learning_paths WHERE name = 'Objection Handling Pro'), 'shield'),
('Closing Expert', 'Completed the Advanced Closing Techniques path', (SELECT id FROM learning_paths WHERE name = 'Advanced Closing Techniques'), 'target'),
('Enterprise Specialist', 'Completed the Enterprise Sales Strategies path', (SELECT id FROM learning_paths WHERE name = 'Enterprise Sales Strategies'), 'building'),
('Product Expert', 'Completed the Product Deep Dive path', (SELECT id FROM learning_paths WHERE name = 'Product Deep Dive'), 'package');