-- SMS Automations Table - Stores automation settings
CREATE TABLE IF NOT EXISTS public.sms_automations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    automation_type TEXT NOT NULL UNIQUE, -- 'birthday', 'membership_anniversary', 'welcome', etc.
    is_enabled BOOLEAN DEFAULT false,
    template_id UUID REFERENCES public.sms_templates(id) ON DELETE SET NULL,
    days_before INTEGER DEFAULT 0, -- For advance notifications (e.g., 1 day before birthday)
    send_time TIME DEFAULT '09:00:00', -- Time of day to send
    custom_message TEXT, -- Optional custom message if no template
    last_run_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- SMS Automation Logs - Track which automations were sent
CREATE TABLE IF NOT EXISTS public.sms_automation_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    automation_id UUID NOT NULL REFERENCES public.sms_automations(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT DEFAULT 'sent', -- 'sent', 'failed'
    event_date DATE NOT NULL, -- The date of the event (birthday date, etc.)
    UNIQUE(automation_id, member_id, event_date) -- Prevent duplicate sends for same event
);

-- Enable RLS
ALTER TABLE public.sms_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_automation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sms_automations
DROP POLICY IF EXISTS "Admins can view sms automations" ON public.sms_automations;
CREATE POLICY "Admins can view sms automations" ON public.sms_automations
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage sms automations" ON public.sms_automations;
CREATE POLICY "Admins can manage sms automations" ON public.sms_automations
    FOR ALL USING (true);

-- RLS Policies for sms_automation_logs
DROP POLICY IF EXISTS "Admins can view sms automation logs" ON public.sms_automation_logs;
CREATE POLICY "Admins can view sms automation logs" ON public.sms_automation_logs
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage sms automation logs" ON public.sms_automation_logs;
CREATE POLICY "Admins can manage sms automation logs" ON public.sms_automation_logs
    FOR ALL USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sms_automation_logs_automation_id ON public.sms_automation_logs(automation_id);
CREATE INDEX IF NOT EXISTS idx_sms_automation_logs_member_id ON public.sms_automation_logs(member_id);
CREATE INDEX IF NOT EXISTS idx_sms_automation_logs_event_date ON public.sms_automation_logs(event_date);

-- Insert default automation types
INSERT INTO public.sms_automations (automation_type, is_enabled)
VALUES 
    ('birthday', false),
    ('membership_anniversary', false),
    ('welcome', false)
ON CONFLICT (automation_type) DO NOTHING;
