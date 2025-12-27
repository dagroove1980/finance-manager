// Vercel serverless function for AI-powered transaction categorization
// Uses OpenAI API to categorize transactions intelligently

// Export the categorization function for direct use
export async function categorizeTransaction({ description, amount, merchant, account_type }) {
    if (!description) {
        return categorizeByKeywords(description, merchant);
    }

    // Check if OpenAI API key is configured
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
        // Fallback to keyword-based categorization
        return categorizeByKeywords(description, merchant);
    }

    try {
        // Use OpenAI to categorize
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: `You are a financial categorization assistant. Categorize transactions into one of these categories:
- Food & Dining (restaurants, groceries, cafes)
- Transportation (gas, parking, taxis, public transport)
- Shopping (retail stores, online shopping)
- Bills & Utilities (electricity, water, internet, phone)
- Rent (rental payments)
- Child Care (daycare, babysitter, nanny, standing orders for childcare)
- Credit Card Payment (payments to credit card companies like Max)
- Bank Fees (bank commissions and fees)
- Savings Withdrawal (withdrawals from savings accounts like Phoenix)
- Healthcare (doctor, pharmacy, medical)
- Entertainment (movies, streaming, events)
- Education (courses, books, training)
- Travel (flights, hotels, vacation)
- Salary (income from employment)
- Investment Returns (dividends, interest)
- Other

Respond with JSON: {"category": "Category Name", "confidence": 0.0-1.0, "reasoning": "brief explanation"}`
                    },
                    {
                        role: 'user',
                        content: `Categorize this transaction:
Description: ${description}
${merchant ? `Merchant: ${merchant}` : ''}
${amount ? `Amount: ${amount} ILS` : ''}
${account_type ? `Account: ${account_type}` : ''}`
                    }
                ],
                temperature: 0.3,
                max_tokens: 150
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        // Parse JSON response
        let result;
        try {
            result = JSON.parse(content);
        } catch (e) {
            // If not valid JSON, try to extract category name
            const categoryMatch = content.match(/category["\s:]+["']?([^"'\n]+)["']?/i);
            result = {
                category: categoryMatch ? categoryMatch[1] : 'Other',
                confidence: 0.7,
                reasoning: 'AI categorization'
            };
        }

        return {
            category: result.category,
            confidence: result.confidence || 0.8,
            reasoning: result.reasoning || 'AI-powered categorization'
        };

    } catch (error) {
        console.error('OpenAI categorization error:', error);
        // Fallback to keyword-based categorization
        return categorizeByKeywords(description, merchant);
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { description, amount, merchant, account_type } = req.body;

    if (!description) {
        return res.status(400).json({ error: 'Description is required' });
    }

    // Check if OpenAI API key is configured
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
        // Fallback to keyword-based categorization
        return res.json(categorizeByKeywords(description, merchant));
    }

    try {
        // Use OpenAI to categorize
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: `You are a financial categorization assistant. Categorize transactions into one of these categories:
- Food & Dining (restaurants, groceries, cafes)
- Transportation (gas, parking, taxis, public transport)
- Shopping (retail stores, online shopping)
- Bills & Utilities (electricity, water, internet, phone)
- Rent (rental payments)
- Child Care (daycare, babysitter, nanny, standing orders for childcare)
- Credit Card Payment (payments to credit card companies like Max)
- Bank Fees (bank commissions and fees)
- Savings Withdrawal (withdrawals from savings accounts like Phoenix)
- Healthcare (doctor, pharmacy, medical)
- Entertainment (movies, streaming, events)
- Education (courses, books, training)
- Travel (flights, hotels, vacation)
- Salary (income from employment)
- Investment Returns (dividends, interest)
- Other

Respond with JSON: {"category": "Category Name", "confidence": 0.0-1.0, "reasoning": "brief explanation"}`
                    },
                    {
                        role: 'user',
                        content: `Categorize this transaction:
Description: ${description}
${merchant ? `Merchant: ${merchant}` : ''}
${amount ? `Amount: ${amount} ILS` : ''}
${account_type ? `Account: ${account_type}` : ''}`
                    }
                ],
                temperature: 0.3,
                max_tokens: 150
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        // Parse JSON response
        let result;
        try {
            result = JSON.parse(content);
        } catch (e) {
            // If not valid JSON, try to extract category name
            const categoryMatch = content.match(/category["\s:]+["']?([^"'\n]+)["']?/i);
            result = {
                category: categoryMatch ? categoryMatch[1] : 'Other',
                confidence: 0.7,
                reasoning: 'AI categorization'
            };
        }

        return res.json({
            category: result.category,
            confidence: result.confidence || 0.8,
            reasoning: result.reasoning || 'AI-powered categorization'
        });

    } catch (error) {
        console.error('OpenAI categorization error:', error);
        // Fallback to keyword-based categorization
        return res.json(categorizeByKeywords(description, merchant));
    }
}

function categorizeByKeywords(description, merchant) {
    // HARDCODED: Check for Max credit card transactions first (most common pattern)
    if (description && (
        description.includes('מקס איט') || 
        description.includes('מקס') ||
        description.toLowerCase().includes('מקס') ||
        description.toLowerCase().includes('max')
    )) {
        return {
            category: 'Credit Card Payment',
            confidence: 0.9,
            reasoning: 'Max credit card transaction (hardcoded pattern)'
        };
    }
    
    const desc = (description + ' ' + (merchant || '')).toLowerCase();
    
    // First, check for recipient-based categorization (for transfers)
    // Pattern: "העברה אל: [name]" or "העברה אל [name]" or "העברה ל [name]"
    // Improved pattern: capture Hebrew characters and spaces before account numbers
    const transferMatch = desc.match(/העברה\s+(?:אל|ל|מאת)[:\s]+([א-ת\s]+?)(?:\d|$)/);
    if (transferMatch) {
        const recipient = transferMatch[1].trim();
        
        // Rent - Johanna/Yana Saiba (גואנה סאיבה)
        if (recipient.includes('גואנה') || recipient.includes('סאיבה') || recipient.includes('יאנה') || recipient.includes('johanna') || recipient.includes('yana') || recipient.includes('saiba')) {
            return {
                category: 'Rent',
                confidence: 0.95,
                reasoning: 'Transfer to Johanna (Rent)'
            };
        }
        
        // Child Care - Shimrit Peretz (שמרית פרץ) - 3 small kids
        if (recipient.includes('שמרית') || recipient.includes('פרץ') || recipient.includes('shimrit') || recipient.includes('peretz')) {
            return {
                category: 'Child Care',
                confidence: 0.95,
                reasoning: 'Transfer to Shimrit Peretz (Child care for 3 small kids)'
            };
        }
        
        // Child Care - Yifat Katish/Katiai (יפעת קטיש/קטיעי) - 3 small kids
        // Handle partial matches like "יפעת קט" (truncated)
        if (recipient.includes('יפעת') || recipient.includes('קטיש') || recipient.includes('קטיעי') || 
            (recipient.includes('יפעת') && recipient.includes('קט')) || 
            recipient.includes('yifat') || recipient.includes('katish')) {
            return {
                category: 'Child Care',
                confidence: 0.95,
                reasoning: 'Transfer to Yifat Katish (Child care for 3 small kids)'
            };
        }
        
        // Child Care - Yanai Shabat (ינאי שבת) - pocket money for Yanai
        if (recipient.includes('ינאי') && (recipient.includes('שבת') || recipient.includes('shabat'))) {
            return {
                category: 'Child Care',
                confidence: 0.95,
                reasoning: 'Transfer to Yanai Shabat (Pocket money for Yanai)'
            };
        }
        
        // Building Fees - Building Committee (ועד צייטלין) or Yanai Teichman
        if (recipient.includes('ועד') || recipient.includes('צייטלין') || (recipient.includes('ינאי') && recipient.includes('טייכמן'))) {
            return {
                category: 'Bills & Utilities',
                confidence: 0.95,
                reasoning: 'Transfer to Building Committee (Building fees)'
            };
        }
        
        // Parking - Menachem (עודליאב מנחם, שרונה קאופמן, or שרלאוב מנחם)
        if (recipient.includes('מנחם') || recipient.includes('שרלאוב') || recipient.includes('שרונה') || recipient.includes('קאופמן') || recipient.includes('עודליאב') || recipient.includes('menachem') || recipient.includes('sherla') || recipient.includes('parking') || recipient.includes('חניה')) {
            return {
                category: 'Transportation',
                confidence: 0.95,
                reasoning: 'Transfer for parking fees'
            };
        }
        
        // Max transfers (credits FROM Max) - Credit Card Payment
        if (recipient.includes('מקס איט') || recipient.includes('מקס') || recipient.includes('max')) {
            return {
                category: 'Credit Card Payment',
                confidence: 0.95,
                reasoning: 'Transfer from/to Max (Credit card)'
            };
        }
        
        // Other Yanai transfers - Child Care
        if (recipient.includes('ינאי') && !recipient.includes('טייכמן')) {
            return {
                category: 'Child Care',
                confidence: 0.9,
                reasoning: 'Transfer to Yanai (Child care)'
            };
        }
    }
    
    const keywordMap = {
        'Food & Dining': ['restaurant', 'cafe', 'food', 'grocery', 'supermarket', 'מסעדה', 'מזון', 'קפה'],
        'Transportation': ['gas', 'fuel', 'taxi', 'uber', 'parking', 'דלק', 'חניה', 'תחבורה'],
        'Shopping': ['store', 'shop', 'purchase', 'buy', 'קנייה', 'חנות'],
        'Bills & Utilities': ['electric', 'water', 'internet', 'phone', 'utility', 'חשבון', 'חשמל', 'מים', 'דירה'],
        'Rent': ['rent', 'lease', 'שכירות'],
        'Child Care': ['childcare', 'babysitter', 'nanny', 'daycare', 'גן', 'מטפלת', 'הוראת קבע'],
        'Credit Card Payment': ['max', 'credit card', 'מקס איט', 'card payment', 'מקס איט פיננ'],
        'Bank Fees': ['fee', 'commission', 'עמל', 'bank fee', 'עמלה'],
        'Savings Withdrawal': ['phoenix', 'savings withdrawal', 'הפניקס', 'withdrawal', 'הפניקס חברה'],
        'Healthcare': ['doctor', 'pharmacy', 'medicine', 'medical', 'רופא', 'תרופה', 'בית מרקחת'],
        'Entertainment': ['movie', 'cinema', 'netflix', 'streaming', 'entertainment'],
        'Education': ['course', 'education', 'school', 'learning', 'חינוך'],
        'Travel': ['flight', 'hotel', 'travel', 'vacation', 'נסיעה'],
        'Salary': ['salary', 'wage', 'paycheck', 'משכורת', 'העברת משכורת'],
        'Investment Returns': ['dividend', 'interest', 'return', 'yield']
    };

    for (const [category, keywords] of Object.entries(keywordMap)) {
        if (keywords.some(keyword => desc.includes(keyword))) {
            return {
                category,
                confidence: 0.7,
                reasoning: 'Keyword-based categorization'
            };
        }
    }

    return {
        category: 'Other',
        confidence: 0.5,
        reasoning: 'No matching keywords found'
    };
}

