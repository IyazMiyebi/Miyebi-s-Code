-- Catalog: products, variants, collections, currencies.
-- Orders, customers and payments arrive in Stage 3; admin access in Stage 5.
--
-- Prices are whole Naira (integer). Paystack wants kobo, so multiply by 100
-- at checkout. Other currencies are display conversions from ngn_per_unit.

create type public.product_category as enum ('bag', 'charm', 'scarf', 'other');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------

create table public.products (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name          text not null,
  category      public.product_category not null default 'bag',
  description   text,
  dimensions    text,
  -- Ordered option labels, e.g. {Finish,Colour}. Each variant's `options`
  -- object uses exactly these keys.
  option_names  text[] not null default '{}',
  images        text[] not null default '{}',
  position      integer not null default 0,
  is_published  boolean not null default true,
  -- Old Bumpa listing ids and paths, used to redirect old links at launch.
  legacy_bumpa_ids bigint[] not null default '{}',
  legacy_paths     text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.product_variants (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references public.products (id) on delete cascade,
  sku             text not null unique,
  options         jsonb not null default '{}' check (jsonb_typeof(options) = 'object'),
  swatch          text check (swatch ~ '^#[0-9A-Fa-f]{6}$'),
  price_ngn       integer not null check (price_ngn >= 0),
  compare_at_ngn  integer check (compare_at_ngn is null or compare_at_ngn > price_ngn),
  stock           integer not null default 0 check (stock >= 0),
  -- images[0] is this variant's own photo only when has_photo; otherwise
  -- images is the wider gallery and the shop says a photo is coming.
  images          text[] not null default '{}',
  has_photo       boolean not null default false,
  position        integer not null default 0,
  legacy_bumpa_product_id bigint,
  legacy_bumpa_variant_id bigint,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (product_id, options)
);

create index product_variants_product_id_idx on public.product_variants (product_id, position);

create table public.collections (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name          text not null,
  description   text,
  image         text,
  position      integer not null default 0,
  is_published  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.collection_products (
  collection_id uuid not null references public.collections (id) on delete cascade,
  product_id    uuid not null references public.products (id) on delete cascade,
  position      integer not null default 0,
  primary key (collection_id, product_id)
);

create index collection_products_product_id_idx on public.collection_products (product_id);

create table public.currencies (
  code          char(3) primary key check (code = upper(code)),
  symbol        text not null,
  -- How many Naira one unit of this currency costs. NGN is 1.
  ngn_per_unit  numeric(12, 2) not null check (ngn_per_unit > 0),
  is_active     boolean not null default true,
  position      integer not null default 0
);

create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger product_variants_updated_at before update on public.product_variants
  for each row execute function public.set_updated_at();
create trigger collections_updated_at before update on public.collections
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security: the public (anon key) can read what's published.
-- Nobody can write through the public API; the server writes with the
-- service role key, and Stage 5 adds admin policies.

alter table public.products            enable row level security;
alter table public.product_variants    enable row level security;
alter table public.collections         enable row level security;
alter table public.collection_products enable row level security;
alter table public.currencies          enable row level security;

create policy "Published products are public"
  on public.products for select
  using (is_published);

create policy "Variants of published products are public"
  on public.product_variants for select
  using (exists (
    select 1 from public.products p
    where p.id = product_variants.product_id and p.is_published
  ));

create policy "Published collections are public"
  on public.collections for select
  using (is_published);

create policy "Collection membership is public"
  on public.collection_products for select
  using (
    exists (select 1 from public.collections c
            where c.id = collection_products.collection_id and c.is_published)
    and exists (select 1 from public.products p
                where p.id = collection_products.product_id and p.is_published)
  );

create policy "Active currencies are public"
  on public.currencies for select
  using (is_active);
