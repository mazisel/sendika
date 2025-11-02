export type FinanceAccountType = 'cash' | 'bank' | 'other';
export type FinanceCategoryType = 'income' | 'expense' | 'transfer';
export type FinanceTransactionType = 'income' | 'expense' | 'transfer';

export interface FinanceAccount {
  id: string;
  name: string;
  account_type: FinanceAccountType;
  currency: string;
  opening_balance: number;
  current_balance: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinanceCategory {
  id: string;
  name: string;
  category_type: FinanceCategoryType;
  parent_id: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinanceTransaction {
  id: string;
  account_id: string;
  category_id: string;
  transaction_type: FinanceTransactionType;
  amount: number;
  transaction_date: string;
  reference_code: string | null;
  description: string | null;
  member_id: string | null;
  member_due_id: string | null;
  transfer_account_id: string | null;
  created_by: string | null;
  approved_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinanceAccountSummary {
  account_id: string;
  name: string;
  account_type: FinanceAccountType;
  currency: string;
  opening_balance: number;
  current_balance: number;
  transaction_count: number;
  total_income: number;
  total_expense: number;
  total_outgoing_transfer: number;
  total_incoming_transfer: number;
}

export interface FinanceSummaryOverview {
  total_balance: number;
  total_income: number;
  total_expense: number;
  total_incoming_transfer: number;
  total_outgoing_transfer: number;
}

export interface FinanceCategoryBreakdownItem {
  category_id: string;
  category_name: string;
  category_type: FinanceCategoryType;
  total_amount: number;
}

export interface FinanceSummary {
  overview: FinanceSummaryOverview;
  accounts: Array<FinanceAccount & { summary: FinanceAccountSummary | null }>;
  recent_transactions: Array<
    FinanceTransaction & {
      finance_accounts?: Pick<FinanceAccount, 'id' | 'name' | 'account_type' | 'currency'> | null;
      finance_categories?: Pick<FinanceCategory, 'id' | 'name' | 'category_type'> | null;
    }
  >;
  category_breakdown: FinanceCategoryBreakdownItem[];
  period: {
    start: string;
    end: string;
  };
}
