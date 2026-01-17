-- Create channel type enum
CREATE TYPE public.channel_type AS ENUM ('general', 'wins', 'help', 'custom');

-- Create message type enum
CREATE TYPE public.message_type AS ENUM ('text', 'kudos', 'system');

-- Create chat_channels table
CREATE TABLE public.chat_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  channel_type public.channel_type NOT NULL DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message_type public.message_type NOT NULL DEFAULT 'text',
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_reactions table
CREATE TABLE public.chat_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, reaction)
);

-- Enable RLS on all tables
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for chat_channels
CREATE POLICY "Team members can view their team channels"
ON public.chat_channels FOR SELECT
USING (team_id IN (
  SELECT team_id FROM profiles WHERE user_id = auth.uid() AND team_id IS NOT NULL
));

-- RLS policies for chat_messages
CREATE POLICY "Team members can view messages in their team channels"
ON public.chat_messages FOR SELECT
USING (channel_id IN (
  SELECT cc.id FROM chat_channels cc
  JOIN profiles p ON p.team_id = cc.team_id
  WHERE p.user_id = auth.uid()
));

CREATE POLICY "Team members can insert messages in their team channels"
ON public.chat_messages FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  channel_id IN (
    SELECT cc.id FROM chat_channels cc
    JOIN profiles p ON p.team_id = cc.team_id
    WHERE p.user_id = auth.uid()
  )
);

-- RLS policies for chat_reactions
CREATE POLICY "Team members can view reactions in their team channels"
ON public.chat_reactions FOR SELECT
USING (message_id IN (
  SELECT cm.id FROM chat_messages cm
  JOIN chat_channels cc ON cc.id = cm.channel_id
  JOIN profiles p ON p.team_id = cc.team_id
  WHERE p.user_id = auth.uid()
));

CREATE POLICY "Team members can add reactions"
ON public.chat_reactions FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  message_id IN (
    SELECT cm.id FROM chat_messages cm
    JOIN chat_channels cc ON cc.id = cm.channel_id
    JOIN profiles p ON p.team_id = cc.team_id
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own reactions"
ON public.chat_reactions FOR DELETE
USING (auth.uid() = user_id);

-- Enable real-time for chat_messages and chat_reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reactions;

-- Function to auto-create default channels for a team
CREATE OR REPLACE FUNCTION public.create_default_channels()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.chat_channels (team_id, name, channel_type)
  VALUES 
    (NEW.id, 'general', 'general'),
    (NEW.id, 'wins', 'wins'),
    (NEW.id, 'help', 'help');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create channels when team is created
CREATE TRIGGER on_team_created_create_channels
  AFTER INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_channels();

-- Function to auto-post to #wins when deal is closed
CREATE OR REPLACE FUNCTION public.post_deal_closed_to_wins()
RETURNS TRIGGER AS $$
DECLARE
  wins_channel_id UUID;
  user_name TEXT;
BEGIN
  -- Only trigger when stage changes to closed_won
  IF NEW.stage = 'closed_won' AND (OLD.stage IS NULL OR OLD.stage != 'closed_won') AND NEW.team_id IS NOT NULL THEN
    -- Get the wins channel for this team
    SELECT id INTO wins_channel_id
    FROM public.chat_channels
    WHERE team_id = NEW.team_id AND channel_type = 'wins'
    LIMIT 1;
    
    -- Get the user's name
    SELECT full_name INTO user_name
    FROM public.profiles
    WHERE user_id = NEW.user_id
    LIMIT 1;
    
    IF wins_channel_id IS NOT NULL THEN
      INSERT INTO public.chat_messages (channel_id, user_id, message_type, content, metadata)
      VALUES (
        wins_channel_id,
        NEW.user_id,
        'system',
        '🎉 ' || COALESCE(user_name, 'Team member') || ' just closed a deal with ' || NEW.company_name || ' for $' || NEW.deal_value || '!',
        jsonb_build_object('deal_id', NEW.id, 'company_name', NEW.company_name, 'deal_value', NEW.deal_value)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger on deals table for auto-posting wins
CREATE TRIGGER on_deal_closed_post_to_wins
  AFTER UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.post_deal_closed_to_wins();