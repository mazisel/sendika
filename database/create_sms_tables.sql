-- SMS Templates Table
CREATE TABLE IF NOT EXISTS public.sms_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- SMS Logs Table
CREATE TABLE IF NOT EXISTS public.sms_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID REFERENCES public.sms_templates(id) ON DELETE SET NULL,
    member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    phone TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, sent, failed
    netgsm_job_id TEXT,
    error_message TEXT,
    sent_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sms_templates
DROP POLICY IF EXISTS "Public can view active sms templates" ON public.sms_templates;
CREATE POLICY "Public can view active sms templates" ON public.sms_templates
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage sms templates" ON public.sms_templates;
CREATE POLICY "Admins can manage sms templates" ON public.sms_templates
    FOR ALL USING (true);

-- RLS Policies for sms_logs
DROP POLICY IF EXISTS "Admins can view sms logs" ON public.sms_logs;
CREATE POLICY "Admins can view sms logs" ON public.sms_logs
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert sms logs" ON public.sms_logs;
CREATE POLICY "Admins can insert sms logs" ON public.sms_logs
    FOR INSERT WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sms_logs_member_id ON public.sms_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_sent_at ON public.sms_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON public.sms_logs(status);
