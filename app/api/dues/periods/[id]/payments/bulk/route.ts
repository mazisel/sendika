import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({ message: 'Bulk payment endpoint is working' });
}

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = createRouteHandlerClient<Database>({ cookies });
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Check permissions
        const { data: adminUser } = await supabase
            .from('admin_users')
            .select('role, permissions')
            .eq('id', session.user.id)
            .single();

        if (!adminUser) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        const body = await request.json();
        const { payments } = body; // Array of { memberId, amount }

        if (!Array.isArray(payments) || payments.length === 0) {
            return new NextResponse('Invalid payment data', { status: 400 });
        }

        const periodId = params.id;
        const paymentDate = new Date().toISOString();
        const results = [];
        const errors = [];

        // Process each payment
        // Note: In a real world scenario, this might be better as a stored procedure or recursive CTE for performance,
        // but for now we'll process sequentially or in parallel promises.

        for (const payment of payments) {
            const { memberId, amount, paymentMethod = 'cash' } = payment;
            if (!memberId || !amount || amount <= 0) continue;

            try {
                // 1. Find or Create Member Due Record for this period
                let memberDueId = '';

                const { data: existingDue } = await supabase
                    .from('member_dues')
                    .select('*')
                    .eq('member_id', memberId)
                    .eq('period_id', periodId)
                    .single();

                if (existingDue) {
                    memberDueId = existingDue.id;
                } else {
                    // Get period details to know amount_due
                    const { data: period } = await supabase
                        .from('member_due_periods')
                        .select('due_amount, due_date')
                        .eq('id', periodId)
                        .single();

                    if (!period) throw new Error('Period not found');

                    const { data: newDue, error: createError } = await supabase
                        .from('member_dues')
                        .insert({
                            member_id: memberId,
                            period_id: periodId,
                            amount_due: period.due_amount,
                            paid_amount: 0,
                            due_date: period.due_date,
                            status: 'unpaid'
                        })
                        .select()
                        .single();

                    if (createError) throw createError;
                    memberDueId = newDue.id;
                }

                // 2. Add Payment Record
                const { error: paymentError } = await supabase
                    .from('member_due_payments')
                    .insert({
                        member_due_id: memberDueId,
                        amount: amount,
                        payment_date: paymentDate,
                        payment_method: paymentMethod,
                        recorded_by: session.user.id,
                        notes: 'Toplu Tahsilat Ekranı'
                    });

                if (paymentError) throw paymentError;

                // 3. Update Member Due Status and Totals
                // Trigger might handle this, but let's be safe and update/recalc
                // We need to fetch the current total paid
                const { data: allPayments } = await supabase
                    .from('member_due_payments')
                    .select('amount')
                    .eq('member_due_id', memberDueId);

                const totalPaid = allPayments?.reduce((sum, p) => sum + p.amount, 0) || 0;

                const { data: currentDue } = await supabase
                    .from('member_dues')
                    .select('amount_due')
                    .eq('id', memberDueId)
                    .single();

                const amountDue = currentDue?.amount_due || 0;
                const newStatus = totalPaid >= amountDue ? 'paid' : (totalPaid > 0 ? 'partial' : 'unpaid');

                await supabase
                    .from('member_dues')
                    .update({
                        paid_amount: totalPaid,
                        status: newStatus,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', memberDueId);

                results.push({ memberId, success: true });

            } catch (err: any) {
                console.error(`Payment error for member ${memberId}:`, err);
                errors.push({ memberId, error: err.message });
            }
        }

        return NextResponse.json({
            success: true,
            processed: results.length,
            failed: errors.length,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (err: any) {
        console.error('Bulk payment error:', err);
        return new NextResponse('Internal Server Error: ' + err.message, { status: 500 });
    }
}
