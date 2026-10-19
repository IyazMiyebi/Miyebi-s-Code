-- Pre-orders and "notify me when it's back" requests for sold-out variants.
--
-- Until checkout exists (Stage 3) a pre-order is a request: Nimi contacts the
-- customer on WhatsApp to confirm and arrange payment. The public can add a
-- request but never read any back; Nimi sees them in the Supabase table
-- editor (and in the admin area from Stage 5).

create type public.stock_request_kind as enum ('notify', 'preorder');

create table public.stock_requests (
  id            uuid primary key default gen_random_uuid(),
  kind          public.stock_request_kind not null,
  -- References keep requests tied to real products; they survive a variant
  -- being deleted (set null) so the history isn't lost.
  product_slug  text references public.products (slug) on update cascade on delete set null,
  sku           text references public.product_variants (sku) on update cascade on delete set null,
  variant_label text check (length(variant_label) <= 200),
  name          text check (length(name) <= 120),
  email         text not null check (
                  length(email) <= 254
                  and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
                ),
  phone         text check (length(phone) <= 40),
  quantity      integer not null default 1 check (quantity between 1 and 20),
  note          text check (length(note) <= 1000),
  currency      char(3),
  status        text not null default 'new'
                  check (status in ('new', 'contacted', 'fulfilled', 'cancelled')),
  created_at    timestamptz not null default now(),
  -- A pre-order needs a way to reach the customer on WhatsApp.
  constraint preorder_has_phone check (kind <> 'preorder' or (phone is not null and length(phone) >= 7))
);

create index stock_requests_sku_kind_idx on public.stock_requests (sku, kind, created_at);

alter table public.stock_requests enable row level security;

create policy "Anyone can request a sold-out piece"
  on public.stock_requests for insert
  to anon, authenticated
  with check (status = 'new');

-- No select/update/delete policies: the requests are private.
