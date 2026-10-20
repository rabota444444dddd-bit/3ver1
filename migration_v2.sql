-- ЦКС — Робочий офіс: ОНОВЛЕННЯ бази (посади «Проєктний менеджер» і «Помічник проєктного менеджера»)
-- Якщо ви вже виконували schema.sql раніше — виконайте цей файл один раз:
-- Supabase → SQL Editor → New query → вставити → Run.
-- Якщо база створюється вперше — достатньо schema.sql (він уже містить ці зміни).

alter table public.profiles drop constraint if exists profiles_pos_check;
alter table public.profiles add constraint profiles_pos_check check (pos in ('boss','asst','pm','apm'));

create or replace function public.is_boss(d text) returns boolean
language sql security definer stable set search_path=public as $$
  select public.is_admin()
      or exists(select 1 from public.depts where id=d and boss=auth.uid())
      or exists(select 1 from public.dept_members m join public.profiles pr on pr.id=m.user_id
                where m.dept_id=d and m.user_id=auth.uid() and pr.pos='pm') $$;

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
