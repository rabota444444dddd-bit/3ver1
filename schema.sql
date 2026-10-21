-- ЦКС — Робочий офіс: схема бази даних для Supabase
-- Виконайте весь файл один раз: Supabase → SQL Editor → New query → вставити → Run.

-- 1. Таблиці
create table if not exists public.profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  pos text not null check (pos in ('boss','asst','pm','apm')),
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
  select public.is_admin()
      or exists(select 1 from public.depts where id=d and boss=auth.uid())
      or exists(select 1 from public.dept_members m join public.profiles pr on pr.id=m.user_id
                where m.dept_id=d and m.user_id=auth.uid() and pr.pos='pm') $$;

-- 3. Автоматичне створення профілю при реєстрації
--    Перший зареєстрований користувач отримує повний доступ (admin).
--    Помічник, який обрав відділ при реєстрації, одразу додається до нього.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
declare first_user boolean; d text; p text;
begin
  select not exists(select 1 from public.profiles) into first_user;
  p := case when new.raw_user_meta_data->>'pos' in ('asst','pm','apm') then new.raw_user_meta_data->>'pos' else 'boss' end;
  insert into public.profiles(id,name,pos,admin)
  values(new.id, coalesce(nullif(new.raw_user_meta_data->>'name',''),'Без імені'), p, first_user);
  d := new.raw_user_meta_data->>'dept';
  if p<>'boss' and d is not null and d<>'' and exists(select 1 from public.depts where id=d) then
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

-- ========== 8. Коментарі та доступ за посиланням (те саме, що migration_v3.sql) ==========

-- 1. Коментарі (можуть бути адресовані конкретному співробітнику; можна зробити приватними)
create table if not exists public.comments(
  id text primary key,
  dept_id text not null references public.depts(id) on delete cascade,
  task_id text not null,
  author uuid references public.profiles(id) on delete set null,
  author_name text not null,
  to_ids jsonb not null default '[]'::jsonb,
  to_names jsonb not null default '[]'::jsonb,
  body text not null check (char_length(body) between 1 and 4000),
  is_private boolean not null default false,
  guest boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists comments_task_idx on public.comments(task_id);
alter table public.comments enable row level security;
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments for select to authenticated
  using (public.is_member(dept_id) and (not is_private or author=auth.uid() or to_ids ? auth.uid()::text or public.is_admin()));
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert to authenticated
  with check (public.is_member(dept_id) and author=auth.uid());
drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments for delete to authenticated
  using (author=auth.uid() or public.is_boss(dept_id));

-- 2. Посилання доступу до задачі (перегляд / коментування / редагування)
create table if not exists public.shares(
  token text primary key,
  dept_id text not null references public.depts(id) on delete cascade,
  task_id text not null,
  role text not null check (role in ('view','comment','edit')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked boolean not null default false
);
create index if not exists shares_task_idx on public.shares(task_id);
alter table public.shares enable row level security;
drop policy if exists shares_select on public.shares;
create policy shares_select on public.shares for select to authenticated using (public.is_member(dept_id));
drop policy if exists shares_insert on public.shares;
create policy shares_insert on public.shares for insert to authenticated with check (public.is_member(dept_id) and created_by=auth.uid());
drop policy if exists shares_update on public.shares;
create policy shares_update on public.shares for update to authenticated using (public.is_member(dept_id)) with check (public.is_member(dept_id));
drop policy if exists shares_delete on public.shares;
create policy shares_delete on public.shares for delete to authenticated using (public.is_member(dept_id));

-- 3. Функції для тих, хто відкриває посилання БЕЗ акаунта (бачать лише одну задачу за токеном)
create or replace function public.shared_get(p_token text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare s public.shares; t jsonb; meta jsonb; proj jsonb; users jsonb; cm jsonb; dname text; catn text;
begin
  select * into s from public.shares where token=p_token and not revoked and (expires_at is null or expires_at>now());
  if not found then return null; end if;
  select data into t from public.docs where id='task:'||s.task_id and dept_id=s.dept_id;
  if t is null then return null; end if;
  select data into meta from public.docs where id='meta:'||s.dept_id;
  select data into proj from public.docs where id='project:'||coalesce(t->>'project','');
  select name into dname from public.depts where id=s.dept_id;
  select c->>'name' into catn from jsonb_array_elements(coalesce(meta->'cats','[]'::jsonb)) c where c->>'id'=t->>'cat' limit 1;
  select coalesce(jsonb_object_agg(p.id::text,p.name),'{}'::jsonb) into users from public.profiles p where p.id::text in (
    select jsonb_array_elements_text(coalesce(t->'who','[]'::jsonb))
    union
    select jsonb_array_elements_text(coalesce(sb->'who','[]'::jsonb)) from jsonb_array_elements(coalesce(t->'subs','[]'::jsonb)) sb);
  select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'by',c.author_name,'to','[]'::jsonb,'text',c.body,'guest',c.guest,
         'ts',(extract(epoch from c.created_at)*1000)::bigint) order by c.created_at),'[]'::jsonb) into cm
    from public.comments c where c.task_id=s.task_id and c.dept_id=s.dept_id and jsonb_array_length(c.to_ids)=0 and not c.is_private;
  return jsonb_build_object('role',s.role,'dept',dname,'task',t,'project',proj->>'name','cat',catn,'users',users,'comments',cm);
end $$;

create or replace function public.shared_comment(p_token text,p_name text,p_text text) returns boolean
language plpgsql security definer set search_path=public as $$
declare s public.shares;
begin
  select * into s from public.shares where token=p_token and not revoked and (expires_at is null or expires_at>now());
  if not found or s.role not in ('comment','edit') then return false; end if;
  if p_text is null or char_length(trim(p_text))=0 then return false; end if;
  insert into public.comments(id,dept_id,task_id,author,author_name,body,guest)
  values(replace(gen_random_uuid()::text,'-',''), s.dept_id, s.task_id, null,
         coalesce(nullif(left(trim(p_name),60),''),'Гість'), left(trim(p_text),4000), true);
  return true;
end $$;

create or replace function public.shared_update(p_token text,p_patch jsonb) returns boolean
language plpgsql security definer set search_path=public as $$
declare s public.shares; clean jsonb;
begin
  select * into s from public.shares where token=p_token and not revoked and (expires_at is null or expires_at>now());
  if not found or s.role<>'edit' then return false; end if;
  select coalesce(jsonb_object_agg(e.k,e.v),'{}'::jsonb) into clean from jsonb_each(p_patch) as e(k,v)
    where e.k in ('title','status','start','end','subs','doneAt','auto');
  update public.docs set data=data||clean, updated_at=now() where id='task:'||s.task_id and dept_id=s.dept_id;
  return true;
end $$;

grant execute on function public.shared_get(text) to anon, authenticated;
grant execute on function public.shared_comment(text,text,text) to anon, authenticated;
grant execute on function public.shared_update(text,jsonb) to anon, authenticated;

-- 4. Коментарі приходять колегам миттєво
do $$ begin
  begin alter publication supabase_realtime add table public.comments; exception when duplicate_object then null; end;
end $$;
