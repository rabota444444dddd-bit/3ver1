-- ЦКС — Робочий офіс: ОНОВЛЕННЯ бази №3 — коментарі до задач та доступ за посиланням
-- Якщо базу вже створювали раніше — виконайте цей файл один раз:
-- Supabase → SQL Editor → New query → вставити → Run.
-- (Для нової бази він уже включений у schema.sql.)

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
