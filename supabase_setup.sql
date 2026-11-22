-- Run in Supabase SQL Editor on your NEW project (or review before applying).
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 email text,
 phone text,
 role text not null default 'seller',
 created_at timestamptz default now()
);
create table if not exists public.sellers (
 id uuid primary key references auth.users(id) on delete cascade,
 seller_name text not null,
 phone text,
 created_at timestamptz default now()
);
create table if not exists public.products (
 id uuid primary key default gen_random_uuid(),
 seller_id uuid references public.sellers(id) on delete cascade,
 name text not null,
 price numeric not null check(price > 0),
 category text not null default 'Other',
 image_url text,
 description text,
 is_active boolean not null default true,
 created_at timestamptz default now()
);
create table if not exists public.orders (
 id uuid primary key default gen_random_uuid(),
 product_id uuid references public.products(id) on delete set null,
 buyer_name text not null,
 buyer_phone text not null,
 address text not null,
 village text,
 town text not null,
 province text not null,
 quantity integer not null check(quantity > 0),
 payment_method text not null default 'COD',
 status text not null default 'Pending',
 created_at timestamptz default now(),
 product_name text,
 unit_price numeric,
 customer_name text,
 phone text,
 city text
);
alter table public.profiles enable row level security;
alter table public.sellers enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
-- Profiles/sellers: public can only see basic seller info through marketplace views; seller may read own profile.
drop policy if exists "profile own select" on public.profiles;
create policy "profile own select" on public.profiles for select to authenticated using (id=auth.uid() or (auth.jwt()->'app_metadata'->>'role')='admin');
drop policy if exists "profile own update" on public.profiles;
create policy "profile own update" on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
drop policy if exists "seller public read" on public.sellers;
create policy "seller public read" on public.sellers for select to anon,authenticated using (true);
drop policy if exists "seller self insert" on public.sellers;
create policy "seller self insert" on public.sellers for insert to authenticated with check (id=auth.uid());
drop policy if exists "seller self update" on public.sellers;
create policy "seller self update" on public.sellers for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
drop policy if exists "products public read" on public.products;
create policy "products public read" on public.products for select to anon,authenticated using (is_active=true or seller_id=auth.uid() or (auth.jwt()->'app_metadata'->>'role')='admin');
drop policy if exists "seller product insert" on public.products;
create policy "seller product insert" on public.products for insert to authenticated with check (seller_id=auth.uid());
drop policy if exists "seller product update" on public.products;
create policy "seller product update" on public.products for update to authenticated using (seller_id=auth.uid() or (auth.jwt()->'app_metadata'->>'role')='admin') with check (seller_id=auth.uid() or (auth.jwt()->'app_metadata'->>'role')='admin');
drop policy if exists "admin product delete" on public.products;
create policy "admin product delete" on public.products for delete to authenticated using ((auth.jwt()->'app_metadata'->>'role')='admin');
drop policy if exists "orders public create" on public.orders;
create policy "orders public create" on public.orders for insert to anon,authenticated with check (true);
drop policy if exists "orders admin read" on public.orders;
create policy "orders admin read" on public.orders for select to authenticated using ((auth.jwt()->'app_metadata'->>'role')='admin');
drop policy if exists "orders admin update" on public.orders;
create policy "orders admin update" on public.orders for update to authenticated using ((auth.jwt()->'app_metadata'->>'role')='admin') with check ((auth.jwt()->'app_metadata'->>'role')='admin');
-- Admin-only seller/profile list access, tied to auth JWT app_metadata role.
drop policy if exists "admin seller read" on public.sellers;
create policy "admin seller read" on public.sellers for select to authenticated using ((auth.jwt()->'app_metadata'->>'role')='admin' or id=auth.uid());
drop policy if exists "admin profile read" on public.profiles;
create policy "admin profile read" on public.profiles for select to authenticated using ((auth.jwt()->'app_metadata'->>'role')='admin' or id=auth.uid());
-- Public storage bucket for product image URLs. Storage policy permits authenticated sellers upload own folder only.
insert into storage.buckets(id,name,public) values ('product-photos','product-photos',true) on conflict(id) do update set public=true;
drop policy if exists "seller upload product photos" on storage.objects;
create policy "seller upload product photos" on storage.objects for insert to authenticated with check (bucket_id='product-photos' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "public read product photos" on storage.objects;
create policy "public read product photos" on storage.objects for select to anon,authenticated using (bucket_id='product-photos');
-- IMPORTANT: Admin JWT app_metadata role must be set to admin from Supabase Auth/admin tooling.
-- Do not set an admin role through a public signup form or user-editable metadata.


-- Automatically create seller/profile rows for new signups.
create or replace function public.handle_new_seller_signup()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
 full_name text;
 seller_phone text;
begin
 full_name := coalesce(nullif(new.raw_user_meta_data->>'full_name',''), nullif(new.raw_user_meta_data->>'name',''), new.email);
 seller_phone := coalesce(nullif(new.raw_user_meta_data->>'phone',''), 'Not provided');
 insert into public.profiles(id,email,phone,role) values(new.id,new.email,seller_phone,'seller')
 on conflict(id) do update set email=excluded.email, phone=excluded.phone;
 insert into public.sellers(id,seller_name,phone) values(new.id,full_name,seller_phone)
 on conflict(id) do update set seller_name=excluded.seller_name, phone=excluded.phone;
 return new;
end;
$$;
drop trigger if exists on_auth_user_created_seller on auth.users;
create trigger on_auth_user_created_seller after insert on auth.users
for each row execute function public.handle_new_seller_signup();
