-- Create perplexity research cache table
CREATE TABLE public.perplexity_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  query_type TEXT NOT NULL,
  query_key TEXT NOT NULL,
  research_data JSONB NOT NULL DEFAULT '{}',
  citations JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

-- Enable RLS
ALTER TABLE public.perplexity_cache ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own cache"
  ON public.perplexity_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cache"
  ON public.perplexity_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cache"
  ON public.perplexity_cache FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_perplexity_cache_user_id ON public.perplexity_cache(user_id);
CREATE INDEX idx_perplexity_cache_query ON public.perplexity_cache(query_type, query_key);
CREATE INDEX idx_perplexity_cache_expires ON public.perplexity_cache(expires_at);