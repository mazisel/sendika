-- Fix RLS recursion on admin_users
-- Generated: 2026-01-27

-- Core permission helpers (row_security off to avoid recursion)
create or replace function public.current_user_is_super_admin()
returns boolean
language plpgsql
security definer
set search_path to public
set row_security = off
as $$
declare
  jwt_email text;
begin
  jwt_email := auth.jwt() ->> 'email';

  return exists (
    select 1
    from admin_users
    where (
        id = auth.uid()
        or (jwt_email is not null and lower(email) = lower(jwt_email))
      )
      and role = 'super_admin'
  );
end;
$$;

create or replace function public.check_user_permission(permission_key text)
returns boolean
language plpgsql
security definer
set search_path to public
set row_security = off
as $$
declare
  jwt_email text;
begin
  jwt_email := auth.jwt() ->> 'email';

  return exists (
    select 1
    from admin_users au
    join role_permissions rp on au.role_id = rp.role_id
    join permissions p on rp.permission_id = p.id
    where (
        au.id = auth.uid()
        or (jwt_email is not null and lower(au.email) = lower(jwt_email))
      )
      and p.key = permission_key
  );
end;
$$;

create or replace function public.is_admin_user()
returns boolean
language sql
security definer
set search_path to public
set row_security = off
as $$
  select exists (
    select 1
    from admin_users au
    where (
        au.id = auth.uid()
        or (auth.jwt() ->> 'email') is not null
           and lower(au.email) = lower(auth.jwt() ->> 'email')
      )
      and coalesce(au.is_active, true) = true
  );
$$;

create or replace function public.can_view_member(p_member_id uuid)
returns boolean
language sql
security definer
set search_path to public
set row_security = off
as $$
  select
    current_user_is_super_admin()
    or exists (
      select 1
      from members m
      join admin_users au on (
        au.id = auth.uid()
        or (auth.jwt() ->> 'email') is not null
           and lower(au.email) = lower(auth.jwt() ->> 'email')
      )
      where m.id = p_member_id
        and coalesce(au.is_active, true) = true
        and (
          check_user_permission('members.view')
          or check_user_permission('members.view.all')
          or check_user_permission('members.manage')
          or check_user_permission('members.manage.all')
          or (check_user_permission('members.view.region') and au.region = m.region)
          or (check_user_permission('members.manage.region') and au.region = m.region)
          or (check_user_permission('members.view.branch') and au.city = m.city)
          or (check_user_permission('members.manage.branch') and au.city = m.city)
        )
    );
$$;

create or replace function public.can_manage_member(p_member_id uuid)
returns boolean
language sql
security definer
set search_path to public
set row_security = off
as $$
  select
    current_user_is_super_admin()
    or exists (
      select 1
      from members m
      join admin_users au on (
        au.id = auth.uid()
        or (auth.jwt() ->> 'email') is not null
           and lower(au.email) = lower(auth.jwt() ->> 'email')
      )
      where m.id = p_member_id
        and coalesce(au.is_active, true) = true
        and (
          check_user_permission('members.manage')
          or check_user_permission('members.manage.all')
          or (check_user_permission('members.manage.region') and au.region = m.region)
          or (check_user_permission('members.manage.branch') and au.city = m.city)
        )
    );
$$;

create or replace function public.can_access_member_due(p_member_due_id uuid)
returns boolean
language sql
security definer
set search_path to public
set row_security = off
as $$
  select exists (
    select 1
    from member_dues md
    where md.id = p_member_due_id
      and can_view_member(md.member_id)
  );
$$;

create or replace function public.current_admin_region()
returns smallint
language sql
security definer
set search_path to public
set row_security = off
as $$
  select region
  from admin_users
  where (
      id = auth.uid()
      or ((auth.jwt() ->> 'email') is not null and lower(email) = lower(auth.jwt() ->> 'email'))
    )
  limit 1;
$$;

create or replace function public.current_admin_city()
returns text
language sql
security definer
set search_path to public
set row_security = off
as $$
  select city
  from admin_users
  where (
      id = auth.uid()
      or ((auth.jwt() ->> 'email') is not null and lower(email) = lower(auth.jwt() ->> 'email'))
    )
  limit 1;
$$;

-- Rebuild admin_users policies without recursive self-queries
DROP POLICY IF EXISTS "read_admin_users" ON public.admin_users;
DROP POLICY IF EXISTS "manage_admin_users" ON public.admin_users;

create policy "read_admin_users"
  on public.admin_users for select
  to authenticated
  using (
    current_user_is_super_admin()
    or id = auth.uid()
    or ((auth.jwt() ->> 'email') is not null and lower(email) = lower(auth.jwt() ->> 'email'))
    or check_user_permission('users.view')
    or check_user_permission('users.manage')
    or check_user_permission('users.view.all')
    or check_user_permission('users.manage.all')
    or (check_user_permission('users.view.region') and admin_users.region = public.current_admin_region())
    or (check_user_permission('users.view.branch') and admin_users.city = public.current_admin_city())
    or (check_user_permission('users.manage.region') and admin_users.region = public.current_admin_region())
    or (check_user_permission('users.manage.branch') and admin_users.city = public.current_admin_city())
  );

create policy "manage_admin_users"
  on public.admin_users for all
  to authenticated
  using (
    current_user_is_super_admin()
    or check_user_permission('users.manage')
    or check_user_permission('users.manage.all')
    or (check_user_permission('users.manage.region') and admin_users.region = public.current_admin_region())
    or (check_user_permission('users.manage.branch') and admin_users.city = public.current_admin_city())
  )
  with check (
    current_user_is_super_admin()
    or check_user_permission('users.manage')
    or check_user_permission('users.manage.all')
    or (check_user_permission('users.manage.region') and admin_users.region = public.current_admin_region())
    or (check_user_permission('users.manage.branch') and admin_users.city = public.current_admin_city())
  );
