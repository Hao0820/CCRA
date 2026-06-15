create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  line_user_id text unique,
  display_name text not null default 'My Ledger',
  picture_url text,
  monthly_budget numeric(12, 2) not null default 150000 check (monthly_budget >= 0),
  cash_balance numeric(12, 2) not null default 0,
  accent_color text not null default 'pink',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  catalog_card_id text not null,
  last_four text not null check (last_four ~ '^[0-9]{4}$'),
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, catalog_card_id, last_four)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  user_card_id uuid references public.user_cards(id) on delete restrict,
  payment_type text not null check (payment_type in ('cash', 'card')),
  merchant text not null,
  transaction_date date not null,
  amount numeric(12, 2) not null check (amount >= 0),
  category text not null check (
    category in (
      'shopping',
      'dining',
      'transport',
      'entertainment',
      'medical',
      'social',
      'home',
      'other'
    )
  ),
  reward_scenario_id text,
  reward_scenario_label text,
  reward_rate numeric(8, 4) not null default 0,
  reward_amount numeric(12, 4) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (payment_type = 'cash' and user_card_id is null)
    or (payment_type = 'card' and user_card_id is not null)
  )
);

create index user_cards_user_id_idx on public.user_cards(user_id);
create index transactions_user_date_idx
  on public.transactions(user_id, transaction_date desc);

alter table public.profiles enable row level security;
alter table public.user_cards enable row level security;
alter table public.transactions enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "cards_manage_own"
  on public.user_cards for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "transactions_manage_own"
  on public.transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger user_cards_set_updated_at
before update on public.user_cards
for each row execute function public.set_updated_at();

create trigger transactions_set_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();
