import { supabase } from '@/lib/supabase';
import { sendBulkSms } from '@/lib/netgsm';

interface NotificationChannels {
    push: boolean;
    sms: boolean;
    email: boolean;
}

export const NotificationService = {
    async sendContentNotification(
        type: 'announcement' | 'header' | 'discount',
        id: string,
        channels: NotificationChannels,
        data: { title: string; message?: string }
    ) {
        if (!channels.push && !channels.sms && !channels.email) return;

        console.log(`[NotificationService] Sending notifications for ${type} (${id})`);

        // 1. Fetch active members (needed for all channels basically)
        // Optimization: In a real large-scale app, we should do this in a background job queue
        const { data: members, error } = await supabase
            .from('members')
            .select('id, phone, email, push_token') // Assuming push_token exists or will exist
            .eq('is_active', true);

        if (error || !members) {
            console.error('Error fetching members for notification:', error);
            return;
        }

        const uniqueMembers = members.filter((m, index, self) =>
            index === self.findIndex((t) => (
                t.id === m.id
            ))
        );

        console.log(`[NotificationService] Found ${uniqueMembers.length} active members.`);

        // 2. Mock Push Notification execution
        if (channels.push) {
            console.log('[NotificationService] Processing Push Notifications...');
            // Logic to send push would go here
            // e.g. await sendFirebasePush(tokens, data.title, data.message);
        }

        // 3. SMS Notification
        if (channels.sms) {
            console.log('[NotificationService] Processing SMS Notifications...');
            const phones = uniqueMembers
                .map(m => m.phone)
                .filter(p => p && p.length >= 10);

            if (phones.length > 0) {
                // Construct a short message. SMS is expensive/limited char count.
                const smsMessage = `${data.title} - ${data.message ? data.message.substring(0, 50) + '...' : 'Yeni içerik eklendi.'}`;

                try {
                    // Send in chunks or use bulk API
                    await sendBulkSms(phones, smsMessage);
                    console.log('[NotificationService] SMS dispatch initiated.');
                } catch (e) {
                    console.error('[NotificationService] SMS send failed:', e);
                }
            }
        }

        // 4. Email Notification
        if (channels.email) {
            console.log('[NotificationService] Processing Email Notifications...');
            const emails = uniqueMembers
                .map(m => m.email)
                .filter(e => e && e.includes('@'));

            console.log(`[NotificationService] Found ${emails.length} valid email recipients.`);

            if (emails.length > 0) {
                // Process in chunks of 50 asynchronously
                const chunkSize = 50;
                // Note: We are launching this process without awaiting the entire loop to finish 
                // to avoid blocking the UI response for too long, but we await the first chunk 
                // to catch immediate errors.

                const processEmails = async () => {
                    for (let i = 0; i < emails.length; i += chunkSize) {
                        const chunk = emails.slice(i, i + chunkSize);

                        // Create an array of fetch promises
                        const promises = chunk.map(email =>
                            fetch('/api/email/send', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    type: 'general',
                                    to: email,
                                    subject: data.title,
                                    title: data.title,
                                    message: data.message || 'Yeni içerik eklendi.'
                                })
                            }).catch(err => console.error(`Failed to send email to ${email}`, err))
                        );

                        // Wait for the current chunk to finish
                        await Promise.all(promises);

                        // Small delay to be gentle
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                    console.log('[NotificationService] All emails processed.');
                };

                // Start processing and log
                processEmails().catch(err => console.error('Email dispatch process failed:', err));
                console.log('[NotificationService] Email dispatch initiated in background.');
            }
        }
    }
};
