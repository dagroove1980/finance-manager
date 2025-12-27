// Vercel serverless function for generating monthly reports
// Analyzes spending patterns and generates insights

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { year, month } = req.query;

    if (!year || !month) {
        return res.status(400).json({ error: 'Year and month are required' });
    }

    try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return res.status(500).json({ error: 'Supabase credentials not configured' });
        }

        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get transactions for the month
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = new Date(year, month, 0).toISOString().split('T')[0];

        const { data: transactions, error: txError } = await supabase
            .from('transactions')
            .select(`
                *,
                category:categories(*),
                account:accounts(*)
            `)
            .gte('transaction_date', startDate)
            .lte('transaction_date', endDate);

        if (txError) {
            throw new Error(`Failed to fetch transactions: ${txError.message}`);
        }

        // Calculate statistics
        const income = transactions.filter(t => t.type === 'income');
        const expenses = transactions.filter(t => t.type === 'expense');

        const totalIncome = income.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        const totalExpenses = expenses.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        const netFlow = totalIncome - totalExpenses;

        // Expenses by category
        const expensesByCategory = {};
        expenses.forEach(t => {
            const catName = t.category?.name || 'Uncategorized';
            expensesByCategory[catName] = (expensesByCategory[catName] || 0) + parseFloat(t.amount || 0);
        });

        // Expenses by account
        const expensesByAccount = {};
        expenses.forEach(t => {
            const accName = t.account?.name || 'Unknown';
            expensesByAccount[accName] = (expensesByAccount[accName] || 0) + parseFloat(t.amount || 0);
        });

        // Top expenses
        const topExpenses = expenses
            .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
            .slice(0, 10)
            .map(t => ({
                description: t.description,
                amount: parseFloat(t.amount),
                category: t.category?.name || 'Uncategorized',
                date: t.transaction_date
            }));

        // Get previous month for comparison
        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear = month === 1 ? year - 1 : year;
        const prevStartDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
        const prevEndDate = new Date(prevYear, prevMonth, 0).toISOString().split('T')[0];

        const { data: prevTransactions } = await supabase
            .from('transactions')
            .select('*')
            .gte('transaction_date', prevStartDate)
            .lte('transaction_date', prevEndDate);

        const prevIncome = prevTransactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) || 0;
        const prevExpenses = prevTransactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) || 0;

        // Generate insights
        const insights = generateInsights({
            totalIncome,
            totalExpenses,
            netFlow,
            expensesByCategory,
            prevIncome,
            prevExpenses
        });

        // Create report record
        const reportData = {
            year: parseInt(year),
            month: parseInt(month),
            total_income: totalIncome,
            total_expenses: totalExpenses,
            net_flow: netFlow,
            income_by_category: {},
            expenses_by_category: expensesByCategory,
            expenses_by_account: expensesByAccount,
            top_expenses: topExpenses,
            insights_summary: insights.summary,
            recommendations: insights.recommendations,
            vs_previous_month: {
                income_change: totalIncome - prevIncome,
                income_change_percent: prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome * 100).toFixed(1) : 0,
                expenses_change: totalExpenses - prevExpenses,
                expenses_change_percent: prevExpenses > 0 ? ((totalExpenses - prevExpenses) / prevExpenses * 100).toFixed(1) : 0
            }
        };

        // Upsert report
        const { data: report, error: reportError } = await supabase
            .from('monthly_reports')
            .upsert(reportData, { onConflict: 'year,month' })
            .select()
            .single();

        if (reportError) {
            throw new Error(`Failed to save report: ${reportError.message}`);
        }

        return res.json(report);

    } catch (error) {
        console.error('Report generation error:', error);
        return res.status(500).json({ error: 'Failed to generate report', details: error.message });
    }
}

function generateInsights(data) {
    const { totalIncome, totalExpenses, netFlow, expensesByCategory, prevIncome, prevExpenses } = data;
    
    const insights = [];
    const recommendations = [];
    
    // Spending vs income
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1) : 0;
    
    if (savingsRate < 0) {
        insights.push(`You spent ${Math.abs(savingsRate)}% more than you earned this month.`);
        recommendations.push('Consider reviewing your expenses and identifying areas to cut back.');
    } else if (savingsRate < 10) {
        insights.push(`Your savings rate is ${savingsRate}%, which is below the recommended 20%.`);
        recommendations.push('Try to increase your savings rate by reducing discretionary spending.');
    } else {
        insights.push(`Great job! Your savings rate is ${savingsRate}%.`);
    }
    
    // Expense changes
    if (prevExpenses > 0) {
        const expenseChange = ((totalExpenses - prevExpenses) / prevExpenses * 100).toFixed(1);
        if (expenseChange > 10) {
            insights.push(`Your expenses increased by ${expenseChange}% compared to last month.`);
            recommendations.push('Review your spending patterns to identify the cause of the increase.');
        } else if (expenseChange < -10) {
            insights.push(`Your expenses decreased by ${Math.abs(expenseChange)}% compared to last month.`);
        }
    }
    
    // Top spending category
    const topCategory = Object.entries(expensesByCategory)
        .sort((a, b) => b[1] - a[1])[0];
    
    if (topCategory) {
        const categoryPercent = ((topCategory[1] / totalExpenses) * 100).toFixed(1);
        insights.push(`Your largest expense category is ${topCategory[0]}, accounting for ${categoryPercent}% of total expenses.`);
        
        if (categoryPercent > 30 && topCategory[0] !== 'Rent' && topCategory[0] !== 'Bills & Utilities') {
            recommendations.push(`Consider reviewing your ${topCategory[0]} spending - it's a significant portion of your budget.`);
        }
    }
    
    return {
        summary: insights.join(' '),
        recommendations
    };
}

