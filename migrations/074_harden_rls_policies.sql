-- RLS hardening migration
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

-- Helper functions
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

-- Enable RLS on previously disabled tables
alter table public.announcements enable row level security;
alter table public.branches enable row level security;
alter table public.categories enable row level security;
alter table public.finance_accounts enable row level security;
alter table public.finance_categories enable row level security;
alter table public.finance_transactions enable row level security;
alter table public.general_definitions enable row level security;
alter table public.member_due_payments enable row level security;
alter table public.member_due_periods enable row level security;
alter table public.member_dues enable row level security;
alter table public.news enable row level security;
alter table public.sms_otp_codes enable row level security;

-- Views: enforce invoker security so underlying RLS applies
alter view if exists public.finance_account_summary set (security_invoker = true);
alter view if exists public.member_due_period_summary set (security_invoker = true);

revoke all on public.finance_account_summary from public;
revoke all on public.member_due_period_summary from public;
grant select on public.finance_account_summary to authenticated;
grant select on public.member_due_period_summary to authenticated;

-- Drop existing policies for public tables (safe reset)
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'accounting_accounts','admin_users','announcements','audit_logs','bank_accounts','branches',
        'budgets','calendar_event_participants','calendar_events','categories','cost_centers','discounts',
        'dm_attachments','dm_authorized_signers','dm_decisions','dm_document_defaults','dm_document_templates',
        'dm_documents','dm_sequences','eyp_organizations','eyp_packages','finance_accounts','finance_categories',
        'finance_transactions','financial_ledger','financial_transactions','general_definitions','legal_requests',
        'management','member_documents','member_due_payments','member_due_periods','member_dues','members','news',
        'payment_requests','permissions','region_city_assignments','regions','role_permissions','roles','site_settings',
        'sliders','sms_automation_logs','sms_automations','sms_group_members','sms_groups','sms_logs','sms_otp_codes',
        'sms_templates','sticky_messages'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- Public content policies
create policy "public_read_news"
  on public.news for select
  to public
  using (is_published = true);

create policy "manage_news"
  on public.news for all
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('news.manage'))
  with check (current_user_is_super_admin() or check_user_permission('news.manage'));

create policy "public_read_announcements"
  on public.announcements for select
  to public
  using (
    is_active = true
    and (start_date is null or now() >= start_date)
    and (end_date is null or now() <= end_date)
  );

create policy "manage_announcements"
  on public.announcements for all
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('announcements.manage'))
  with check (current_user_is_super_admin() or check_user_permission('announcements.manage'));

create policy "public_read_sliders"
  on public.sliders for select
  to public
  using (is_active = true);

create policy "manage_sliders"
  on public.sliders for all
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('sliders.manage'))
  with check (current_user_is_super_admin() or check_user_permission('sliders.manage'));

create policy "public_read_management"
  on public.management for select
  to public
  using (is_active = true);

create policy "manage_management"
  on public.management for all
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('management.manage'))
  with check (current_user_is_super_admin() or check_user_permission('management.manage'));

create policy "public_read_categories"
  on public.categories for select
  to public
  using (is_active = true);

create policy "manage_categories"
  on public.categories for all
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('categories.manage'))
  with check (current_user_is_super_admin() or check_user_permission('categories.manage'));

create policy "public_read_site_settings"
  on public.site_settings for select
  to public
  using (true);

create policy "manage_site_settings"
  on public.site_settings for all
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('settings.manage'))
  with check (current_user_is_super_admin() or check_user_permission('settings.manage'));

create policy "public_read_sticky_messages"
  on public.sticky_messages for select
  to public
  using (true);

create policy "manage_sticky_messages"
  on public.sticky_messages for all
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('sticky_message.manage'))
  with check (current_user_is_super_admin() or check_user_permission('sticky_message.manage'));

-- Structure
create policy "public_read_regions"
  on public.regions for select
  to public
  using (true);

create policy "manage_regions"
  on public.regions for all
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('branches.manage') or check_user_permission('settings.manage'))
  with check (current_user_is_super_admin() or check_user_permission('branches.manage') or check_user_permission('settings.manage'));

create policy "public_read_region_city_assignments"
  on public.region_city_assignments for select
  to public
  using (true);

create policy "manage_region_city_assignments"
  on public.region_city_assignments for all
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('branches.manage') or check_user_permission('settings.manage'))
  with check (current_user_is_super_admin() or check_user_permission('branches.manage') or check_user_permission('settings.manage'));

create policy "public_read_branches"
  on public.branches for select
  to public
  using (true);

create policy "manage_branches"
  on public.branches for all
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('branches.manage') or check_user_permission('settings.manage'))
  with check (current_user_is_super_admin() or check_user_permission('branches.manage') or check_user_permission('settings.manage'));

-- Members
create policy "read_members"
  on public.members for select
  to authenticated
  using (can_view_member(id));

create policy "manage_members"
  on public.members for all
  to authenticated
  using (
    current_user_is_super_admin()
    or check_user_permission('members.manage')
    or check_user_permission('members.manage.all')
    or (check_user_permission('members.manage.region') and exists (
      select 1 from admin_users au
      where (au.id = auth.uid() or (auth.jwt() ->> 'email') is not null and lower(au.email) = lower(auth.jwt() ->> 'email'))
        and au.region = members.region
    ))
    or (check_user_permission('members.manage.branch') and exists (
      select 1 from admin_users au
      where (au.id = auth.uid() or (auth.jwt() ->> 'email') is not null and lower(au.email) = lower(auth.jwt() ->> 'email'))
        and au.city = members.city
    ))
  )
  with check (
    current_user_is_super_admin()
    or check_user_permission('members.manage')
    or check_user_permission('members.manage.all')
    or (check_user_permission('members.manage.region') and exists (
      select 1 from admin_users au
      where (au.id = auth.uid() or (auth.jwt() ->> 'email') is not null and lower(au.email) = lower(auth.jwt() ->> 'email'))
        and au.region = members.region
    ))
    or (check_user_permission('members.manage.branch') and exists (
      select 1 from admin_users au
      where (au.id = auth.uid() or (auth.jwt() ->> 'email') is not null and lower(au.email) = lower(auth.jwt() ->> 'email'))
        and au.city = members.city
    ))
  );

create policy "read_member_documents"
  on public.member_documents for select
  to authenticated
  using (can_view_member(member_id));

create policy "manage_member_documents"
  on public.member_documents for all
  to authenticated
  using (can_manage_member(member_id))
  with check (can_manage_member(member_id));

-- Dues
create policy "read_member_due_periods"
  on public.member_due_periods for select
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('dues.view') or check_user_permission('dues.manage'));

create policy "manage_member_due_periods"
  on public.member_due_periods for all
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('dues.manage'))
  with check (current_user_is_super_admin() or check_user_permission('dues.manage'));

create policy "read_member_dues"
  on public.member_dues for select
  to authenticated
  using (
    (current_user_is_super_admin() or check_user_permission('dues.view') or check_user_permission('dues.manage'))
    and can_view_member(member_id)
  );

create policy "manage_member_dues"
  on public.member_dues for all
  to authenticated
  using (
    (current_user_is_super_admin() or check_user_permission('dues.manage'))
    and can_manage_member(member_id)
  )
  with check (
    (current_user_is_super_admin() or check_user_permission('dues.manage'))
    and can_manage_member(member_id)
  );

create policy "read_member_due_payments"
  on public.member_due_payments for select
  to authenticated
  using (
    (current_user_is_super_admin() or check_user_permission('dues.view') or check_user_permission('dues.manage'))
    and can_access_member_due(member_due_id)
  );

create policy "manage_member_due_payments"
  on public.member_due_payments for all
  to authenticated
  using (
    (current_user_is_super_admin() or check_user_permission('dues.manage'))
    and can_access_member_due(member_due_id)
  )
  with check (
    (current_user_is_super_admin() or check_user_permission('dues.manage'))
    and can_access_member_due(member_due_id)
  );

-- Finance
create policy "read_finance_accounts"
  on public.finance_accounts for select
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('finance.view') or check_user_permission('finance.manage'));

create policy "manage_finance_accounts"
  on public.finance_accounts for all
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('finance.manage'))
  with check (current_user_is_super_admin() or check_user_permission('finance.manage'));

create policy "read_finance_categories"
  on public.finance_categories for select
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('finance.view') or check_user_permission('finance.manage'));

create policy "manage_finance_categories"
  on public.finance_categories for all
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('finance.manage'))
  with check (current_user_is_super_admin() or check_user_permission('finance.manage'));

create policy "read_finance_transactions"
  on public.finance_transactions for select
  to authenticated
  using (
    (current_user_is_super_admin() or check_user_permission('finance.view') or check_user_permission('finance.manage'))
    and (member_id is null or can_view_member(member_id))
    and (member_due_id is null or can_access_member_due(member_due_id))
  );

create policy "manage_finance_transactions"
  on public.finance_transactions for all
  to authenticated
  using (
    (current_user_is_super_admin() or check_user_permission('finance.manage'))
    and (member_id is null or can_manage_member(member_id))
    and (member_due_id is null or can_access_member_due(member_due_id))
  )
  with check (
    (current_user_is_super_admin() or check_user_permission('finance.manage'))
    and (member_id is null or can_manage_member(member_id))
    and (member_due_id is null or can_access_member_due(member_due_id))
  );

create policy "read_accounting_accounts"
  on public.accounting_accounts for select
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('finance.view') or check_user_permission('finance.manage'));

create policy "manage_accounting_accounts"
  on public.accounting_accounts for all
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('finance.manage'))
  with check (current_user_is_super_admin() or check_user_permission('finance.manage'));

create policy "read_bank_accounts"
  on public.bank_accounts for select
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('finance.view') or check_user_permission('finance.manage'));

create policy "manage_bank_accounts"
  on public.bank_accounts for all
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('finance.manage'))
  with check (current_user_is_super_admin() or check_user_permission('finance.manage'));

create policy "read_budgets"
  on public.budgets for select
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('finance.view') or check_user_permission('finance.manage'));

create policy "manage_budgets"
  on public.budgets for all
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('finance.manage'))
  with check (current_user_is_super_admin() or check_user_permission('finance.manage'));

create policy "read_cost_centers"
  on public.cost_centers for select
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('finance.view') or check_user_permission('finance.manage'));

create policy "manage_cost_centers"
  on public.cost_centers for all
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('finance.manage'))
  with check (current_user_is_super_admin() or check_user_permission('finance.manage'));

create policy "read_financial_ledger"
  on public.financial_ledger for select
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('finance.view') or check_user_permission('finance.manage'));

create policy "manage_financial_ledger"
  on public.financial_ledger for all
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('finance.manage'))
  with check (current_user_is_super_admin() or check_user_permission('finance.manage'));

create policy "read_financial_transactions"
  on public.financial_transactions for select
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('finance.view') or check_user_permission('finance.manage'));

create policy "manage_financial_transactions"
  on public.financial_transactions for all
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('finance.manage'))
  with check (current_user_is_super_admin() or check_user_permission('finance.manage'));

create policy "read_payment_requests"
  on public.payment_requests for select
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('finance.view') or check_user_permission('finance.manage'));

create policy "manage_payment_requests"
  on public.payment_requests for all
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('finance.manage'))
  with check (current_user_is_super_admin() or check_user_permission('finance.manage'));

create policy "public_read_discounts"
  on public.discounts for select
  to public
  using (is_active = true);

create policy "manage_discounts"
  on public.discounts for all
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('finance.manage'))
  with check (current_user_is_super_admin() or check_user_permission('finance.manage'));

-- Document management
create policy "read_dm_documents"
  on public.dm_documents for select
  to authenticated
  using (check_user_permission('documents.view') or check_user_permission('documents.manage') or current_user_is_super_admin());

create policy "insert_dm_documents"
  on public.dm_documents for insert
  to authenticated
  with check (check_user_permission('documents.create') or check_user_permission('documents.manage') or current_user_is_super_admin());

create policy "update_dm_documents"
  on public.dm_documents for update
  to authenticated
  using (check_user_permission('documents.manage') or current_user_is_super_admin())
  with check (check_user_permission('documents.manage') or current_user_is_super_admin());

create policy "delete_dm_documents"
  on public.dm_documents for delete
  to authenticated
  using (check_user_permission('documents.manage') or current_user_is_super_admin());

create policy "read_dm_attachments"
  on public.dm_attachments for select
  to authenticated
  using (check_user_permission('documents.view') or check_user_permission('documents.manage') or current_user_is_super_admin());

create policy "insert_dm_attachments"
  on public.dm_attachments for insert
  to authenticated
  with check (check_user_permission('documents.create') or check_user_permission('documents.manage') or current_user_is_super_admin());

create policy "update_dm_attachments"
  on public.dm_attachments for update
  to authenticated
  using (check_user_permission('documents.manage') or current_user_is_super_admin())
  with check (check_user_permission('documents.manage') or current_user_is_super_admin());

create policy "delete_dm_attachments"
  on public.dm_attachments for delete
  to authenticated
  using (check_user_permission('documents.manage') or current_user_is_super_admin());

create policy "read_dm_document_templates"
  on public.dm_document_templates for select
  to authenticated
  using (check_user_permission('documents.templates.view') or check_user_permission('documents.templates.manage') or current_user_is_super_admin());

create policy "manage_dm_document_templates"
  on public.dm_document_templates for all
  to authenticated
  using (check_user_permission('documents.templates.manage') or current_user_is_super_admin())
  with check (check_user_permission('documents.templates.manage') or current_user_is_super_admin());

create policy "read_dm_document_defaults"
  on public.dm_document_defaults for select
  to authenticated
  using (is_admin_user());

create policy "manage_dm_document_defaults"
  on public.dm_document_defaults for all
  to authenticated
  using (check_user_permission('settings.manage') or current_user_is_super_admin())
  with check (check_user_permission('settings.manage') or current_user_is_super_admin());

create policy "manage_dm_sequences"
  on public.dm_sequences for all
  to authenticated
  using (check_user_permission('documents.manage') or check_user_permission('documents.create') or current_user_is_super_admin())
  with check (check_user_permission('documents.manage') or check_user_permission('documents.create') or current_user_is_super_admin());

create policy "read_dm_decisions"
  on public.dm_decisions for select
  to authenticated
  using (check_user_permission('decisions.view') or check_user_permission('decisions.manage') or current_user_is_super_admin());

create policy "manage_dm_decisions"
  on public.dm_decisions for all
  to authenticated
  using (check_user_permission('decisions.manage') or current_user_is_super_admin())
  with check (check_user_permission('decisions.manage') or current_user_is_super_admin());

create policy "read_dm_authorized_signers"
  on public.dm_authorized_signers for select
  to authenticated
  using (is_admin_user());

create policy "manage_dm_authorized_signers"
  on public.dm_authorized_signers for all
  to authenticated
  using (check_user_permission('settings.manage') or current_user_is_super_admin())
  with check (check_user_permission('settings.manage') or current_user_is_super_admin());

create policy "read_eyp_organizations"
  on public.eyp_organizations for select
  to authenticated
  using (check_user_permission('documents.view') or check_user_permission('documents.manage') or current_user_is_super_admin());

create policy "manage_eyp_organizations"
  on public.eyp_organizations for all
  to authenticated
  using (check_user_permission('documents.manage') or current_user_is_super_admin())
  with check (check_user_permission('documents.manage') or current_user_is_super_admin());

create policy "read_eyp_packages"
  on public.eyp_packages for select
  to authenticated
  using (check_user_permission('documents.view') or check_user_permission('documents.manage') or current_user_is_super_admin());

create policy "manage_eyp_packages"
  on public.eyp_packages for all
  to authenticated
  using (check_user_permission('documents.manage') or current_user_is_super_admin())
  with check (check_user_permission('documents.manage') or current_user_is_super_admin());

-- Legal requests
create policy "read_legal_requests"
  on public.legal_requests for select
  to authenticated
  using (
    current_user_is_super_admin()
    or check_user_permission('legal.view')
    or check_user_permission('legal.manage')
    or (auth.uid() = user_id)
  );

create policy "insert_legal_requests"
  on public.legal_requests for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "update_legal_requests"
  on public.legal_requests for update
  to authenticated
  using (auth.uid() = user_id or check_user_permission('legal.manage') or current_user_is_super_admin())
  with check (auth.uid() = user_id or check_user_permission('legal.manage') or current_user_is_super_admin());

create policy "delete_legal_requests"
  on public.legal_requests for delete
  to authenticated
  using (check_user_permission('legal.manage') or current_user_is_super_admin());

-- Calendar
create policy "manage_calendar_events"
  on public.calendar_events for all
  to authenticated
  using (check_user_permission('calendar.manage') or current_user_is_super_admin())
  with check (check_user_permission('calendar.manage') or current_user_is_super_admin());

create policy "manage_calendar_event_participants"
  on public.calendar_event_participants for all
  to authenticated
  using (check_user_permission('calendar.manage') or current_user_is_super_admin())
  with check (check_user_permission('calendar.manage') or current_user_is_super_admin());

-- SMS
create policy "manage_sms_automations"
  on public.sms_automations for all
  to authenticated
  using (check_user_permission('settings.manage') or current_user_is_super_admin())
  with check (check_user_permission('settings.manage') or current_user_is_super_admin());

create policy "manage_sms_automation_logs"
  on public.sms_automation_logs for all
  to authenticated
  using (check_user_permission('settings.manage') or current_user_is_super_admin())
  with check (check_user_permission('settings.manage') or current_user_is_super_admin());

create policy "manage_sms_groups"
  on public.sms_groups for all
  to authenticated
  using (check_user_permission('settings.manage') or current_user_is_super_admin())
  with check (check_user_permission('settings.manage') or current_user_is_super_admin());

create policy "manage_sms_group_members"
  on public.sms_group_members for all
  to authenticated
  using (check_user_permission('settings.manage') or current_user_is_super_admin())
  with check (check_user_permission('settings.manage') or current_user_is_super_admin());

create policy "manage_sms_logs"
  on public.sms_logs for all
  to authenticated
  using (check_user_permission('settings.manage') or current_user_is_super_admin())
  with check (check_user_permission('settings.manage') or current_user_is_super_admin());

create policy "manage_sms_templates"
  on public.sms_templates for all
  to authenticated
  using (check_user_permission('settings.manage') or current_user_is_super_admin())
  with check (check_user_permission('settings.manage') or current_user_is_super_admin());

create policy "service_role_sms_otp_codes"
  on public.sms_otp_codes for all
  to service_role
  using (true)
  with check (true);

-- Audit logs
create policy "insert_audit_logs"
  on public.audit_logs for insert
  to authenticated
  with check (true);

create policy "read_audit_logs"
  on public.audit_logs for select
  to authenticated
  using (check_user_permission('logs.view') or current_user_is_super_admin());

-- Admin / RBAC
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

create policy "read_permissions"
  on public.permissions for select
  to authenticated
  using (true);

create policy "read_roles"
  on public.roles for select
  to authenticated
  using (true);

create policy "read_role_permissions"
  on public.role_permissions for select
  to authenticated
  using (true);

create policy "manage_permissions"
  on public.permissions for all
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('definitions.manage'))
  with check (current_user_is_super_admin() or check_user_permission('definitions.manage'));

create policy "manage_roles"
  on public.roles for all
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('definitions.manage'))
  with check (current_user_is_super_admin() or check_user_permission('definitions.manage'));

create policy "manage_role_permissions"
  on public.role_permissions for all
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('definitions.manage'))
  with check (current_user_is_super_admin() or check_user_permission('definitions.manage'));

create policy "read_general_definitions"
  on public.general_definitions for select
  to authenticated
  using (is_admin_user());

create policy "manage_general_definitions"
  on public.general_definitions for all
  to authenticated
  using (current_user_is_super_admin() or check_user_permission('definitions.manage'))
  with check (current_user_is_super_admin() or check_user_permission('definitions.manage'));
