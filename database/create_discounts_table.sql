-- Create discounts table
create table public.discounts (
  id uuid not null default gen_random_uuid (),
  title text not null,
  description text null,
  discount_amount text not null,
  city text null,
  district text null,
  address text null,
  phone text null,
  website_url text null,
  logo_url text null,
  category text null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint discounts_pkey primary key (id)
);

-- Enable RLS
alter table public.discounts enable row level security;

-- Policies
create policy "Public can view active discounts" on public.discounts
  for select
  to public
  using (is_active = true);

create policy "Admins can manage discounts" on public.discounts
  for all
  to authenticated
  using (true)
  with check (true);

-- Add storage bucket for discount logos if it doesn't exist (optional, usually handled separately but good to have)
-- insert into storage.buckets (id, name, public) 
-- values ('discount-logos', 'discount-logos', true) 
-- on conflict (id) do nothing;

-- Storage policies for discount-logos
-- create policy "Public Access" on storage.objects for select using ( bucket_id = 'discount-logos' );
-- create policy "Authenticated Insert" on storage.objects for insert with check ( bucket_id = 'discount-logos' and auth.role() = 'authenticated' );
-- create policy "Authenticated Update" on storage.objects for update with check ( bucket_id = 'discount-logos' and auth.role() = 'authenticated' );
-- create policy "Authenticated Delete" on storage.objects for delete using ( bucket_id = 'discount-logos' and auth.role() = 'authenticated' );
