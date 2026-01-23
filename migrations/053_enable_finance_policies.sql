-- Enable RLS policies for Finance Module (accounting_accounts, etc.)

-- 1. accounting_accounts
CREATE POLICY "Enable all access for authenticated users" ON accounting_accounts
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 2. cost_centers
CREATE POLICY "Enable all access for authenticated users" ON cost_centers
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 3. financial_transactions
CREATE POLICY "Enable all access for authenticated users" ON financial_transactions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 4. financial_ledger
CREATE POLICY "Enable all access for authenticated users" ON financial_ledger
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 5. bank_accounts
CREATE POLICY "Enable all access for authenticated users" ON bank_accounts
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 6. payment_requests
CREATE POLICY "Enable all access for authenticated users" ON payment_requests
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 7. budgets
CREATE POLICY "Enable all access for authenticated users" ON budgets
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
