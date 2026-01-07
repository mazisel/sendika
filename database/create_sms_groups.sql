-- SMS Groups Table for manual group creation
CREATE TABLE IF NOT EXISTS public.sms_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Group Members Junction Table
CREATE TABLE IF NOT EXISTS public.sms_group_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES public.sms_groups(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(group_id, member_id)
);

-- Enable RLS
ALTER TABLE public.sms_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_group_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sms_groups
DROP POLICY IF EXISTS "Admins can view sms groups" ON public.sms_groups;
CREATE POLICY "Admins can view sms groups" ON public.sms_groups
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage sms groups" ON public.sms_groups;
CREATE POLICY "Admins can manage sms groups" ON public.sms_groups
    FOR ALL USING (true);

-- RLS Policies for sms_group_members
DROP POLICY IF EXISTS "Admins can view sms group members" ON public.sms_group_members;
CREATE POLICY "Admins can view sms group members" ON public.sms_group_members
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage sms group members" ON public.sms_group_members;
CREATE POLICY "Admins can manage sms group members" ON public.sms_group_members
    FOR ALL USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sms_group_members_group_id ON public.sms_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_sms_group_members_member_id ON public.sms_group_members(member_id);
