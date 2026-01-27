# RLS hardening plan (public schema)

Date: 2026-01-27
Source: Supabase MCP inspection of current schema, policies, and permission keys.

## 1) Goals
- Enforce least privilege across all public tables.
- Remove broad "ALL for authenticated" policies.
- Enable RLS on tables where it is currently disabled.
- Align access with existing permission keys in `public.permissions`.
- Keep public content readable without authentication (only where intended).

## 2) Current gaps (high level)
- RLS is **disabled** on: `announcements`, `branches`, `categories`, `finance_accounts`, `finance_categories`, `finance_transactions`, `general_definitions`, `member_due_payments`, `member_due_periods`, `member_dues`, `news`, `sms_otp_codes`.
- Many tables with RLS **enabled** still have permissive policies like `true` for `authenticated`, which effectively grants full access (e.g., `dm_*`, `calendar_*`, `payment_requests`, `financial_*`, `sms_*`, `member_documents`).
- Some policies are defined for role `public` with `qual = true`, which allows **anon** access to write.

## 3) Role model (recommended)
- `anon` (public): only read **public content** that is explicitly published/active.
- `authenticated`: used for admin/staff users stored in `public.admin_users`.
- `service_role`: backend only (bypass RLS when needed, but keep minimum grants).

### Helper functions (recommended)
Use existing helpers where possible: `current_user_is_super_admin()`, `check_user_permission(text)`.
Add small helpers to keep policies consistent:

```sql
create or replace function public.is_admin_user()
returns boolean
language sql
security definer
set search_path to public
as $$
  select exists (
    select 1 from admin_users au
    where au.id = auth.uid()
      and coalesce(au.is_active, true) = true
  );
$$;

create or replace function public.can_access_member(p_member_id uuid)
returns boolean
language sql
security definer
set search_path to public
as $$
  select exists (
    select 1
    from members m
    join admin_users au on au.id = auth.uid()
    where m.id = p_member_id
      and (
        check_user_permission('members.view.all')
        or (check_user_permission('members.view.region') and au.region = m.region)
        or (check_user_permission('members.view.branch') and au.city = m.city)
        or check_user_permission('members.manage.all')
        or (check_user_permission('members.manage.region') and au.region = m.region)
        or (check_user_permission('members.manage.branch') and au.city = m.city)
      )
  );
$$;
```

## 4) Policy matrix (recommended)
Below is the target access model. `manage` implies full CRUD; `view` is SELECT only.

### Content / public site
- `news`: public SELECT where `is_published = true`; manage requires `news.manage`.
- `announcements`: public SELECT where `is_active = true` and now() between dates; manage requires `announcements.manage`.
- `sliders`: public SELECT where `is_active = true`; manage requires `sliders.manage`.
- `management`: public SELECT where `is_active = true`; manage requires `management.manage`.
- `categories`: public SELECT where `is_active = true`; manage requires `categories.manage`.
- `site_settings`: public SELECT (read-only); manage requires `settings.manage`.
- `sticky_messages`: public SELECT; manage requires `sticky_message.manage`.

### Org structure
- `regions`, `region_city_assignments`, `branches`: public SELECT (if needed by site); manage requires `branches.manage` or `settings.manage`.

### Members
- `members`: SELECT requires `members.view.*` (scoped by region/city). INSERT/UPDATE/DELETE requires `members.manage.*`.
- `member_documents`: SELECT requires `members.view.*` and `can_access_member(member_id)`. INSERT/UPDATE/DELETE requires `members.manage.*`.

### Dues
- `member_due_periods`: SELECT requires `dues.view` or `dues.manage`; write requires `dues.manage`.
- `member_dues`: SELECT requires `dues.view/manage` **and** `can_access_member(member_id)`; write requires `dues.manage`.
- `member_due_payments`: SELECT requires `dues.view/manage` **and** `can_access_member( (select member_id via member_dues) )`; write requires `dues.manage`.

### Finance
- `finance_accounts`, `finance_categories`, `finance_transactions`, `financial_ledger`, `financial_transactions`, `accounting_accounts`, `bank_accounts`, `budgets`, `cost_centers`, `payment_requests`, `discounts`:
  - SELECT: `finance.view` or `finance.manage`.
  - INSERT/UPDATE/DELETE: `finance.manage`.
  - If transactions link to members (e.g., `finance_transactions.member_id`), also require `can_access_member(member_id)`.

### Documents module
- `dm_documents`, `dm_attachments`, `dm_document_templates`, `dm_document_defaults`, `dm_sequences`, `eyp_packages`, `eyp_organizations`:
  - SELECT: `documents.view` (or `documents.templates.view` for templates).
  - INSERT/UPDATE/DELETE: `documents.manage` (or `documents.templates.manage` for templates).
- `dm_decisions`: view/manage via `decisions.view` / `decisions.manage`.
- Remove broad policies like "Allow all authenticated on dm_*".

### Legal requests
- `legal_requests`:
  - Users can INSERT their own (`uid() = user_id`).
  - Users can SELECT/UPDATE their own.
  - Admins with `legal.view` can read; `legal.manage` can manage all.

### Tools
- `calendar_events`, `calendar_event_participants`: manage requires `calendar.manage`; read requires same.
- `sms_*` tables: manage/read requires `settings.manage` (or define a new `sms.manage` permission). Keep `sms_otp_codes` service-only where possible.
- `audit_logs`: INSERT allowed for authenticated; SELECT requires `logs.view`.

### System / admin
- `admin_users`: view/manage via `users.view.*` / `users.manage.*` with region/city scoping.
- `roles`, `role_permissions`, `permissions`: view for authenticated; manage for `definitions.manage` or `current_user_is_super_admin()`.
- `general_definitions`: view for authenticated; manage for `definitions.manage`.

## 5) RLS enablement (must-do)
Enable RLS for every table listed in Section 2. Then add restrictive policies before switching traffic.

```sql
alter table public.announcements enable row level security;
-- repeat for the other disabled tables...
```

## 6) Example policy templates

### Public content read
```sql
create policy "public_read_news"
  on public.news for select
  to public
  using (is_published = true);
```

### Permission-based manage
```sql
create policy "manage_news"
  on public.news for all
  to authenticated
  using (check_user_permission('news.manage'))
  with check (check_user_permission('news.manage'));
```

### Member-scoped read
```sql
create policy "read_member_dues"
  on public.member_dues for select
  to authenticated
  using (
    (check_user_permission('dues.view') or check_user_permission('dues.manage'))
    and can_access_member(member_id)
  );
```

### Finance write
```sql
create policy "manage_finance_transactions"
  on public.finance_transactions for all
  to authenticated
  using (check_user_permission('finance.manage'))
  with check (check_user_permission('finance.manage'));
```

## 7) Migration sequence (recommended)
1. Add helper functions (`is_admin_user`, `can_access_member`).
2. Enable RLS on the currently disabled tables.
3. Create new restrictive policies (do NOT drop old ones yet).
4. Verify app flows in staging.
5. Remove permissive policies (`true` / "all authenticated") that bypass restrictions.
6. Audit with `pg_policies` and Supabase advisor.

## 8) Open questions
- Is there a member-facing portal with Supabase Auth? If yes, we should add member-level RLS policies keyed by `auth.uid()` and a link table from auth user to `members.id`.
- Should public site content be readable without auth? If not, restrict to `authenticated`.
- Should finance data be visible to regional/branch managers only? If yes, add region/city scopes similar to members.

