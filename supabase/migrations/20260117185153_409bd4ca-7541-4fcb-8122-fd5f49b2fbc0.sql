-- Add default Aloware line to profiles
ALTER TABLE public.profiles 
ADD COLUMN default_aloware_line TEXT;