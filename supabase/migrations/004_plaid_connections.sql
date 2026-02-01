-- Create plaid_connections table
create table if not exists plaid_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  institution_id text not null,
  institution_name text not null,
  item_id text not null unique,
  encrypted_access_token text not null,
  sync_cursor text,
  status text not null default 'active' check (status in ('active', 'error', 'disconnected')),
  error_code text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create index on user_id for faster lookups
create index if not exists plaid_connections_user_id_idx on plaid_connections(user_id);

-- Create index on item_id for webhook lookups
create index if not exists plaid_connections_item_id_idx on plaid_connections(item_id);

-- Enable RLS
alter table plaid_connections enable row level security;

-- RLS policy: users can only see their own connections
create policy "Users can view their own plaid connections"
  on plaid_connections
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own plaid connections"
  on plaid_connections
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own plaid connections"
  on plaid_connections
  for update
  using (auth.uid() = user_id);

create policy "Users can delete their own plaid connections"
  on plaid_connections
  for delete
  using (auth.uid() = user_id);

-- Create updated_at trigger
create or replace function update_plaid_connections_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_plaid_connections_updated_at
  before update on plaid_connections
  for each row
  execute function update_plaid_connections_updated_at();
