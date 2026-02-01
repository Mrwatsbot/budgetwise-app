-- Migration 004: Add UPDATE policy for score_history (needed for daily upsert)
create policy "Users can update own score history"
  on public.score_history for update using (auth.uid() = user_id);
