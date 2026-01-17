-- Create SMS messages table
CREATE TABLE public.sms_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  deal_id UUID REFERENCES public.deals(id),
  contact_phone VARCHAR(50) NOT NULL,
  contact_name VARCHAR(255),
  message TEXT NOT NULL,
  direction VARCHAR(20) NOT NULL DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
  aloware_message_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'sent',
  team_id UUID REFERENCES public.teams(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add aloware_summary column to calls table
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS aloware_summary TEXT;

-- Enable RLS
ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sms_messages
CREATE POLICY "Users can view their own SMS messages"
ON public.sms_messages
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create SMS messages"
ON public.sms_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers can view team SMS messages"
ON public.sms_messages
FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM public.profiles WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'manager'
  )
);

-- Create index for faster lookups
CREATE INDEX idx_sms_messages_user_id ON public.sms_messages(user_id);
CREATE INDEX idx_sms_messages_deal_id ON public.sms_messages(deal_id);
CREATE INDEX idx_sms_messages_contact_phone ON public.sms_messages(contact_phone);

-- Enable realtime for sms_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.sms_messages;