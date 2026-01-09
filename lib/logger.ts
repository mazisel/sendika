import { supabase } from '@/lib/supabase';
// import { Database } from '@/lib/database.types';

export type AuditAction =
    | 'LOGIN'
    | 'LOGOUT'
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'VIEW'
    | 'EXPORT'
    | 'IMPORT';

export type AuditEntity =
    | 'AUTH'
    | 'MEMBER'
    | 'SETTINGS'
    | 'SMS'
    | 'FINANCE'
    | 'USER'
    | 'SYSTEM';

interface LogOptions {
    action: AuditAction;
    entityType: AuditEntity;
    entityId?: string;
    details?: any;
    userId?: string;
}

export class Logger {
    /**
     * Logs an action to the audit_logs table.
     * Can be used from client or server components (if supabase client is provided or created).
     */
    static async log(options: LogOptions) {
        try {
            // Note: In a real server-side context where we can't easily access the current user
            // without passing cookies, we might rely on the database trigger or assume the caller passed the user ID.
            // Using the singleton client ensures we share the session state (LocalStorage) with lib/auth.ts
            // const supabase = createClientComponentClient();

            let userId = options.userId;

            // If userId is not provided, try to get it from the session
            if (!userId) {
                const { data: { session } } = await supabase.auth.getSession();
                userId = session?.user?.id;
            }

            if (!userId) {
                console.warn('Audit log attempted without authenticated user:', options);
                return;
            }

            // Call the API route for enhanced logging (IP, Geo, etc.)
            await fetch('/api/audit-log', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    action: options.action,
                    entityType: options.entityType,
                    entityId: options.entityId,
                    details: options.details
                }),
            });
        } catch (err) {
            console.error('Error in Audit Logger:', err);
        }
    }

    // Convenience methods
    static async logLogin(userId: string) {
        await this.log({
            action: 'LOGIN',
            entityType: 'AUTH',
            userId,
            details: { timestamp: new Date().toISOString() }
        });
    }

    static async logLogout(userId: string) {
        await this.log({
            action: 'LOGOUT',
            entityType: 'AUTH',
            userId
        });
    }

    static async logMemberView(memberId: string, memberName: string) {
        await this.log({
            action: 'VIEW',
            entityType: 'MEMBER',
            entityId: memberId,
            details: { memberName }
        });
    }
}
