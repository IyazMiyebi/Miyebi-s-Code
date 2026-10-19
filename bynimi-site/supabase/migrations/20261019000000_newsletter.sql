-- "Join the Inner Circle" sign-ups from the home page.
--
-- The public can add an email but never read the list back; Nimi sees it in
-- the Supabase table editor (and in the admin area from Stage 5).

create table public.newsletter_subscribers (
  id          uuid primary key default gen_random_uuid(),
  email       text not null check (
                length(email) <= 254
                and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
              ),
  source      text not null default 'home' check (length(source) <= 40),
  created_at  timestamptz not null default now()
);

-- One row per address, whatever the capitalisation.
create unique index newsletter_subscribers_email_key
  on public.newsletter_subscribers (lower(email));

alter table public.newsletter_subscribers enable row level security;

create policy "Anyone can join the newsletter"
  on public.newsletter_subscribers for insert
  to anon, authenticated
  with check (true);

-- No select/update/delete policies: the list is private.
