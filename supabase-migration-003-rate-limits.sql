-- AI Usage Rate Tracking
create table public.ai_usage_counts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  feature text not null, -- 'insights', 'auto_budget', 'afford_check', 'product_scan', 'coaching', 'payoff_plan'
  period text not null, -- 'daily:2026-01-29', 'weekly:2026-W05', 'monthly:2026-01'
  count int default 0,
  
  unique(user_id, feature, period)
);

alter table public.ai_usage_counts enable row level security;

create policy "Users can view own usage" on public.ai_usage_counts for select using (auth.uid() = user_id);
create policy "Users can insert own usage" on public.ai_usage_counts for insert with check (auth.uid() = user_id);
create policy "Users can update own usage" on public.ai_usage_counts for update using (auth.uid() = user_id);

-- Add openrouter_api_key to profiles for BYOK
alter table public.profiles add column if not exists openrouter_api_key text;
