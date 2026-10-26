-- Gift cards (Stage 4). Run once, after 20261022000000_orders.sql.
--
-- Bought through Paystack like an order; the code is emailed and shown on the
-- confirmation page. Spent at checkout, over as many orders as it takes, in
-- the currency it was bought in. While an order waits for payment its gift
-- card amount is held, like stock, and given back if the order expires.

create type public.gift_card_status as enum ('pending', 'active', 'void');

create table public.gift_cards (
  id               uuid primary key default gen_random_uuid(),
  -- The purchase's Paystack reference, e.g. GC-7K3F9Q2MXW.
  reference        text not null unique check (reference ~ '^GC-[A-Z0-9]{8,16}$'),
  -- What the recipient types at checkout, e.g. NIMI-7K3F-9Q2M-XW4P.
  code             text not null unique check (code ~ '^NIMI-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$'),
  status           public.gift_card_status not null default 'pending',
  currency         char(3) not null,
  amount           numeric(12, 2) not null check (amount > 0),
  balance          numeric(12, 2) not null check (balance >= 0),
  -- What Paystack charged for it, in Naira, at this rate (Naira per unit).
  fx_rate          numeric(14, 4) not null check (fx_rate > 0),
  amount_ngn       integer not null check (amount_ngn > 0),
  buyer_name       text not null check (length(buyer_name) <= 120),
  buyer_email      text not null check (length(buyer_email) <= 254),
  recipient_name   text check (length(recipient_name) <= 120),
  recipient_email  text check (length(recipient_email) <= 254),
  message          text check (length(message) <= 500),
  paystack_reference text,
  paid_ngn         integer,
  needs_review     text,
  paid_at          timestamptz,
  expires_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create trigger gift_cards_updated_at before update on public.gift_cards
  for each row execute function public.set_updated_at();

-- Each use of a gift card on an order: held while the order waits for
-- payment, captured once it's paid, released if it expires.
create table public.gift_card_redemptions (
  id           uuid primary key default gen_random_uuid(),
  gift_card_id uuid not null references public.gift_cards (id),
  order_id     uuid not null references public.orders (id) on delete cascade,
  amount       numeric(12, 2) not null check (amount > 0),
  status       text not null default 'held' check (status in ('held', 'captured', 'released')),
  created_at   timestamptz not null default now()
);

create index gift_card_redemptions_order_idx on public.gift_card_redemptions (order_id);
create index gift_card_redemptions_card_idx on public.gift_card_redemptions (gift_card_id);

alter table public.gift_cards enable row level security;
alter table public.gift_card_redemptions enable row level security;
-- No policies: gift cards are server-only.

-- Orders can now be paid partly (or wholly) by gift card. `total` stays the
-- order's total; `total_ngn` is what's left for Paystack, which can be zero.
alter table public.orders
  add column gift_card_amount numeric(12, 2) not null default 0 check (gift_card_amount >= 0),
  drop constraint orders_total_ngn_check,
  add constraint orders_total_ngn_check check (total_ngn >= 0);

-- ---------------------------------------------------------------------------
-- Functions (replacing Stage 3's, plus two new ones). Server-only.

-- Expired, unpaid orders give back their stock and their gift card holds.
create or replace function public.release_expired_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  released integer;
begin
  with expired as (
    update orders set status = 'expired'
    where status = 'pending' and expires_at < now()
    returning id
  ), restock as (
    update product_variants v set stock = v.stock + i.qty
    from (
      select oi.sku, sum(oi.quantity)::int as qty
      from order_items oi join expired e on e.id = oi.order_id
      where oi.sku is not null
      group by oi.sku
    ) i
    where v.sku = i.sku
    returning 1
  ), unheld as (
    update gift_card_redemptions r set status = 'released'
    from expired e
    where r.order_id = e.id and r.status = 'held'
    returning r.gift_card_id, r.amount
  ), refund as (
    update gift_cards g set balance = g.balance + u.amount
    from (select gift_card_id, sum(amount) as amount from unheld group by gift_card_id) u
    where g.id = u.gift_card_id
    returning 1
  )
  -- (Postgres runs data-changing CTEs like these even when unreferenced.)
  select count(*) into released from expired;
  return released;
end;
$$;

-- As in Stage 3, plus: when `o` has a gift_card_code, holds
-- o.gift_card_amount of its balance against the order. Raises
-- gift_card_invalid / gift_card_currency / gift_card_balance if it can't.
create or replace function public.create_order(o jsonb, items jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  order_id uuid;
  item jsonb;
  held integer;
  card gift_cards%rowtype;
  card_amount numeric := coalesce((o->>'gift_card_amount')::numeric, 0);
begin
  perform release_expired_orders();

  insert into orders (reference, email, name, phone, address, shipping_zone_id, note, discount_code,
                      free_shipping, currency, subtotal, shipping, discount, total, fx_rate, total_ngn,
                      gift_card_amount)
  values (o->>'reference', o->>'email', o->>'name', o->>'phone', o->'address', o->>'shipping_zone_id',
          nullif(o->>'note', ''), nullif(o->>'discount_code', ''), coalesce((o->>'free_shipping')::boolean, false),
          o->>'currency', (o->>'subtotal')::numeric, (o->>'shipping')::numeric, (o->>'discount')::numeric,
          (o->>'total')::numeric, (o->>'fx_rate')::numeric, (o->>'total_ngn')::integer, card_amount)
  returning id into order_id;

  for item in select * from jsonb_array_elements(items) loop
    update product_variants set stock = stock - (item->>'quantity')::int
    where sku = item->>'sku' and stock >= (item->>'quantity')::int;
    get diagnostics held = row_count;
    if held = 0 then
      raise exception 'out_of_stock:%', item->>'sku' using errcode = 'P0001';
    end if;

    insert into order_items (order_id, sku, product_slug, name, variant_label, image, quantity, unit_price_ngn, unit_price)
    values (order_id, item->>'sku', item->>'product_slug', item->>'name', item->>'variant_label', item->>'image',
            (item->>'quantity')::int, (item->>'unit_price_ngn')::int, (item->>'unit_price')::numeric);
  end loop;

  if nullif(o->>'gift_card_code', '') is not null and card_amount > 0 then
    select * into card from gift_cards where code = o->>'gift_card_code' for update;
    if not found or card.status <> 'active' or card.expires_at < now() then
      raise exception 'gift_card_invalid' using errcode = 'P0001';
    end if;
    if card.currency <> o->>'currency' then
      raise exception 'gift_card_currency' using errcode = 'P0001';
    end if;
    if card.balance < card_amount then
      raise exception 'gift_card_balance' using errcode = 'P0001';
    end if;
    update gift_cards set balance = balance - card_amount where id = card.id;
    insert into gift_card_redemptions (gift_card_id, order_id, amount) values (card.id, order_id, card_amount);
  end if;

  return order_id;
end;
$$;

-- As in Stage 3, plus gift cards: held amounts are captured, and an order paid
-- after its hold ran out takes the amount from the card again if it can.
create or replace function public.mark_order_paid(ref text, paid_kobo bigint, paystack_ref text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  ord orders%rowtype;
  item record;
  short boolean := false;
  card_short boolean := false;
  redemption record;
begin
  select * into ord from orders where reference = ref for update;
  if not found then
    raise exception 'unknown_order:%', ref using errcode = 'P0002';
  end if;
  if ord.status in ('paid', 'fulfilled', 'refunded') then
    return 'already_paid';
  end if;

  -- Paid after the 30-minute hold ran out: take the stock (and gift card
  -- amount) again if it's still there, otherwise flag the order for Nimi.
  if ord.status in ('expired', 'cancelled') then
    for item in select sku, quantity from order_items where order_id = ord.id and sku is not null loop
      update product_variants set stock = stock - item.quantity where sku = item.sku and stock >= item.quantity;
      if not found then short := true; end if;
    end loop;
    for redemption in select id, gift_card_id, amount from gift_card_redemptions where order_id = ord.id and status = 'released' loop
      update gift_cards set balance = balance - redemption.amount where id = redemption.gift_card_id and balance >= redemption.amount;
      if found then
        update gift_card_redemptions set status = 'held' where id = redemption.id;
      else
        card_short := true;
      end if;
    end loop;
  end if;

  update gift_card_redemptions set status = 'captured' where order_id = ord.id and status = 'held';

  update orders set
    status = 'paid',
    paid_at = now(),
    paid_ngn = (paid_kobo / 100)::int,
    paystack_reference = paystack_ref,
    needs_review = case
      when paid_kobo < ord.total_ngn::bigint * 100 then 'Paid less than the order total'
      when short then 'Paid after the hold expired and some stock had gone'
      when card_short then 'Paid after the hold expired and the gift card had since been spent'
      else null
    end
  where id = ord.id;

  if ord.discount_code is not null then
    update discount_codes set uses = uses + 1 where code = ord.discount_code;
  end if;
  if ord.free_shipping then
    update shipping_zones set free_orders_left = greatest(free_orders_left - 1, 0) where id = ord.shipping_zone_id;
  end if;

  return 'paid';
end;
$$;

-- Records a gift card purchase as paid and starts its 12 months. Like
-- mark_order_paid, safe to call twice: 'paid' once, then 'already_paid'.
create or replace function public.mark_gift_card_paid(ref text, paid_kobo bigint, paystack_ref text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  card gift_cards%rowtype;
begin
  select * into card from gift_cards where reference = ref for update;
  if not found then
    raise exception 'unknown_gift_card:%', ref using errcode = 'P0002';
  end if;
  if card.status <> 'pending' then
    return 'already_paid';
  end if;
  update gift_cards set
    status = 'active',
    paid_at = now(),
    expires_at = now() + interval '12 months',
    paid_ngn = (paid_kobo / 100)::int,
    paystack_reference = paystack_ref,
    needs_review = case when paid_kobo < card.amount_ngn::bigint * 100 then 'Paid less than the gift card amount' end
  where id = card.id;
  return 'paid';
end;
$$;

revoke all on function public.release_expired_orders() from public, anon, authenticated;
revoke all on function public.create_order(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.mark_order_paid(text, bigint, text) from public, anon, authenticated;
revoke all on function public.mark_gift_card_paid(text, bigint, text) from public, anon, authenticated;
grant execute on function public.release_expired_orders() to service_role;
grant execute on function public.create_order(jsonb, jsonb) to service_role;
grant execute on function public.mark_order_paid(text, bigint, text) to service_role;
grant execute on function public.mark_gift_card_paid(text, bigint, text) to service_role;
