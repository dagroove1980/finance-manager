// Supabase client initialization
let supabaseClient = null;

async function initSupabase() {
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
        console.error('Supabase credentials not found. Make sure config.js is loaded.');
        return null;
    }

    if (!supabaseClient) {
        const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
        supabaseClient = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    }

    return supabaseClient;
}

// Account operations
async function getAccounts() {
    const supabase = await initSupabase();
    if (!supabase) return [];
    
    const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_active', true)
        .order('name');
    
    if (error) {
        console.error('Error fetching accounts:', error);
        return [];
    }
    return data || [];
}

async function createAccount(accountData) {
    const supabase = await initSupabase();
    if (!supabase) return null;
    
    const { data, error } = await supabase
        .from('accounts')
        .insert(accountData)
        .select()
        .single();
    
    if (error) {
        console.error('Error creating account:', error);
        return null;
    }
    return data;
}

async function updateAccount(id, updates) {
    const supabase = await initSupabase();
    if (!supabase) return null;
    
    const { data, error } = await supabase
        .from('accounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    
    if (error) {
        console.error('Error updating account:', error);
        return null;
    }
    return data;
}

// Transaction operations
async function getTransactions(filters = {}) {
    const supabase = await initSupabase();
    if (!supabase) return [];
    
    let query = supabase
        .from('transactions')
        .select(`
            *,
            account:accounts(*),
            category:categories(*)
        `)
        .order('transaction_date', { ascending: false });
    
    if (filters.account_id) {
        query = query.eq('account_id', filters.account_id);
    }
    if (filters.category_id) {
        query = query.eq('category_id', filters.category_id);
    }
    if (filters.type) {
        query = query.eq('type', filters.type);
    }
    if (filters.date_from) {
        query = query.gte('transaction_date', filters.date_from);
    }
    if (filters.date_to) {
        query = query.lte('transaction_date', filters.date_to);
    }
    if (filters.search) {
        query = query.ilike('description', `%${filters.search}%`);
    }
    
    const { data, error } = await query.limit(filters.limit || 1000);
    
    if (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }
    return data || [];
}

async function createTransaction(transactionData) {
    const supabase = await initSupabase();
    if (!supabase) return null;
    
    const { data, error } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select(`
            *,
            account:accounts(*),
            category:categories(*)
        `)
        .single();
    
    if (error) {
        console.error('Error creating transaction:', error);
        return null;
    }
    return data;
}

async function updateTransaction(id, updates) {
    const supabase = await initSupabase();
    if (!supabase) return null;
    
    const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select(`
            *,
            account:accounts(*),
            category:categories(*)
        `)
        .single();
    
    if (error) {
        console.error('Error updating transaction:', error);
        return null;
    }
    return data;
}

async function deleteTransaction(id) {
    const supabase = await initSupabase();
    if (!supabase) return false;
    
    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
    
    if (error) {
        console.error('Error deleting transaction:', error);
        return false;
    }
    return true;
}

// Category operations
async function getCategories(type = null) {
    const supabase = await initSupabase();
    if (!supabase) return [];
    
    let query = supabase
        .from('categories')
        .select('*')
        .order('name');
    
    if (type) {
        query = query.eq('type', type);
    }
    
    const { data, error } = await query;
    
    if (error) {
        console.error('Error fetching categories:', error);
        return [];
    }
    return data || [];
}

// Budget operations
async function getBudgets(periodStart = null, periodEnd = null) {
    const supabase = await initSupabase();
    if (!supabase) return [];
    
    let query = supabase
        .from('budgets')
        .select(`
            *,
            category:categories(*),
            account:accounts(*)
        `);
    
    if (periodStart) {
        query = query.gte('period_end', periodStart);
    }
    if (periodEnd) {
        query = query.lte('period_start', periodEnd);
    }
    
    const { data, error } = await query;
    
    if (error) {
        console.error('Error fetching budgets:', error);
        return [];
    }
    return data || [];
}

// Insights operations
async function getInsights(unreadOnly = false) {
    const supabase = await initSupabase();
    if (!supabase) return [];
    
    let query = supabase
        .from('insights')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (unreadOnly) {
        query = query.eq('is_read', false).eq('is_dismissed', false);
    }
    
    const { data, error } = await query;
    
    if (error) {
        console.error('Error fetching insights:', error);
        return [];
    }
    return data || [];
}

async function markInsightRead(id) {
    const supabase = await initSupabase();
    if (!supabase) return false;
    
    const { error } = await supabase
        .from('insights')
        .update({ is_read: true })
        .eq('id', id);
    
    if (error) {
        console.error('Error marking insight as read:', error);
        return false;
    }
    return true;
}

// Monthly reports operations
async function getMonthlyReport(year, month) {
    const supabase = await initSupabase();
    if (!supabase) return null;
    
    const { data, error } = await supabase
        .from('monthly_reports')
        .select('*')
        .eq('year', year)
        .eq('month', month)
        .single();
    
    if (error) {
        console.error('Error fetching monthly report:', error);
        return null;
    }
    return data;
}

async function generateMonthlyReport(year, month) {
    // Call API endpoint to generate report
    try {
        const response = await fetch(`/api/generate-report?year=${year}&month=${month}`);
        if (!response.ok) throw new Error('Failed to generate report');
        return await response.json();
    } catch (error) {
        console.error('Error generating monthly report:', error);
        return null;
    }
}

// Statistics operations
async function getStatistics(period = 'month') {
    const supabase = await initSupabase();
    if (!supabase) return null;
    
    const now = new Date();
    let startDate, endDate;
    
    switch (period) {
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        case 'quarter':
            const quarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), quarter * 3, 1);
            endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
            break;
        case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31);
            break;
        default:
            startDate = new Date(0);
            endDate = new Date();
    }
    
    // Get income and expenses
    const income = await getTransactions({
        type: 'income',
        date_from: startDate.toISOString().split('T')[0],
        date_to: endDate.toISOString().split('T')[0]
    });
    
    const expenses = await getTransactions({
        type: 'expense',
        date_from: startDate.toISOString().split('T')[0],
        date_to: endDate.toISOString().split('T')[0]
    });
    
    const totalIncome = income.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
    // Get expenses by category
    const expensesByCategory = {};
    expenses.forEach(t => {
        const catName = t.category?.name || 'Uncategorized';
        expensesByCategory[catName] = (expensesByCategory[catName] || 0) + parseFloat(t.amount || 0);
    });
    
    return {
        totalIncome,
        totalExpenses,
        netFlow: totalIncome - totalExpenses,
        expensesByCategory,
        transactionCount: income.length + expenses.length
    };
}

// Export for use in other files
window.supabaseAPI = {
    getAccounts,
    createAccount,
    updateAccount,
    getTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    getCategories,
    getBudgets,
    getInsights,
    markInsightRead,
    getMonthlyReport,
    generateMonthlyReport,
    getStatistics
};

