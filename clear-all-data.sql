-- Clear all data from Finance Manager database
-- This script deletes all transactions, budgets, insights, and reports
-- Resets account balances to initial values
-- Keeps account and category structure intact

-- Delete in order to respect foreign key constraints
DELETE FROM transactions;
DELETE FROM budgets;
DELETE FROM insights;
DELETE FROM monthly_reports;

-- Reset account balances to initial values
UPDATE accounts SET 
    balance = CASE 
        WHEN name = 'Leumi Bank Account' THEN 109238
        WHEN name = 'Keren Hishtalmut' THEN 376751
        WHEN name = 'Bitcoin' THEN 64300
        WHEN name = 'Phoenix Savings' THEN 663458
        WHEN name = 'Fiverr Vested' THEN 322537
        ELSE 0
    END,
    updated_at = NOW();

-- Note: Categories are kept as-is (system categories remain)
-- If you want to delete user-created categories too, uncomment:
-- DELETE FROM categories WHERE is_system = false;

