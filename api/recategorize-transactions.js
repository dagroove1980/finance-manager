// Vercel serverless function to recategorize existing transactions
// Useful when categorization logic is updated

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { account_id, import_source } = req.body;

    // Categorization function (same as in import-transactions.js)
    function categorizeTransactionByKeywords(description, merchant) {
        // HARDCODED: Check for Max credit card transactions first (most common pattern)
        if (description && (
            description.includes('מקס איט') || 
            description.includes('מקס') ||
            description.toLowerCase().includes('מקס') ||
            description.toLowerCase().includes('max')
        )) {
            return { category: 'Credit Card Payment', confidence: 0.9 };
        }
        
        const desc = (description + ' ' + (merchant || '')).toLowerCase();
        
        // First, check for recipient-based categorization (for transfers)
        const transferMatch = desc.match(/העברה\s+(?:אל|ל|מאת)[:\s]+([א-ת\s]+?)(?:\d|$)/);
        if (transferMatch) {
            const recipient = transferMatch[1].trim();
            
            // Rent - Johanna/Yana Saiba (גואנה סאיבה)
            if (recipient.includes('גואנה') || recipient.includes('סאיבה')) {
                return { category: 'Rent', confidence: 0.95 };
            }
            
            // Child Care - Shimrit Peretz (שמרית פרץ) - 3 small kids
            if (recipient.includes('שמרית') || recipient.includes('פרץ')) {
                return { category: 'Child Care', confidence: 0.95 };
            }
            
            // Child Care - Yifat Katish/Katiai (יפעת קטיש/קטיעי) - 3 small kids
            if (recipient.includes('יפעת') || recipient.includes('קטיש') || recipient.includes('קטיעי') || 
                (recipient.includes('יפעת') && recipient.includes('קט'))) {
                return { category: 'Child Care', confidence: 0.95 };
            }
            
            // Child Care - Yanai Shabat (ינאי שבת) - pocket money for Yanai
            if (recipient.includes('ינאי') && recipient.includes('שבת')) {
                return { category: 'Child Care', confidence: 0.95 };
            }
            
            // Building Fees - Building Committee (ועד צייטלין)
            if (recipient.includes('ועד') || recipient.includes('צייטלין')) {
                return { category: 'Bills & Utilities', confidence: 0.95 };
            }
            
            // Parking - Menachem
            if (recipient.includes('מנחם') || recipient.includes('שרלאוב') || recipient.includes('שרונה') || recipient.includes('חניה')) {
                return { category: 'Transportation', confidence: 0.95 };
            }
            
            // Max transfers - Credit Card Payment
            if (recipient.includes('מקס איט') || recipient.includes('מקס') || recipient.includes('max')) {
                return { category: 'Credit Card Payment', confidence: 0.95 };
            }
            
            // Other Yanai transfers - Child Care
            if (recipient.includes('ינאי') && !recipient.includes('טייכמן')) {
                return { category: 'Child Care', confidence: 0.9 };
            }
        }
        
        // Keyword-based categorization
        // Hardcode common patterns for Max credit card
        if (desc.includes('מקס איט') || desc.includes('max') || desc.includes('מקס איט פיננ') || 
            desc.includes('מקס') || desc.startsWith('מקס') || desc.indexOf('מקס') >= 0) {
            return { category: 'Credit Card Payment', confidence: 0.7 };
        }
        if (desc.includes('הפניקס')) {
            return { category: 'Savings Withdrawal', confidence: 0.7 };
        }
        if (desc.includes('משכורת') || desc.includes('הפועלים')) {
            return { category: 'Salary', confidence: 0.7 };
        }
        if (desc.includes('הוראת קבע')) {
            return { category: 'Child Care', confidence: 0.7 };
        }
        if (desc.includes('עמל')) {
            return { category: 'Bank Fees', confidence: 0.7 };
        }
        if (desc.includes('דמי מזונות')) {
            return { category: 'Child Care', confidence: 0.9 };
        }
        
        return { category: 'Uncategorized', confidence: 0.5 };
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Supabase credentials not configured' });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Build query to fetch transactions
        let query = supabase
            .from('transactions')
            .select('id, description, merchant, account_id, import_source');

        if (account_id) {
            query = query.eq('account_id', account_id);
        }
        if (import_source) {
            query = query.eq('import_source', import_source);
        }

        const { data: transactions, error: fetchError } = await query;

        if (fetchError) {
            throw fetchError;
        }

        if (!transactions || transactions.length === 0) {
            return res.json({ 
                message: 'No transactions found to recategorize',
                count: 0 
            });
        }

        // Get all categories to map category names to IDs
        const { data: categories } = await supabase
            .from('categories')
            .select('id, name');
        
        const categoryMap = {};
        if (categories) {
            categories.forEach(cat => {
                categoryMap[cat.name.toLowerCase()] = cat.id;
            });
        }

        // Recategorize each transaction
        let updatedCount = 0;
        const updates = [];

        for (const tx of transactions) {
            const categoryResult = categorizeTransactionByKeywords(tx.description, tx.merchant);
            const categoryName = categoryResult.category.toLowerCase();
            const categoryId = categoryMap[categoryName] || null;

            console.log(`Transaction: "${tx.description.substring(0, 50)}" -> Category: "${categoryResult.category}" -> ID: ${categoryId}`);

            // Update even if category_id is null (to set ai_category_suggestion)
            // But prefer to set category_id if available
            if (categoryResult.category !== 'Uncategorized') {
                updates.push({
                    id: tx.id,
                    category_id: categoryId,
                    ai_category_suggestion: categoryResult.category,
                    ai_confidence: categoryResult.confidence || 0.7
                });
            }
        }

        // Batch update transactions
        for (const update of updates) {
            const updateData = {
                ai_category_suggestion: update.ai_category_suggestion,
                ai_confidence: update.ai_confidence,
                updated_at: new Date().toISOString()
            };
            
            // Only set category_id if we found a matching category
            if (update.category_id) {
                updateData.category_id = update.category_id;
            } else {
                // If no category_id found, log it for debugging
                console.warn(`No category_id found for category: "${update.ai_category_suggestion}"`);
                // Set to null to clear old category
                updateData.category_id = null;
            }

            const { error: updateError } = await supabase
                .from('transactions')
                .update(updateData)
                .eq('id', update.id);

            if (!updateError) {
                updatedCount++;
            } else {
                console.error(`Error updating transaction ${update.id}:`, updateError);
            }
        }
        
        // Log category map for debugging
        console.log('Category map:', Object.keys(categoryMap));

        return res.json({
            message: `Successfully recategorized ${updatedCount} transaction(s)`,
            total_found: transactions.length,
            updated: updatedCount
        });

    } catch (error) {
        console.error('Recategorization error:', error);
        return res.status(500).json({ 
            error: 'Failed to recategorize transactions',
            details: error.message 
        });
    }
}

