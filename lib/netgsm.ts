import { supabase } from './supabase'

interface NetGSMConfig {
    usercode: string
    password: string
    header: string
}

interface SendSmsResponse {
    success: boolean
    jobId?: string
    error?: string
    code?: string
}

interface CreditResponse {
    success: boolean
    credit?: number
    error?: string
}

// NetGSM API Base URL
const NETGSM_API_URL = 'https://api.netgsm.com.tr'

/**
 * Get NetGSM credentials from site_settings
 */
export async function getNetGSMConfig(): Promise<NetGSMConfig | null> {
    const { data, error } = await supabase
        .from('site_settings')
        .select('netgsm_usercode, netgsm_password, netgsm_header')
        .single()

    if (error || !data) {
        console.error('NetGSM config fetch error:', error)
        return null
    }

    if (!data.netgsm_usercode || !data.netgsm_password || !data.netgsm_header) {
        return null
    }

    return {
        usercode: data.netgsm_usercode,
        password: data.netgsm_password,
        header: data.netgsm_header
    }
}

/**
 * Send SMS to a single phone number
 * @param scheduledDate Optional ISO date string for scheduled sending
 */
export async function sendSms(phone: string, message: string, scheduledDate?: string): Promise<SendSmsResponse> {
    const config = await getNetGSMConfig()

    if (!config) {
        return {
            success: false,
            error: 'NetGSM API bilgileri yapılandırılmamış'
        }
    }

    // Clean phone number (remove spaces, dashes, etc.)
    let cleanPhone = phone.replace(/\s|-|\(|\)/g, '')

    // Ensure phone starts with 0 (Turkish format)
    if (cleanPhone && !cleanPhone.startsWith('0') && !cleanPhone.startsWith('+')) {
        cleanPhone = '0' + cleanPhone
    }
    // Remove + prefix if present (convert +90 to 0)
    if (cleanPhone.startsWith('+90')) {
        cleanPhone = '0' + cleanPhone.slice(3)
    }

    try {
        // Build request params
        const params: Record<string, string> = {
            usercode: config.usercode,
            password: config.password,
            gsmno: cleanPhone,
            message: message,
            msgheader: config.header,
            dil: 'TR'
        }

        // Add scheduled date if provided (format: ddMMyyyyHHmm)
        if (scheduledDate) {
            const date = new Date(scheduledDate)
            const day = String(date.getDate()).padStart(2, '0')
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const year = date.getFullYear()
            const hours = String(date.getHours()).padStart(2, '0')
            const minutes = String(date.getMinutes()).padStart(2, '0')
            params.startdate = `${day}${month}${year}${hours}${minutes}`
        }

        const response = await fetch(`${NETGSM_API_URL}/sms/send/get`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(params)
        })

        const result = await response.text()

        // NetGSM returns codes like "00 12345678" for success
        // or error codes like "20" for missing parameter
        const [code, jobId] = result.trim().split(' ')

        if (code === '00' || code === '01' || code === '02') {
            return { success: true, jobId, code }
        } else {
            return {
                success: false,
                error: getNetGSMErrorMessage(code),
                code
            }
        }
    } catch (error) {
        console.error('SMS gönderme hatası:', error)
        return {
            success: false,
            error: 'SMS gönderilirken bir hata oluştu'
        }
    }
}

/**
 * Send SMS to multiple phone numbers (bulk)
 */
export async function sendBulkSms(phones: string[], message: string): Promise<{
    success: boolean
    results: Array<{ phone: string; success: boolean; error?: string }>
}> {
    const results = await Promise.all(
        phones.map(async (phone) => {
            const result = await sendSms(phone, message)
            return {
                phone,
                success: result.success,
                error: result.error
            }
        })
    )

    return {
        success: results.every(r => r.success),
        results
    }
}

/**
 * Test NetGSM connection by checking credit
 */
export async function testConnection(): Promise<CreditResponse> {
    const config = await getNetGSMConfig()

    if (!config) {
        return {
            success: false,
            error: 'NetGSM API bilgileri yapılandırılmamış'
        }
    }

    try {
        const response = await fetch(`${NETGSM_API_URL}/balance/list/get`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                usercode: config.usercode,
                password: config.password,
                tip: '1'
            })
        })

        const result = await response.text()

        // Check if response is a number (credit balance)
        const credit = parseFloat(result.trim())

        if (!isNaN(credit)) {
            return { success: true, credit }
        } else {
            return {
                success: false,
                error: getNetGSMErrorMessage(result.trim())
            }
        }
    } catch (error) {
        console.error('Bağlantı testi hatası:', error)
        return {
            success: false,
            error: 'Bağlantı testi sırasında bir hata oluştu'
        }
    }
}

/**
 * Log SMS to database
 */
export async function logSms(params: {
    templateId?: string
    memberId?: string
    phone: string
    message: string
    status: 'pending' | 'sent' | 'failed'
    jobId?: string
    errorMessage?: string
    sentBy?: string
}): Promise<boolean> {
    const { error } = await supabase
        .from('sms_logs')
        .insert({
            template_id: params.templateId,
            member_id: params.memberId,
            phone: params.phone,
            message: params.message,
            status: params.status,
            netgsm_job_id: params.jobId,
            error_message: params.errorMessage,
            sent_by: params.sentBy
        })

    if (error) {
        console.error('SMS log kayıt hatası:', error)
        return false
    }

    return true
}

/**
 * Get human-readable error message for NetGSM error codes
 */
function getNetGSMErrorMessage(code: string): string {
    const errorMessages: Record<string, string> = {
        '20': 'Mesaj metni boş',
        '30': 'Geçersiz kullanıcı adı veya şifre',
        '40': 'Mesaj başlığı tanımlı değil',
        '50': 'IYS kontrolü başarısız',
        '51': 'IYS kayıtlı numaralar arasında değil',
        '70': 'Hatalı parametre',
        '80': 'SMS gönderim limiti aşıldı',
        '85': 'Cüzdan yetersiz'
    }

    return errorMessages[code] || `Bilinmeyen hata (Kod: ${code})`
}

/**
 * SMS Template Service Functions
 */
export const SmsTemplateService = {
    async getAll() {
        const { data, error } = await supabase
            .from('sms_templates')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error
        return data
    },

    async getActive() {
        const { data, error } = await supabase
            .from('sms_templates')
            .select('*')
            .eq('is_active', true)
            .order('name')

        if (error) throw error
        return data
    },

    async create(template: { name: string; content: string; description?: string }) {
        const { data, error } = await supabase
            .from('sms_templates')
            .insert(template)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async update(id: string, template: { name?: string; content?: string; description?: string; is_active?: boolean }) {
        const { data, error } = await supabase
            .from('sms_templates')
            .update({ ...template, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async delete(id: string) {
        const { error } = await supabase
            .from('sms_templates')
            .delete()
            .eq('id', id)

        if (error) throw error
    }
}

/**
 * SMS Log Service Functions
 */
export const SmsLogService = {
    async getRecent(limit = 50) {
        const { data, error } = await supabase
            .from('sms_logs')
            .select(`
        *,
        member:members(full_name, phone),
        template:sms_templates(name)
      `)
            .order('sent_at', { ascending: false })
            .limit(limit)

        if (error) throw error
        return data
    },

    async getByMember(memberId: string) {
        const { data, error } = await supabase
            .from('sms_logs')
            .select('*')
            .eq('member_id', memberId)
            .order('sent_at', { ascending: false })

        if (error) throw error
        return data
    }
}

/**
 * SMS Group Service Functions
 */
export const SmsGroupService = {
    async getAll() {
        const { data, error } = await supabase
            .from('sms_groups')
            .select(`
                *,
                member_count:sms_group_members(count)
            `)
            .order('name')

        if (error) throw error
        return data
    },

    async create(group: { name: string; description?: string }) {
        const { data, error } = await supabase
            .from('sms_groups')
            .insert(group)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async update(id: string, group: { name?: string; description?: string; is_active?: boolean }) {
        const { data, error } = await supabase
            .from('sms_groups')
            .update({ ...group, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async delete(id: string) {
        const { error } = await supabase
            .from('sms_groups')
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    async getMembers(groupId: string) {
        const { data, error } = await supabase
            .from('sms_group_members')
            .select(`
                *,
                member:members(id, first_name, last_name, phone)
            `)
            .eq('group_id', groupId)

        if (error) throw error
        return data?.map(d => ({
            id: d.member.id,
            full_name: `${d.member.first_name} ${d.member.last_name}`,
            first_name: d.member.first_name,
            last_name: d.member.last_name,
            phone: d.member.phone || ''
        })) || []
    },

    async addMembers(groupId: string, memberIds: string[]) {
        const { error } = await supabase
            .from('sms_group_members')
            .insert(memberIds.map(memberId => ({
                group_id: groupId,
                member_id: memberId
            })))

        if (error) throw error
    },

    async removeMember(groupId: string, memberId: string) {
        const { error } = await supabase
            .from('sms_group_members')
            .delete()
            .eq('group_id', groupId)
            .eq('member_id', memberId)

        if (error) throw error
    }
}

/**
 * Member Filter Service - Query members by various criteria
 */
export const MemberFilterService = {
    async getFilterOptions() {
        // Get unique values for filter dropdowns
        const { data: members } = await supabase
            .from('members')
            .select('city, workplace, position, gender')

        if (!members) return { cities: [], workplaces: [], positions: [], genders: [] }

        const cities = Array.from(new Set(members.map(m => m.city).filter(Boolean))).sort()
        const workplaces = Array.from(new Set(members.map(m => m.workplace).filter(Boolean))).sort()
        const positions = Array.from(new Set(members.map(m => m.position).filter(Boolean))).sort()
        const genders = Array.from(new Set(members.map(m => m.gender).filter(Boolean))).sort()

        return { cities, workplaces, positions, genders }
    },

    async filterMembers(filters: {
        city?: string
        workplace?: string
        position?: string
        gender?: string
    }) {
        let query = supabase
            .from('members')
            .select('id, first_name, last_name, phone')
            .eq('is_active', true)

        if (filters.city) {
            query = query.eq('city', filters.city)
        }
        if (filters.workplace) {
            query = query.eq('workplace', filters.workplace)
        }
        if (filters.position) {
            query = query.eq('position', filters.position)
        }
        if (filters.gender) {
            query = query.eq('gender', filters.gender)
        }

        const { data, error } = await query

        if (error) throw error
        return data?.map(m => ({
            id: m.id,
            full_name: `${m.first_name} ${m.last_name}`,
            first_name: m.first_name,
            last_name: m.last_name,
            phone: m.phone || ''
        })) || []
    }
}

/**
 * SMS Automation Service Functions
 */
export const SmsAutomationService = {
    async getAll() {
        const { data, error } = await supabase
            .from('sms_automations')
            .select(`
                *,
                template:sms_templates(id, name, content)
            `)
            .order('automation_type')

        if (error) throw error
        return data
    },

    async update(id: string, settings: {
        is_enabled?: boolean
        template_id?: string | null
        days_before?: number
        send_time?: string
        custom_message?: string | null
    }) {
        const { data, error } = await supabase
            .from('sms_automations')
            .update({ ...settings, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async updateByType(automationType: string, settings: {
        is_enabled?: boolean
        template_id?: string | null
        days_before?: number
        send_time?: string
        custom_message?: string | null
    }) {
        const { data, error } = await supabase
            .from('sms_automations')
            .update({ ...settings, updated_at: new Date().toISOString() })
            .eq('automation_type', automationType)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async logSent(automationId: string, memberId: string, eventDate: string, status: 'sent' | 'failed') {
        const { error } = await supabase
            .from('sms_automation_logs')
            .insert({
                automation_id: automationId,
                member_id: memberId,
                event_date: eventDate,
                status
            })

        if (error && error.code !== '23505') { // Ignore unique violation (already sent)
            throw error
        }
    },

    async wasAlreadySent(automationId: string, memberId: string, eventDate: string): Promise<boolean> {
        const { data } = await supabase
            .from('sms_automation_logs')
            .select('id')
            .eq('automation_id', automationId)
            .eq('member_id', memberId)
            .eq('event_date', eventDate)
            .single()

        return !!data
    }
}
