alter table public.user_cards
  add column client_id text,
  add column card_data jsonb not null default '{}'::jsonb;

alter table public.transactions
  add column client_id text,
  add column transaction_data jsonb not null default '{}'::jsonb;

update public.user_cards
set client_id = id::text
where client_id is null;

update public.transactions
set client_id = id::text
where client_id is null;

alter table public.user_cards
  alter column client_id set not null;

alter table public.transactions
  alter column client_id set not null;

create unique index user_cards_user_client_id_idx
  on public.user_cards(user_id, client_id);

create unique index transactions_user_client_id_idx
  on public.transactions(user_id, client_id);
