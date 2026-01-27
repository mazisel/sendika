export type DuePeriodStatus = 'draft' | 'collecting' | 'closed';

export interface DuePeriodSummary {
  period_id: string;
  total_members: number;
  total_expected_amount: number;
  total_paid_amount: number;
  total_outstanding_amount: number;
  paid_member_count: number;
  partial_member_count: number;
  overdue_member_count: number;
  pending_member_count: number;
}

export interface DuePeriod {
  id: string;
  name: string;
  period_start: string;
  period_end: string;
  due_date: string;
  due_amount: number;
  penalty_rate: number;
  description: string | null;
  status: DuePeriodStatus;
  created_at: string;
  published_at?: string | null;
  closed_at?: string | null;
  summary?: DuePeriodSummary | null;
}

export type PaymentMethod =
  | 'cash'
  | 'bank_transfer'
  | 'credit_card'
  | 'debit_card'
  | 'online'
  | 'other';

export type MemberDueStatus =
  | 'pending'
  | 'partial'
  | 'paid'
  | 'overdue'
  | 'cancelled';

export interface MemberDue {
  id: string;
  member_id: string;
  period_id: string;
  due_date: string;
  amount_due: number;
  discount_amount: number;
  penalty_amount: number;
  paid_amount: number;
  status: MemberDueStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  member_due_periods?: {
    name: string;
    due_amount: number;
    due_date: string;
    penalty_rate: number;
    status: DuePeriodStatus;
    period_start: string;
    period_end: string;
  } | null;
}

export type MemberDueRecord = MemberDue & {
  member_due_periods?: {
    name: string;
    due_amount: number;
    due_date: string;
    penalty_rate?: number;
    status?: string | DuePeriodStatus;
    period_start?: string;
    period_end?: string;
  } | null;
  total_due_amount?: number;
  outstanding_amount?: number;
};

export interface MemberDuePayment {
  id: string;
  member_due_id: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  reference_number: string | null;
  recorded_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
