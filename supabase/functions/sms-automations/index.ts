// Supabase Edge Function: SMS Automations
// Deploy with: supabase functions deploy sms-automations
// Schedule with pg_cron in Supabase Dashboard

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Member {
    id: string
    first_name: string
    last_name: string
    phone: string
    birth_date?: string
    membership_date?: string
}

interface Automation {
    id: string
    automation_type: string
    is_enabled: boolean
    template_id: string | null
    template?: { id: string; name: string; content: string } | null
}

interface NetGSMConfig {
    netgsm_usercode: string
    netgsm_password: string
    netgsm_header: string
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Create Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const results = {
            birthday: { checked: 0, sent: 0, failed: 0 },
            membership_anniversary: { checked: 0, sent: 0, failed: 0 },
            total_sent: 0,
            total_failed: 0
        }

        // Get NetGSM config
        const { data: settings } = await supabase
            .from('site_settings')
            .select('netgsm_usercode, netgsm_password, netgsm_header')
            .single()

        if (!settings?.netgsm_usercode || !settings?.netgsm_password || !settings?.netgsm_header) {
            return new Response(
                JSON.stringify({ error: 'NetGSM yapılandırması eksik' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            )
        }

        const netgsmConfig: NetGSMConfig = settings

        // Get enabled automations
        const { data: automations, error: automationError } = await supabase
            .from('sms_automations')
            .select(`
        *,
        template:sms_templates(id, name, content)
      `)
            .eq('is_enabled', true)

        if (automationError) throw automationError
        if (!automations || automations.length === 0) {
            return new Response(
                JSON.stringify({ message: 'Aktif otomasyon yok', results }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const today = new Date()
        const todayStr = today.toISOString().split('T')[0]
        const month = today.getMonth() + 1
        const day = today.getDate()

        for (const automation of automations as Automation[]) {
            if (!automation.template?.content) continue

            if (automation.automation_type === 'birthday') {
                // Get members with birthday today
                const { data: members } = await supabase
                    .from('members')
                    .select('id, first_name, last_name, phone, birth_date')
                    .not('birth_date', 'is', null)
                    .not('phone', 'is', null)

                if (members) {
                    const birthdayMembers = members.filter((m: Member) => {
                        if (!m.birth_date) return false
                        const bd = new Date(m.birth_date)
                        return bd.getMonth() + 1 === month && bd.getDate() === day
                    })

                    results.birthday.checked = birthdayMembers.length

                    for (const member of birthdayMembers) {
                        const sendResult = await processAutomationSend(
                            supabase, netgsmConfig, automation, member, todayStr
                        )
                        if (sendResult === 'sent') results.birthday.sent++
                        else if (sendResult === 'failed') results.birthday.failed++
                    }
                }
            }

            if (automation.automation_type === 'membership_anniversary') {
                const { data: members } = await supabase
                    .from('members')
                    .select('id, first_name, last_name, phone, membership_date')
                    .not('membership_date', 'is', null)
                    .not('phone', 'is', null)

                if (members) {
                    const anniversaryMembers = members.filter((m: Member) => {
                        if (!m.membership_date) return false
                        const md = new Date(m.membership_date)
                        const isSameMonthDay = md.getMonth() + 1 === month && md.getDate() === day
                        const isNotFirstYear = md.getFullYear() < today.getFullYear()
                        return isSameMonthDay && isNotFirstYear
                    })

                    results.membership_anniversary.checked = anniversaryMembers.length

                    for (const member of anniversaryMembers) {
                        const sendResult = await processAutomationSend(
                            supabase, netgsmConfig, automation, member, todayStr
                        )
                        if (sendResult === 'sent') results.membership_anniversary.sent++
                        else if (sendResult === 'failed') results.membership_anniversary.failed++
                    }
                }
            }
        }

        results.total_sent = results.birthday.sent + results.membership_anniversary.sent
        results.total_failed = results.birthday.failed + results.membership_anniversary.failed

        return new Response(
            JSON.stringify({
                success: true,
                message: `İşlendi: ${results.total_sent} gönderildi, ${results.total_failed} başarısız`,
                results
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Edge function error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})

async function processAutomationSend(
    supabase: any,
    netgsmConfig: NetGSMConfig,
    automation: Automation,
    member: Member,
    todayStr: string
): Promise<'sent' | 'failed' | 'skipped'> {
    // Check if already sent today
    const { data: existing } = await supabase
        .from('sms_automation_logs')
        .select('id')
        .eq('automation_id', automation.id)
        .eq('member_id', member.id)
        .eq('event_date', todayStr)
        .single()

    if (existing) return 'skipped'

    // Replace placeholders
    const message = automation.template!.content
        .replace(/{AD}/g, member.first_name || '')
        .replace(/{SOYAD}/g, member.last_name || '')
        .replace(/{AD_SOYAD}/g, `${member.first_name} ${member.last_name}`)
        .replace(/{TELEFON}/g, member.phone || '')

    // Clean phone number
    let cleanPhone = member.phone.replace(/\s|-|\(|\)/g, '')
    if (!cleanPhone.startsWith('0') && !cleanPhone.startsWith('+')) {
        cleanPhone = '0' + cleanPhone
    }
    if (cleanPhone.startsWith('+90')) {
        cleanPhone = '0' + cleanPhone.slice(3)
    }

    // Send SMS via NetGSM
    try {
        const response = await fetch('https://api.netgsm.com.tr/sms/send/get', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                usercode: netgsmConfig.netgsm_usercode,
                password: netgsmConfig.netgsm_password,
                gsmno: cleanPhone,
                message: message,
                msgheader: netgsmConfig.netgsm_header,
                dil: 'TR'
            })
        })

        const result = await response.text()
        const [code, jobId] = result.trim().split(' ')
        const success = code === '00' || code === '01' || code === '02'

        // Log to automation logs
        await supabase.from('sms_automation_logs').insert({
            automation_id: automation.id,
            member_id: member.id,
            event_date: todayStr,
            status: success ? 'sent' : 'failed'
        })

        // Log to sms_logs
        await supabase.from('sms_logs').insert({
            phone_number: cleanPhone,
            message: message,
            status: success ? 'sent' : 'failed',
            response_code: code,
            job_id: jobId || null
        })

        return success ? 'sent' : 'failed'
    } catch (error) {
        console.error('SMS send error:', error)
        return 'failed'
    }
}
