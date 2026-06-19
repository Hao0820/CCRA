alter table public.transactions
  drop constraint if exists transactions_user_card_id_fkey;

alter table public.transactions
  add constraint transactions_user_card_id_fkey
  foreign key (user_card_id) references public.user_cards(id) on delete cascade;
