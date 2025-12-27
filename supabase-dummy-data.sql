-- Dummy Data for Finance Manager
-- Auto-generated with proper relationships
-- This file inserts sample data respecting foreign key constraints

-- Insert sample transactions
INSERT INTO transactions (account_id, category_id, amount, type, description, transaction_date, payment_method, import_source, import_id) VALUES
    ((SELECT id FROM accounts WHERE name = 'Leumi Bank Account' LIMIT 1), 
     (SELECT id FROM categories WHERE name = 'Salary' LIMIT 1), 
     15000, 'income', 'Monthly Salary', CURRENT_DATE - INTERVAL '5 days', 'transfer', 'manual', 'manual_salary_1'),
    
    ((SELECT id FROM accounts WHERE name = 'Leumi Bank Account' LIMIT 1), 
     (SELECT id FROM categories WHERE name = 'Rent' LIMIT 1), 
     5000, 'expense', 'Monthly Rent', CURRENT_DATE - INTERVAL '3 days', 'transfer', 'manual', 'manual_rent_1'),
    
    ((SELECT id FROM accounts WHERE name = 'Leumi Bank Account' LIMIT 1), 
     (SELECT id FROM categories WHERE name = 'Child Care' LIMIT 1), 
     2000, 'expense', 'Daycare Payment', CURRENT_DATE - INTERVAL '2 days', 'transfer', 'manual', 'manual_daycare_1'),
    
    ((SELECT id FROM accounts WHERE name = 'Leumi Bank Account' LIMIT 1), 
     (SELECT id FROM categories WHERE name = 'Food & Dining' LIMIT 1), 
     350, 'expense', 'Supermarket Shopping', CURRENT_DATE - INTERVAL '1 day', 'debit', 'manual', 'manual_food_1'),
    
    ((SELECT id FROM accounts WHERE name = 'Leumi Bank Account' LIMIT 1), 
     (SELECT id FROM categories WHERE name = 'Transportation' LIMIT 1), 
     250, 'expense', 'Gas Station', CURRENT_DATE, 'credit', 'manual', 'manual_gas_1'),
    
    ((SELECT id FROM accounts WHERE name = 'Leumi Bank Account' LIMIT 1), 
     (SELECT id FROM categories WHERE name = 'Bills & Utilities' LIMIT 1), 
     450, 'expense', 'Electricity Bill', CURRENT_DATE - INTERVAL '7 days', 'transfer', 'manual', 'manual_electricity_1'),
    
    ((SELECT id FROM accounts WHERE name = 'Leumi Bank Account' LIMIT 1), 
     (SELECT id FROM categories WHERE name = 'Food & Dining' LIMIT 1), 
     120, 'expense', 'Restaurant Dinner', CURRENT_DATE - INTERVAL '4 days', 'credit', 'manual', 'manual_restaurant_1'),
    
    ((SELECT id FROM accounts WHERE name = 'Leumi Bank Account' LIMIT 1), 
     (SELECT id FROM categories WHERE name = 'Shopping' LIMIT 1), 
     800, 'expense', 'Online Shopping', CURRENT_DATE - INTERVAL '6 days', 'credit', 'manual', 'manual_shopping_1'),
    
    ((SELECT id FROM accounts WHERE name = 'Leumi Bank Account' LIMIT 1), 
     (SELECT id FROM categories WHERE name = 'Healthcare' LIMIT 1), 
     150, 'expense', 'Pharmacy', CURRENT_DATE - INTERVAL '8 days', 'debit', 'manual', 'manual_pharmacy_1'),
    
    ((SELECT id FROM accounts WHERE name = 'Leumi Bank Account' LIMIT 1), 
     (SELECT id FROM categories WHERE name = 'Entertainment' LIMIT 1), 
     200, 'expense', 'Netflix Subscription', CURRENT_DATE - INTERVAL '10 days', 'credit', 'manual', 'manual_netflix_1')
ON CONFLICT (account_id, import_id) DO NOTHING;

-- Insert sample budgets
INSERT INTO budgets (category_id, amount, period_start, period_end, period_type) VALUES
    ((SELECT id FROM categories WHERE name = 'Food & Dining' LIMIT 1), 
     2000, DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day', 'monthly'),
    
    ((SELECT id FROM categories WHERE name = 'Transportation' LIMIT 1), 
     1000, DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day', 'monthly'),
    
    ((SELECT id FROM categories WHERE name = 'Shopping' LIMIT 1), 
     1500, DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day', 'monthly'),
    
    ((SELECT id FROM categories WHERE name = 'Entertainment' LIMIT 1), 
     500, DATE_TRUNC('month', CURRENT_DATE), DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day', 'monthly')
ON CONFLICT DO NOTHING;

-- Insert sample insights
INSERT INTO insights (type, title, message, severity, data) VALUES
    ('spending_trend', 'Spending Increase Detected', 'Your expenses this month are 15% higher than last month. Consider reviewing your spending patterns.', 'warning', 
     '{"increase_percent": 15, "category": "Food & Dining"}'::jsonb),
    
    ('budget_alert', 'Budget Warning', 'You have spent 85% of your Food & Dining budget for this month.', 'warning', 
     '{"budget_used": 85, "category": "Food & Dining"}'::jsonb),
    
    ('savings_opportunity', 'Savings Opportunity', 'You could save ₪500 per month by reducing dining out expenses.', 'info', 
     '{"potential_savings": 500, "category": "Food & Dining"}'::jsonb)
ON CONFLICT DO NOTHING;

