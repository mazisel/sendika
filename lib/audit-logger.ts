
import { AdminAuth } from '@/lib/auth';

export type AuditAction = 'LOGIN' | 'LOGOUT' | 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW';
export type AuditEntity = 'AUTH' | 'MEMBER' | 'SETTINGS' | 'USER' | 'ANNOUNCEMENT' | 'UNKNOWN';

interface AuditLogParams {
    action: AuditAction;
    entityType: AuditEntity;
    entityId?: string;
    details?: Record<string, any>;
}

export const logAuditAction = async ({
    action,
    entityType,
    entityId,
    details
}: AuditLogParams) => {
    try {
        const user = AdminAuth.getCurrentUser();
        if (!user) {
            console.warn('Audit log attempt without logged in user');
            return;
        }

        // Call the API route which handles IP resolution and DB insertion
        const response = await fetch('/api/audit-log', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: user.id,
                action,
                entityType,
                entityId,
                details: {
                    ...details,
                    user_email: user.email,
                    user_name: user.full_name
                }
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to create audit log:', errorData);
        }

    } catch (error) {
        console.error('Error logging audit action:', error);
    }
};
