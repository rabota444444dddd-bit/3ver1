-- ЦКС — Робочий офіс: схема бази даних для Supabase
-- Виконайте весь файл один раз: Supabase → SQL Editor → New query → вставити → Run.

-- 1. Таблиці
create table if not exists public.profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  pos text not null check (pos in ('boss','asst')),
  admin boolean not null default false,
  created_at timestamptz default now()
);
create table if not exists public.depts(
  id text primary key,
  name text not null,
  boss uuid references public.profiles(id),
  created_at timestamptz default now()
);
create table if not exists public.dept_members(
  dept_id text references public.depts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key(dept_id,user_id)
);
-- усі дані відділу: kind = 'meta' (сторінки, стовпці, категорії), 'task' (задача), 'project' (проєкт)
create table if not exists public.docs(
  id text primary key,
  dept_id text not null references public.depts(id) on delete cascade,
  kind text not null,
  data jsonb not null,
  updated_at timestamptz default now()
);
create index if not exists docs_dept_idx on public.docs(dept_id);

-- 2. Допоміжні функції прав
create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path=public as $$
  select coalesce((select admin from public.profiles where id=auth.uid()),false) $$;
create or replace function public.is_member(d text) returns boolean
language sql security definer stable set search_path=public as $$
  select public.is_admin() or exists(select 1 from public.dept_members where dept_id=d and user_id=auth.uid()) $$;
create or replace function public.is_boss(d text) returns boolean
language sql security definer stable set search_path=public as $$
  select public.is_admin() or exists(select 1 from public.depts where id=d and boss=auth.uid()) $$;

-- 3. Автоматичне створення профілю при реєстрації
--    Перший зареєстрований користувач отримує повний доступ (admin).
--    Помічник, який обрав відділ при реєстрації, одразу додається до нього.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
declare first_user boolean; d text; p text;
begin
  select not exists(select 1 from public.profiles) into first_user;
  p := case when new.raw_user_meta_data->>'pos'='asst' then 'asst' else 'boss' end;
  insert into public.profiles(id,name,pos,admin)
  values(new.id, coalesce(nullif(new.raw_user_meta_data->>'name',''),'Без імені'), p, first_user);
  d := new.raw_user_meta_data->>'dept';
  if p='asst' and d is not null and d<>'' and exists(select 1 from public.depts where id=d) then
    insert into public.dept_members(dept_id,user_id) values(d,new.id);
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Автор відділу автоматично стає його учасником
create or replace function public.handle_new_dept() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.boss is not null then
    insert into public.dept_members(dept_id,user_id) values(new.id,new.boss) on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists on_dept_created on public.depts;
create trigger on_dept_created after insert on public.depts
for each row execute function public.handle_new_dept();

-- 4. Права доступу (Row Level Security)
alter table public.profiles enable row level security;
alter table public.depts enable row level security;
alter table public.dept_members enable row level security;
alter table public.docs enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (true);

drop policy if exists depts_select on public.depts;
create policy depts_select on public.depts for select to authenticated using (public.is_member(id));
drop policy if exists depts_insert on public.depts;
create policy depts_insert on public.depts for insert to authenticated
  with check (boss=auth.uid() and exists(select 1 from public.profiles where id=auth.uid() and (pos='boss' or admin)));
drop policy if exists depts_update on public.depts;
create policy depts_update on public.depts for update to authenticated using (public.is_boss(id)) with check (public.is_boss(id));
drop policy if exists depts_delete on public.depts;
create policy depts_delete on public.depts for delete to authenticated using (public.is_boss(id));

drop policy if exists members_select on public.dept_members;
create policy members_select on public.dept_members for select to authenticated using (public.is_member(dept_id));
drop policy if exists members_insert on public.dept_members;
create policy members_insert on public.dept_members for insert to authenticated with check (public.is_boss(dept_id));
drop policy if exists members_delete on public.dept_members;
create policy members_delete on public.dept_members for delete to authenticated using (public.is_boss(dept_id));

drop policy if exists docs_all on public.docs;
create policy docs_all on public.docs for all to authenticated
  using (public.is_member(dept_id)) with check (public.is_member(dept_id));

-- 5. Список відділів для екрана реєстрації (бачать усі, тільки назва відділу й ім'я начальника)
create or replace view public.public_depts as
  select d.id, d.name, p.name as boss_name from public.depts d left join public.profiles p on p.id=d.boss;
grant select on public.public_depts to anon, authenticated;

-- 6. Сховище файлів (фото об'єктів, вкладення)
insert into storage.buckets(id,name,public) values('files','files',true) on conflict (id) do nothing;
drop policy if exists files_upload on storage.objects;
create policy files_upload on storage.objects for insert to authenticated with check (bucket_id='files');

-- 7. Оновлення в реальному часі (змінює відразу в усіх, хто відкрив сайт)
do $$ begin
  begin alter publication supabase_realtime add table public.docs; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.dept_members; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.depts; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.profiles; exception when duplicate_object then null; end;
end $$;
