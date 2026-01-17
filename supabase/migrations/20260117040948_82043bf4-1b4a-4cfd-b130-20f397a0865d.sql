-- Add Aloware fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS aloware_user_id text;

-- Add Aloware fields to calls table
ALTER TABLE public.calls 
ADD COLUMN IF NOT EXISTS aloware_call_id text,
ADD COLUMN IF NOT EXISTS aloware_recording_url text,
ADD COLUMN IF NOT EXISTS aloware_transcription text,
ADD COLUMN IF NOT EXISTS is_synced_from_aloware boolean DEFAULT false;

-- Create aloware_sync_log table
CREATE TABLE public.aloware_sync_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed boolean DEFAULT false,
  error_message text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on aloware_sync_log
ALTER TABLE public.aloware_sync_log ENABLE ROW LEVEL SECURITY;

-- Create policy for managers to view sync logs
CREATE POLICY "Managers can view sync logs"
ON public.aloware_sync_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'manager'
  )
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_calls_aloware_call_id ON public.calls(aloware_call_id);
CREATE INDEX IF NOT EXISTS idx_profiles_aloware_user_id ON public.profiles(aloware_user_id);
CREATE INDEX IF NOT EXISTS idx_aloware_sync_log_processed ON public.aloware_sync_log(processed);