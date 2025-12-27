-- Supabase Database Schema for Finance Manager
-- Next-gen personal finance management with AI-powered insights

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Account Types Enum
CREATE TYPE account_type AS ENUM (
    'bank',           -- Leumi bank account
    'credit_card',    -- Max credit card
    'savings',        -- Phoenix savings
    'investment',     -- Fiverr vesting (IBI)
    'retirement',     -- Keren hishtalmut
    'crypto',         -- Bitcoin
    'other'
);

-- Transaction Types Enum
CREATE TYPE transaction_type AS ENUM (
    'income',         -- Salary, dividends, etc.
    'expense',        -- Purchases, bills, etc.
    'transfer',       -- Between accounts
    'investment',     -- Buying/selling investments
    'other'
);

-- Accounts table - All financial accounts
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type account_type NOT NULL,
    institution TEXT,  -- e.g., "Leumi", "Max", "Phoenix", "IBI", "Keren Hishtalmut"
    account_number TEXT,
    balance DECIMAL(15, 2) DEFAULT 0,
    currency TEXT DEFAULT 'ILS',
    is_active BOOLEAN DEFAULT true,
    metadata JSONB,  -- Store account-specific data
    last_import_date DATE,  -- Last successful import date
    import_source TEXT,  -- Default import source (leumi_csv, max_csv, etc.)
    auto_import_enabled BOOLEAN DEFAULT true,  -- Enable auto-reminders
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table - Expense/Income categories
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    type transaction_type NOT NULL,
    color TEXT DEFAULT '#6366f1',
    icon TEXT DEFAULT '💰',
    keywords TEXT[],  -- Keywords for AI categorization
    is_system BOOLEAN DEFAULT false,  -- System categories vs user-created
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table - All financial transactions
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    
    -- Transaction details
    amount DECIMAL(15, 2) NOT NULL,
    type transaction_type NOT NULL,
    description TEXT NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Additional details
    merchant TEXT,
    location TEXT,
    payment_method TEXT,  -- cash, credit, debit, transfer, etc.
    reference_number TEXT,  -- Bank reference, check number, etc.
    notes TEXT,
    receipt_url TEXT,
    
    -- AI categorization
    ai_category_suggestion TEXT,  -- AI-suggested category
    ai_confidence DECIMAL(3, 2),  -- 0.00 to 1.00
    is_ai_categorized BOOLEAN DEFAULT false,
    
    -- Recurring transactions
    is_recurring BOOLEAN DEFAULT false,
    recurring_pattern TEXT,  -- monthly, weekly, etc.
    recurring_group_id UUID,  -- Group related recurring transactions
    
    -- Tags for flexible filtering
    tags TEXT[],
    
    -- Metadata for bank imports
    import_source TEXT,  -- "leumi_csv", "max_csv", "manual", etc.
    import_id TEXT,  -- Unique ID from import source
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate imports
    UNIQUE(account_id, import_id)
);

-- Budgets table - Monthly/yearly budgets per category
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,  -- NULL = all accounts
    
    amount DECIMAL(15, 2) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type TEXT DEFAULT 'monthly',  -- monthly, yearly, custom
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insights table - AI-generated insights and recommendations
CREATE TABLE IF NOT EXISTS insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,  -- 'spending_trend', 'budget_alert', 'savings_opportunity', 'anomaly', etc.
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT DEFAULT 'info',  -- info, warning, critical
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    
    -- Insight data
    data JSONB,  -- Store relevant metrics, comparisons, etc.
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ  -- When insight becomes stale
);

-- Monthly Reports table - Generated monthly summaries
CREATE TABLE IF NOT EXISTS monthly_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,  -- 1-12
    
    -- Summary data
    total_income DECIMAL(15, 2) DEFAULT 0,
    total_expenses DECIMAL(15, 2) DEFAULT 0,
    net_flow DECIMAL(15, 2) DEFAULT 0,
    
    -- Breakdowns (stored as JSON for flexibility)
    income_by_category JSONB,
    expenses_by_category JSONB,
    expenses_by_account JSONB,
    top_expenses JSONB,  -- Top 10 expenses
    
    -- Insights
    insights_summary TEXT,
    recommendations TEXT[],
    
    -- Comparison with previous period
    vs_previous_month JSONB,
    
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(year, month)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_import_id ON transactions(account_id, import_id);
CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_insights_created_at ON insights(created_at);
CREATE INDEX IF NOT EXISTS idx_insights_read ON insights(is_read, is_dismissed);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_year_month ON monthly_reports(year, month);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations (single-user app, customize for multi-user)
CREATE POLICY "Allow all operations" ON accounts FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON categories FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON transactions FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON budgets FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON insights FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON monthly_reports FOR ALL USING (true);

-- Insert default accounts based on user's data
INSERT INTO accounts (name, type, institution, balance, currency, import_source, auto_import_enabled) VALUES
    ('Leumi Bank Account', 'bank', 'Leumi', 109238, 'ILS', 'leumi_csv', true),
    ('Keren Hishtalmut', 'retirement', 'Leumi', 376751, 'ILS', NULL, false),
    ('Bitcoin', 'crypto', 'Crypto Exchange', 64300, 'ILS', NULL, false),
    ('Phoenix Savings', 'savings', 'Phoenix', 663458, 'ILS', 'phoenix_csv', true),
    ('Fiverr Vested', 'investment', 'IBI', 322537, 'ILS', 'ibi_csv', true)
ON CONFLICT DO NOTHING;

-- Insert default expense categories with keywords for AI
INSERT INTO categories (name, type, color, icon, keywords, is_system) VALUES
    -- Income categories
    ('Salary', 'income', '#10b981', '💼', ARRAY['salary', 'wage', 'paycheck', 'משכורת', 'העברת משכורת'], true),
    ('Investment Returns', 'income', '#10b981', '📈', ARRAY['dividend', 'interest', 'return', 'yield'], true),
    ('Savings Withdrawal', 'income', '#10b981', '💰', ARRAY['phoenix', 'savings withdrawal', 'הפניקס', 'withdrawal'], true),
    ('Other Income', 'income', '#10b981', '💰', ARRAY[]::TEXT[], true),
    
    -- Expense categories
    ('Food & Dining', 'expense', '#ef4444', '🍔', ARRAY['restaurant', 'food', 'grocery', 'supermarket', 'cafe', 'מסעדה', 'מזון'], true),
    ('Transportation', 'expense', '#3b82f6', '🚗', ARRAY['gas', 'fuel', 'taxi', 'uber', 'parking', 'דלק', 'חניה'], true),
    ('Shopping', 'expense', '#8b5cf6', '🛍️', ARRAY['store', 'shop', 'purchase', 'buy', 'קנייה'], true),
    ('Bills & Utilities', 'expense', '#f59e0b', '💡', ARRAY['electric', 'water', 'internet', 'phone', 'utility', 'חשבון', 'חשמל', 'building', 'דירה'], true),
    ('Rent', 'expense', '#f59e0b', '🏠', ARRAY['rent', 'lease', 'שכירות', 'דירה'], true),
    ('Child Care', 'expense', '#ec4899', '👶', ARRAY['childcare', 'babysitter', 'nanny', 'daycare', 'גן', 'מטפלת', 'הוראת קבע'], true),
    ('Credit Card Payment', 'expense', '#8b5cf6', '💳', ARRAY['max', 'credit card', 'מקס איט', 'card payment'], true),
    ('Bank Fees', 'expense', '#6b7280', '🏦', ARRAY['fee', 'commission', 'עמל', 'bank fee'], true),
    ('Healthcare', 'expense', '#10b981', '🏥', ARRAY['doctor', 'pharmacy', 'medicine', 'medical', 'רופא', 'תרופה'], true),
    ('Entertainment', 'expense', '#ec4899', '🎬', ARRAY['movie', 'cinema', 'netflix', 'streaming', 'entertainment'], true),
    ('Education', 'expense', '#6366f1', '📚', ARRAY['course', 'education', 'school', 'learning', 'חינוך'], true),
    ('Travel', 'expense', '#06b6d4', '✈️', ARRAY['flight', 'hotel', 'travel', 'vacation', 'נסיעה'], true),
    ('Other', 'expense', '#6b7280', '💰', ARRAY[]::TEXT[], true)
ON CONFLICT (name) DO NOTHING;

