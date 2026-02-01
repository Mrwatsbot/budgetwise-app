-- AI Page Insights Cache
create table public.ai_page_insights (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  page text not null, -- 'dashboard', 'budgets', 'transactions', 'savings', 'debts'
  insights jsonb not null, -- Array of insight objects
  generated_at timestamptz default now(),
  
  -- Unique per user+page (upsert pattern)
  unique(user_id, page)
);

alter table public.ai_page_insights enable row level security;

create policy "Users can view own insights"
  on public.ai_page_insights for select using (auth.uid() = user_id);
create policy "Users can insert own insights"  
  on public.ai_page_insights for insert with check (auth.uid() = user_id);
create policy "Users can update own insights"
  on public.ai_page_insights for update using (auth.uid() = user_id);
create policy "Users can delete own insights"
  on public.ai_page_insights for delete using (auth.uid() = user_id);
