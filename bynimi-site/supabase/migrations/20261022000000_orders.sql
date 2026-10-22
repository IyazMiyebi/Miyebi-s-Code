-- Checkout: delivery zones, discount codes, orders and their items.
--
-- Only the server touches orders, with the secret (service role) key: there
-- are no public policies on orders, items or discount codes. The public can
-- read the delivery zones, to show fees at checkout.
--
-- Stock is reserved when checkout starts (create_order), released if the
-- order isn't paid within 30 minutes (release_expired_orders), and kept when
-- Paystack confirms payment (mark_order_paid, safe to call more than once).

-- ---------------------------------------------------------------------------
-- Delivery zones (copied from the Bumpa store, 22 Oct 2026)

create table public.shipping_zones (
  id               text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name             text not null,
  description      text,
  -- ISO country codes this zone delivers to.
  countries        text[] not null,
  price_ngn        integer not null check (price_ngn >= 0),
  -- Promotions like "free shipping on the first 5 UK orders": each paid order
  -- that used the zone counts one down while it's above zero.
  free_orders_left integer not null default 0 check (free_orders_left >= 0),
  is_pickup        boolean not null default false,
  is_active        boolean not null default true,
  position         integer not null default 0
);

alter table public.shipping_zones enable row level security;

create policy "Active delivery zones are public"
  on public.shipping_zones for select
  using (is_active);

insert into public.shipping_zones (id, name, description, countries, price_ngn, free_orders_left, is_pickup, position) values
  ('lagos-mainland-2', 'Lagos Mainland 2', 'Maryland, Ketu, Ojota, Ogudu, Mile 12, Ilupeju, Festac, Anthony', '{NG}', 4500, 0, false, 10),
  ('lagos-mainland-3', 'Lagos Mainland 3', 'New Garage, Apapa, Ifako/Ijaiye, Iju Ishaga, Iyana', '{NG}', 5500, 0, false, 11),
  ('lagos-mainland-1', 'Lagos Mainland 1', 'Irawo, Owode, Yaba, Onipan, Bariga, Surulere, Somolu, Orile, Iganmu, Amukoko, Gbagada, Oworo, Ikosi, Berger, Ikeja, Ogba, Magodo, CMD Road, Obawole, Agege', '{NG}', 6000, 0, false, 12),
  ('lagos-island', 'Lagos Island', 'Lekki Phase 1, Victoria Island, Ikoyi', '{NG}', 7000, 0, false, 13),
  ('lagos-island-outskirts', 'Lagos Island outskirts', 'After Chevron, VGC and beyond', '{NG}', 8500, 0, false, 14),
  ('pickup-okota', 'Pick up in Okota', 'Collect from Okota, Lagos. Nimi will message you when it''s ready', '{NG}', 0, 0, true, 20),
  ('pickup-ph-park', 'Port Harcourt park pick-up', 'Collect from the park in Port Harcourt', '{NG}', 7500, 0, true, 21),
  ('ilorin', 'Ilorin', null, '{NG}', 8000, 0, false, 30),
  ('south-west', 'South-West', 'Ogun, Ondo, Osun, Oyo, Ekiti', '{NG}', 13500, 0, false, 31),
  ('south-east', 'South-East', 'Imo, Anambra, Enugu, Ebonyi, Abia', '{NG}', 13800, 0, false, 32),
  ('north-east', 'North-East', 'Borno, Yobe, Adamawa, Bauchi, Gombe, Taraba', '{NG}', 13800, 0, false, 33),
  ('north-central', 'North Central', 'Niger, Plateau, Kogi, Kwara, Benue, Nasarawa', '{NG}', 14500, 0, false, 34),
  ('ekiti', 'Ekiti', null, '{NG}', 15000, 0, false, 35),
  ('north-west', 'North-West', 'Kaduna, Kano, Katsina, Zamfara, Sokoto, Kebbi, Jigawa', '{NG}', 16000, 0, false, 36),
  ('south-south', 'South-South', 'Rivers, Cross River, Akwa Ibom, Bayelsa, Delta, Edo', '{NG}', 17000, 0, false, 37),
  ('abuja-town', 'Abuja town', null, '{NG}', 18000, 0, false, 38),
  ('abuja-outskirts', 'Abuja outskirts', null, '{NG}', 18000, 0, false, 39),
  ('united-kingdom', 'United Kingdom', 'Up to 2kg', '{GB}', 40000, 5, false, 50),
  ('south-africa', 'South Africa', null, '{ZA}', 37000, 0, false, 51),
  ('australia', 'Australia', null, '{AU}', 45000, 0, false, 52),
  ('usa-canada', 'USA & Canada', null, '{US,CA}', 60000, 0, false, 53),
  ('france-germany-italy', 'France, Germany & Italy', null, '{FR,DE,IT}', 60000, 0, false, 54),
  ('ireland', 'Ireland', null, '{IE}', 70000, 0, false, 55);

-- ---------------------------------------------------------------------------
-- Discount codes

create table public.discount_codes (
  code             text primary key check (code = upper(code) and code ~ '^[A-Z0-9_-]{3,30}$'),
  kind             text not null check (kind in ('percent', 'fixed_ngn')),
  value            integer not null check (value > 0),
  first_order_only boolean not null default false,
  is_active        boolean not null default true,
  starts_at        timestamptz,
  ends_at          timestamptz,
  max_uses         integer check (max_uses > 0),
  uses             integer not null default 0,
  check (kind <> 'percent' or value <= 100)
);

alter table public.discount_codes enable row level security;

insert into public.discount_codes (code, kind, value, first_order_only) values ('WELCOME10', 'percent', 10, true);

-- ---------------------------------------------------------------------------
-- Orders

create type public.order_status as enum ('pending', 'paid', 'expired', 'cancelled', 'fulfilled', 'refunded');

create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  -- Short code customers quote, e.g. BN-7K3F9Q. Also the Paystack reference.
  reference        text not null unique check (reference ~ '^BN-[A-Z0-9]{6,12}$'),
  status           public.order_status not null default 'pending',
  email            text not null check (length(email) <= 254),
  name             text not null check (length(name) <= 120),
  phone            text not null check (length(phone) <= 40),
  -- { line1, line2, city, state, postcode, country } (country = ISO code)
  address          jsonb not null check (jsonb_typeof(address) = 'object'),
  shipping_zone_id text not null references public.shipping_zones (id),
  note             text check (length(note) <= 1000),
  discount_code    text references public.discount_codes (code),
  free_shipping    boolean not null default false,
  -- What the customer saw, in their currency...
  currency         char(3) not null,
  subtotal         numeric(12, 2) not null check (subtotal >= 0),
  shipping         numeric(12, 2) not null check (shipping >= 0),
  discount         numeric(12, 2) not null default 0 check (discount >= 0),
  total            numeric(12, 2) not null check (total >= 0),
  -- ...and what Paystack charges, in Naira, at this rate (Naira per unit).
  fx_rate          numeric(14, 4) not null check (fx_rate > 0),
  total_ngn        integer not null check (total_ngn > 0),
  paystack_reference text,
  paid_ngn         integer,
  needs_review     text,
  expires_at       timestamptz not null default now() + interval '30 minutes',
  paid_at          timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index orders_status_expires_idx on public.orders (status, expires_at);
create index orders_email_idx on public.orders (lower(email));

create table public.order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders (id) on delete cascade,
  sku            text references public.product_variants (sku) on update cascade on delete set null,
  product_slug   text not null,
  name           text not null,
  variant_label  text,
  image          text,
  quantity       integer not null check (quantity between 1 and 20),
  unit_price_ngn integer not null check (unit_price_ngn >= 0), -- the catalogue's base price
  unit_price     numeric(12, 2) not null check (unit_price >= 0) -- as shown, in the order's currency
);

create index order_items_order_id_idx on public.order_items (order_id);

create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
-- No policies: orders are server-only.

-- ---------------------------------------------------------------------------
-- Functions. Server-only: executable by service_role, not by the public.

-- Expired, unpaid orders give their stock back.
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
  )
  -- (Postgres runs data-changing CTEs like restock even when unreferenced.)
  select count(*) into released from expired;
  return released;
end;
$$;

-- Creates a pending order and reserves its stock, all or nothing. The server
-- has already priced it; this only checks and holds the stock.
-- `items` is [{ sku, product_slug, name, variant_label, image, quantity,
--               unit_price_ngn, unit_price }, ...]
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
begin
  perform release_expired_orders();

  insert into orders (reference, email, name, phone, address, shipping_zone_id, note, discount_code,
                      free_shipping, currency, subtotal, shipping, discount, total, fx_rate, total_ngn)
  values (o->>'reference', o->>'email', o->>'name', o->>'phone', o->'address', o->>'shipping_zone_id',
          nullif(o->>'note', ''), nullif(o->>'discount_code', ''), coalesce((o->>'free_shipping')::boolean, false),
          o->>'currency', (o->>'subtotal')::numeric, (o->>'shipping')::numeric, (o->>'discount')::numeric,
          (o->>'total')::numeric, (o->>'fx_rate')::numeric, (o->>'total_ngn')::integer)
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

  return order_id;
end;
$$;

-- Records a successful Paystack payment. Safe to call more than once (the
-- return page and the webhook both do): returns 'paid' only for the call that
-- recorded it, 'already_paid' after that, so emails go out exactly once.
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
begin
  select * into ord from orders where reference = ref for update;
  if not found then
    raise exception 'unknown_order:%', ref using errcode = 'P0002';
  end if;
  if ord.status in ('paid', 'fulfilled', 'refunded') then
    return 'already_paid';
  end if;

  -- Paid after the 30-minute hold ran out: take the stock again if it's
  -- still there, otherwise flag the order for Nimi.
  if ord.status in ('expired', 'cancelled') then
    for item in select sku, quantity from order_items where order_id = ord.id and sku is not null loop
      update product_variants set stock = stock - item.quantity where sku = item.sku and stock >= item.quantity;
      if not found then short := true; end if;
    end loop;
  end if;

  update orders set
    status = 'paid',
    paid_at = now(),
    paid_ngn = (paid_kobo / 100)::int,
    paystack_reference = paystack_ref,
    needs_review = case
      when paid_kobo < ord.total_ngn::bigint * 100 then 'Paid less than the order total'
      when short then 'Paid after the hold expired and some stock had gone'
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

-- Has this email paid for an order before? (for first-order discounts)
create or replace function public.has_paid_order(customer_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from orders
    where lower(email) = lower(customer_email) and status in ('paid', 'fulfilled')
  );
$$;

revoke all on function public.release_expired_orders() from public, anon, authenticated;
revoke all on function public.create_order(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.mark_order_paid(text, bigint, text) from public, anon, authenticated;
revoke all on function public.has_paid_order(text) from public, anon, authenticated;
grant execute on function public.release_expired_orders() to service_role;
grant execute on function public.create_order(jsonb, jsonb) to service_role;
grant execute on function public.mark_order_paid(text, bigint, text) to service_role;
grant execute on function public.has_paid_order(text) to service_role;
