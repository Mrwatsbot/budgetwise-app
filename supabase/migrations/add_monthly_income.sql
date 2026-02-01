-- Add monthly_income column to profiles table
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/guylqnfgfcfnmubvaedv/sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monthly_income numeric DEFAULT 0;

-- Also add openrouter_api_key if not present (for BYOK feature)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS openrouter_api_key text DEFAULT NULL;
