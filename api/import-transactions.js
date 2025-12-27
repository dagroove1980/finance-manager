// Vercel serverless function for importing transactions from CSV
// Supports Leumi, Max, Phoenix, and generic CSV formats

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { account_id, import_source, csv_data, file_type } = req.body;

    if (!account_id || !import_source || !csv_data) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // csv_data is already converted to CSV format from XLSX if needed
        const transactions = parseCSV(csv_data, import_source);
        
        // Extract metadata if present (for IBI imports)
        let metadata = null;
        if (transactions._metadata) {
            metadata = transactions._metadata;
            delete transactions._metadata; // Remove metadata from transactions array
        }
        
        // Categorize and translate transactions using AI
        const categorizedTransactions = await Promise.all(
            transactions.map(async (tx) => {
                // Store original description
                const originalDescription = tx.description;
                
                // Translate Hebrew to English if needed
                let englishDescription = originalDescription;
                const hasHebrew = /[\u0590-\u05FF]/.test(originalDescription);
                
                if (hasHebrew && process.env.OPENAI_API_KEY) {
                    try {
                        const translateResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                            },
                            body: JSON.stringify({
                                model: 'gpt-3.5-turbo',
                                messages: [
                                    {
                                        role: 'system',
                                        content: 'You are a translator. Translate Hebrew bank transaction descriptions to clear English. Keep it concise and preserve important details like account numbers, names, and transaction types. Return only the translation, no explanations.'
                                    },
                                    {
                                        role: 'user',
                                        content: `Translate this Hebrew bank transaction description to English: ${originalDescription}`
                                    }
                                ],
                                temperature: 0.3,
                                max_tokens: 150
                            })
                        });
                        
                        if (translateResponse.ok) {
                            const translateData = await translateResponse.json();
                            const translated = translateData.choices[0]?.message?.content?.trim();
                            if (translated && translated !== originalDescription) {
                                englishDescription = translated;
                            }
                        }
                    } catch (error) {
                        console.error('Translation error:', error);
                        // Fallback to original description
                    }
                }
                
                // Categorize transaction directly (no HTTP call needed - both functions in same codebase)
                // Import the categorization function directly
                const { categorizeTransaction } = await import('./categorize-transaction.js');
                
                try {
                    // Call categorization function directly
                    const categoryResult = await categorizeTransaction({
                        description: originalDescription,
                        amount: tx.amount,
                        merchant: tx.merchant,
                        account_type: import_source
                    });
                    
                    tx.ai_category_suggestion = categoryResult.category;
                    tx.ai_confidence = categoryResult.confidence || 0.7;
                } catch (error) {
                    console.error('Categorization error:', error);
                    // Fallback: use keyword-based categorization directly
                    const desc = (originalDescription + ' ' + (tx.merchant || '')).toLowerCase();
                    
                    // Transfer pattern matching
                    const transferMatch = desc.match(/העברה\s+(?:אל|ל|מאת)[:\s]+([א-ת\s]+?)(?:\d|$)/);
                    if (transferMatch) {
                        const recipient = transferMatch[1].trim();
                        if (recipient.includes('גואנה') || recipient.includes('סאיבה')) {
                            tx.ai_category_suggestion = 'Rent';
                        } else if (recipient.includes('שמרית') || recipient.includes('פרץ')) {
                            tx.ai_category_suggestion = 'Child Care';
                        } else if (recipient.includes('יפעת') || recipient.includes('קטיש') || recipient.includes('קטיעי') || (recipient.includes('יפעת') && recipient.includes('קט'))) {
                            tx.ai_category_suggestion = 'Child Care';
                        } else if (recipient.includes('ינאי') && recipient.includes('שבת')) {
                            tx.ai_category_suggestion = 'Child Care';
                        } else if (recipient.includes('ועד') || recipient.includes('צייטלין')) {
                            tx.ai_category_suggestion = 'Bills & Utilities';
                        } else {
                            tx.ai_category_suggestion = 'Uncategorized';
                        }
                    } else if (desc.includes('מקס איט') || desc.includes('max')) {
                        tx.ai_category_suggestion = 'Credit Card Payment';
                    } else {
                        tx.ai_category_suggestion = 'Uncategorized';
                    }
                    tx.ai_confidence = 0.7;
                }
                
                // Keep original Hebrew description (don't replace with translation)
                // Translation is available in notes if needed, but description stays in Hebrew
                tx.description = originalDescription;
                if (hasHebrew && englishDescription !== originalDescription) {
                    tx.notes = (tx.notes || '') + (tx.notes ? ' | ' : '') + `English: ${englishDescription}`;
                }

                // For IBI imports, keep as investment type with positive amounts
                // For other imports, determine type based on amount
                let transactionType = tx.type;
                if (!transactionType) {
                    if (import_source === 'ibi_csv') {
                        transactionType = 'investment'; // Equity grants are investments
                    } else {
                        transactionType = tx.amount >= 0 ? 'income' : 'expense';
                    }
                }
                
                return {
                    ...tx,
                    account_id,
                    import_source,
                    type: transactionType,
                    amount: Math.abs(tx.amount) // Always store as positive, type determines if it's income/expense/investment
                };
            })
        );
        
        // Reattach metadata for account update
        if (metadata) {
            categorizedTransactions._metadata = metadata;
        }

        // Insert into Supabase
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return res.status(500).json({ error: 'Supabase credentials not configured' });
        }

        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseKey);

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

        // Map category names to category IDs
        categorizedTransactions.forEach(tx => {
            if (tx.ai_category_suggestion) {
                const categoryName = tx.ai_category_suggestion.toLowerCase();
                tx.category_id = categoryMap[categoryName] || null;
            }
        });

        // Insert transactions (skip duplicates, merge with existing)
        // Using upsert with ignoreDuplicates: true to skip existing transactions
        // This ensures re-importing the same file won't create duplicates or overwrite manually edited transactions
        const { data, error } = await supabase
            .from('transactions')
            .upsert(categorizedTransactions, {
                onConflict: 'account_id,import_id',
                ignoreDuplicates: true  // Skip duplicates, don't update existing
            })
            .select();

        if (error) {
            console.error('Supabase insert error:', error);
            return res.status(500).json({ error: 'Failed to insert transactions', details: error.message });
        }

        // Update account's last_import_date and balance
        if (data && data.length > 0) {
            const today = new Date().toISOString().split('T')[0];
            const updateData = { last_import_date: today };
            
            // For IBI imports, update balance with total estimated value
            if (import_source === 'ibi_csv' && categorizedTransactions._metadata) {
                const metadata = categorizedTransactions._metadata;
                updateData.balance = metadata.totalEstimatedValue;
                
                // Store vested shares info in metadata
                updateData.metadata = {
                    total_vested_shares: metadata.totalSellableShares,
                    grant_count: metadata.grantCount,
                    last_updated: today
                };
            }
            
            // For Leumi imports, update balance with latest balance from file
            // Also update last_import_date to the date of the most recent transaction
            if (import_source === 'leumi_csv' && categorizedTransactions._metadata && categorizedTransactions._metadata.latestBalance !== undefined) {
                updateData.balance = categorizedTransactions._metadata.latestBalance;
                // Find the most recent transaction date
                if (data && data.length > 0) {
                    const sortedByDate = [...data].sort((a, b) => 
                        new Date(b.transaction_date) - new Date(a.transaction_date)
                    );
                    if (sortedByDate[0] && sortedByDate[0].transaction_date) {
                        updateData.last_import_date = sortedByDate[0].transaction_date;
                    }
                }
            }
            
            await supabase
                .from('accounts')
                .update(updateData)
                .eq('id', account_id);
        }

        return res.json({
            success: true,
            count: data.length,
            transactions: data
        });

    } catch (error) {
        console.error('Import error:', error);
        return res.status(500).json({ error: 'Import failed', details: error.message });
    }
}

function parseCSV(csvData, source) {
    const lines = csvData.split('\n').filter(line => line.trim());
    const transactions = [];

    switch (source) {
        case 'leumi_csv':
            return parseLeumiCSV(lines);
        case 'max_csv':
            return parseMaxCSV(lines);
        case 'phoenix_csv':
            return parsePhoenixCSV(lines);
        case 'ibi_csv':
            return parseIBICSV(lines);
        case 'generic_csv':
        default:
            return parseGenericCSV(lines);
    }
}

function parseLeumiCSV(lines) {
    // Leumi format can be CSV or HTML (when exported as .xls)
    // Hebrew columns: תאריך (date), תאריך ערך (value date), תיאור (description), סכום (amount), יתרה (balance), אסמכתא (reference)
    
    const transactions = [];
    // Join all lines back together (HTML files split by \n still need to be rejoined)
    const csvText = lines.join('\n');
    
    // Check if it's HTML format (common for Leumi .xls exports)
    // HTML files will have these markers even after splitting/joining
    if (csvText.includes('<table') || csvText.includes('<tr') || csvText.includes('<HTML') || csvText.includes('תאריך')) {
        return parseLeumiHTML(csvText);
    }
    
    // Original CSV parsing
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        // Handle CSV with potential commas in description
        const parts = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
        
        if (parts.length < 3) continue;
        
        const date = parts[0].replace(/"/g, '').trim();
        const description = parts[1].replace(/"/g, '').trim();
        const amount = parseFloat(parts[2].replace(/"/g, '').replace(/,/g, '').trim());
        const reference = parts[4] ? parts[4].replace(/"/g, '').trim() : '';
        
        if (!date || isNaN(amount)) continue;
        
        transactions.push({
            transaction_date: parseDate(date),
            description,
            amount: -amount, // Leumi shows debits as positive, we store as negative
            reference_number: reference,
            import_id: `leumi_${date}_${reference}_${Math.abs(amount)}`
        });
    }
    
    return transactions;
}

function parseLeumiHTML(htmlContent) {
    // Parse HTML table format from Leumi exports
    // Structure: תאריך (date), תאריך ערך (value date), תיאור (description), אסמכתא (reference), בחובה (debit), בזכות (credit), היתרה בש"ח (balance)
    const transactions = [];
    let latestBalance = null; // Track the most recent balance (first transaction is newest)
    
    // Extract table rows
    const rowMatches = htmlContent.match(/<tr[^>]*>(.*?)<\/tr>/gis) || [];
    
    // Find header row to identify column positions
    let dateIdx = -1, descriptionIdx = -1, extendedDescIdx = -1, debitIdx = -1, creditIdx = -1, referenceIdx = -1, balanceIdx = -1;
    let dataStartIdx = 0;
    
    for (let i = 0; i < Math.min(20, rowMatches.length); i++) {
        const row = rowMatches[i];
        const cells = row.match(/<td[^>]*>(.*?)<\/td>/gis) || [];
        
        if (cells.length < 4) continue;
        
        // Extract text from first cell to check if it's header
        const firstCellText = cells[0]
            .replace(/<[^>]+>/g, '')
            .toLowerCase()
            .trim();
        
        // Check if this is the header row (contains Hebrew column names)
        if (firstCellText === 'תאריך' || firstCellText.includes('תאריך')) {
            // Find column indices
            for (let j = 0; j < cells.length; j++) {
                const cellText = cells[j]
                    .replace(/<[^>]+>/g, '')
                    .toLowerCase()
                    .trim();
                
                if (cellText === 'תאריך' && !cellText.includes('ערך')) {
                    // Use תאריך (date) not תאריך ערך (value date)
                    if (dateIdx === -1) {
                        dateIdx = j;
                    }
                } else if (cellText === 'תיאור' || cellText.includes('תיאור') || cellText.includes('description')) descriptionIdx = j;
                else if (cellText.includes('תאור מורחב') || cellText.includes('extended') || cellText.includes('מורחב')) extendedDescIdx = j;
                else if (cellText === 'בחובה' || cellText.includes('חובה') || cellText.includes('debit')) debitIdx = j;
                else if (cellText === 'בזכות' || cellText.includes('זכות') || cellText.includes('credit')) creditIdx = j;
                else if (cellText === 'אסמכתא' || cellText.includes('אסמכתא') || cellText.includes('reference')) referenceIdx = j;
                else if (cellText.includes('יתרה') || cellText.includes('balance')) balanceIdx = j;
            }
            dataStartIdx = i + 1;
            break;
        }
    }
    
    // If header not found, use default positions (common Leumi structure)
    if (dateIdx === -1) {
        dateIdx = 0;
        descriptionIdx = 2;
        extendedDescIdx = 7; // תאור מורחב (extended description)
        debitIdx = 4;
        creditIdx = 5;
        referenceIdx = 3;
        balanceIdx = 6;
        // Find first data row
        for (let i = 0; i < Math.min(10, rowMatches.length); i++) {
            const cells = rowMatches[i].match(/<td[^>]*>(.*?)<\/td>/gis) || [];
            if (cells.length >= 6) {
                const firstCell = cells[0].replace(/<[^>]+>/g, '').trim();
                // Check if it looks like a date (DD/MM/YYYY)
                if (firstCell.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                    dataStartIdx = i;
                    break;
                }
            }
        }
    }
    
    // Extract text helper function - properly handle Hebrew
    const extractText = (cell) => {
        if (!cell) return '';
        
        let text = cell
            .replace(/<[^>]+>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ')
            .replace(/&#8206;/g, '') // Remove RTL marks (LTR mark)
            .replace(/&#8207;/g, '') // Remove RTL marks (RTL mark)
            .replace(/&#8205;/g, '') // Remove zero-width joiner
            .replace(/&#8204;/g, '') // Remove zero-width non-joiner
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
        
        // Clean up HTML entities - convert numeric entities to characters
        text = text.replace(/&#(\d+);/g, (match, code) => {
            const num = parseInt(code, 10);
            // Convert all valid Unicode characters (including Hebrew 0x0590-0x05FF)
            // Also preserve common punctuation and symbols (32-126, 160-255)
            if ((num >= 32 && num <= 126) || // ASCII printable
                (num >= 160 && num <= 255) || // Latin-1 supplement
                (num >= 0x0590 && num <= 0x05FF) || // Hebrew
                (num >= 0x2000 && num <= 0x206F) || // General punctuation
                (num >= 0x20A0 && num <= 0x20CF)) { // Currency symbols
                return String.fromCharCode(num);
            }
            return ''; // Remove invalid/control characters
        });
        
        // Also handle named entities that might have been missed
        text = text.replace(/&nbsp;/g, ' ')
                   .replace(/&amp;/g, '&')
                   .replace(/&lt;/g, '<')
                   .replace(/&gt;/g, '>')
                   .replace(/&quot;/g, '"')
                   .replace(/&apos;/g, "'");
        
        // Remove any remaining control characters except spaces
        text = text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
        
        return text;
    };
    
    // Parse data rows
    for (let i = dataStartIdx; i < rowMatches.length; i++) {
        const row = rowMatches[i];
        const cells = row.match(/<td[^>]*>(.*?)<\/td>/gis) || [];
        
        if (cells.length < 4) continue;
        
        const dateStr = dateIdx >= 0 && dateIdx < cells.length ? extractText(cells[dateIdx]) : '';
        const shortDescription = descriptionIdx >= 0 && descriptionIdx < cells.length ? extractText(cells[descriptionIdx]) : '';
        const extendedDescription = extendedDescIdx >= 0 && extendedDescIdx < cells.length ? extractText(cells[extendedDescIdx]) : '';
        // Use extended description if available (has recipient info), otherwise use short description
        const description = extendedDescription && extendedDescription.trim() ? extendedDescription : shortDescription;
        const debitStr = debitIdx >= 0 && debitIdx < cells.length ? extractText(cells[debitIdx]) : '';
        const creditStr = creditIdx >= 0 && creditIdx < cells.length ? extractText(cells[creditIdx]) : '';
        const reference = referenceIdx >= 0 && referenceIdx < cells.length ? extractText(cells[referenceIdx]) : '';
        const balanceStr = balanceIdx >= 0 && balanceIdx < cells.length ? extractText(cells[balanceIdx]) : '';
        
        // Parse amounts - remove currency symbols, commas, and spaces
        const debitAmount = parseFloat(debitStr.replace(/[₪,שח\s-]/g, '')) || 0;
        const creditAmount = parseFloat(creditStr.replace(/[₪,שח\s-]/g, '')) || 0;
        
        // Determine amount: debit is negative (expense), credit is positive (income)
        const amount = creditAmount > 0 ? creditAmount : -debitAmount;
        
        // Skip if no valid data
        if (!dateStr || !description || (debitAmount === 0 && creditAmount === 0)) continue;
        
        // Skip header-like rows
        if (dateStr === 'תאריך' || description === 'תיאור' || dateStr.toLowerCase().includes('תאריך')) continue;
        
        // Parse date (Hebrew format: DD/MM/YYYY)
        const date = parseLeumiDate(dateStr);
        
        // Skip if date parsing failed
        if (!date) {
            console.warn(`Skipping transaction - could not parse date: "${dateStr}"`);
            continue;
        }
        
        // Clean description - remove extra whitespace and normalize
        const cleanDescription = description
            .replace(/\s+/g, ' ')
            .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
            .trim();
        
        // Parse balance (remove commas, currency symbols)
        let balance = null;
        if (balanceStr) {
            const parsedBalance = parseFloat(balanceStr.replace(/[₪,שח\s-]/g, ''));
            if (!isNaN(parsedBalance)) {
                balance = parsedBalance;
                // Store the first (most recent) balance we encounter
                if (latestBalance === null) {
                    latestBalance = balance;
                }
            }
        }
        
        // Generate consistent import_id: date + reference + amount (no row index for stability)
        // This ensures same transaction always gets same ID, even if file structure changes
        const importId = `leumi_${date}_${reference || 'no_ref'}_${Math.abs(amount).toFixed(2)}`;
        
        transactions.push({
            transaction_date: date,
            description: cleanDescription,
            amount: amount,
            reference_number: reference,
            import_id: importId
        });
    }
    
    // Attach metadata with latest balance for account update
    if (latestBalance !== null) {
        transactions._metadata = { latestBalance };
    }
    
    return transactions;
}

function parseLeumiDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') {
        return null;
    }
    
    // Remove HTML entities and clean up
    let cleaned = dateStr
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#8206;/g, '')
        .replace(/&#8207;/g, '')
        .replace(/&#8205;/g, '')
        .trim();
    
    // Try DD/MM/YYYY format first (most common in Leumi exports)
    // Match pattern: DD/MM/YYYY where DD and MM can be 1-2 digits
    const slashMatch = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
        const [, day, month, year] = slashMatch;
        const d = parseInt(day, 10);
        const m = parseInt(month, 10);
        const y = parseInt(year, 10);
        
        // Validate date ranges
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 2000 && y <= 2100) {
            // Validate actual date (e.g., not Feb 30)
            const dateObj = new Date(y, m - 1, d);
            if (dateObj.getFullYear() === y && dateObj.getMonth() === m - 1 && dateObj.getDate() === d) {
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
        }
    }
    
    // Try DD.MM.YYYY format
    const dotMatch = cleaned.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (dotMatch) {
        const [, day, month, year] = dotMatch;
        const d = parseInt(day, 10);
        const m = parseInt(month, 10);
        const y = parseInt(year, 10);
        
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 2000 && y <= 2100) {
            const dateObj = new Date(y, m - 1, d);
            if (dateObj.getFullYear() === y && dateObj.getMonth() === m - 1 && dateObj.getDate() === d) {
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
        }
    }
    
    // Try to find date pattern anywhere in the string (more flexible)
    const anyDateMatch = cleaned.match(/(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{4})/);
    if (anyDateMatch) {
        const [, day, month, year] = anyDateMatch;
        const d = parseInt(day, 10);
        const m = parseInt(month, 10);
        const y = parseInt(year, 10);
        
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 2000 && y <= 2100) {
            const dateObj = new Date(y, m - 1, d);
            if (dateObj.getFullYear() === y && dateObj.getMonth() === m - 1 && dateObj.getDate() === d) {
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
        }
    }
    
    // Return null if we can't parse (will skip transaction)
    console.warn(`Could not parse date from: "${dateStr}" (cleaned: "${cleaned}")`);
    return null;
}

function parseMaxCSV(lines) {
    // Max credit card CSV format: Date, Merchant, Amount, Category
    const transactions = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
        
        if (parts.length < 3) continue;
        
        const date = parts[0].replace(/"/g, '').trim();
        const merchant = parts[1].replace(/"/g, '').trim();
        const amount = parseFloat(parts[2].replace(/"/g, '').replace(/,/g, '').trim());
        
        transactions.push({
            transaction_date: parseDate(date),
            description: merchant,
            merchant,
            amount: -amount, // Expenses are negative
            import_id: `max_${date}_${merchant}_${Math.abs(amount)}`
        });
    }
    
    return transactions;
}

function parsePhoenixCSV(lines) {
    // Phoenix savings CSV format: Date, Description, Amount, Balance
    const transactions = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
        
        if (parts.length < 3) continue;
        
        const date = parts[0].replace(/"/g, '').trim();
        const description = parts[1].replace(/"/g, '').trim();
        const amount = parseFloat(parts[2].replace(/"/g, '').replace(/,/g, '').trim());
        
        transactions.push({
            transaction_date: parseDate(date),
            description,
            amount,
            import_id: `phoenix_${date}_${description}_${Math.abs(amount)}`
        });
    }
    
    return transactions;
}

function parseIBICSV(lines) {
    // IBI / Fiverr vested CSV format: Portfolio view with grants
    // Columns: Grant Name, Grant Date, Granted, Sellable, Next Vesting, Estimated Value, Open Orders
    const transactions = [];
    let totalEstimatedValue = 0;
    let totalSellableShares = 0;
    
    // Find header row (usually first row, but could be after "RS/RSU" section header)
    let headerRow = 0;
    for (let i = 0; i < Math.min(10, lines.length); i++) {
        const line = lines[i].toLowerCase();
        if ((line.includes('grant name') || line.includes('grant date')) && 
            (line.includes('granted') || line.includes('sellable'))) {
            headerRow = i;
            break;
        }
    }
    
    // Parse column indices from header
    const header = lines[headerRow].toLowerCase();
    const headerParts = parseCSVLine(lines[headerRow]);
    
    // Find column indices
    const grantNameIdx = findColumnIndexInArray(headerParts, ['grant name', 'grant']);
    const grantDateIdx = findColumnIndexInArray(headerParts, ['grant date', 'date']);
    const grantedIdx = findColumnIndexInArray(headerParts, ['granted', 'total']);
    const sellableIdx = findColumnIndexInArray(headerParts, ['sellable', 'available']);
    const nextVestingIdx = findColumnIndexInArray(headerParts, ['next vesting', 'vesting', 'next']);
    const estimatedValueIdx = findColumnIndexInArray(headerParts, ['estimated value', 'value', 'estimated']);
    
    // Process data rows
    for (let i = headerRow + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Skip section headers or empty rows
        if (line.toLowerCase().includes('rs/rsu') || line.toLowerCase().includes('portfolio')) {
            continue;
        }
        
        const parts = parseCSVLine(line);
        
        if (parts.length < 3) continue;
        
        // Extract values, handling various formats
        const grantName = (parts[grantNameIdx] || '').replace(/"/g, '').trim();
        const grantDateStr = (parts[grantDateIdx] || '').replace(/"/g, '').trim();
        const grantedStr = (parts[grantedIdx] || '0').replace(/"/g, '').replace(/,/g, '').trim();
        const sellableStr = (parts[sellableIdx] || '0').replace(/"/g, '').replace(/,/g, '').trim();
        const nextVesting = (parts[nextVestingIdx] || '').replace(/"/g, '').trim();
        const estimatedValueStr = (parts[estimatedValueIdx] || '0').replace(/"/g, '').replace(/,/g, '').trim();
        
        // Parse numbers
        const granted = parseFloat(grantedStr) || 0;
        const sellable = parseFloat(sellableStr) || 0;
        const estimatedValue = parseFloat(estimatedValueStr) || 0;
        
        // Skip if no valid grant name or if all values are zero
        if (!grantName || (granted === 0 && sellable === 0 && estimatedValue === 0)) {
            continue;
        }
        
        // Accumulate totals
        totalEstimatedValue += estimatedValue;
        totalSellableShares += sellable;
        
        // Parse grant date
        const grantDate = parseDate(grantDateStr) || grantDateStr || new Date().toISOString().split('T')[0];
        
        // Create transaction for the grant
        const description = `Fiverr Grant ${grantName}${grantDateStr ? ` (Granted: ${grantDateStr})` : ''}`;
        const vestingInfo = nextVesting ? ` | Next Vesting: ${nextVesting}` : ' | Fully Vested';
        const fullDescription = `${description}${vestingInfo}`;
        
        transactions.push({
            transaction_date: grantDate,
            description: fullDescription,
            amount: Math.abs(estimatedValue), // Always positive - these are assets with value
            type: 'investment', // Investment/equity grants are assets
            notes: `Grant: ${grantName}, Granted: ${granted} shares, Sellable (Vested): ${sellable} shares, Next Vesting: ${nextVesting || 'Fully Vested'}, Estimated Value: ${estimatedValue} ILS`,
            import_id: `ibi_grant_${grantName}_${grantDate}_${granted}_${Date.now()}`,
            tags: ['fiverr', 'vesting', 'equity']
        });
    }
    
    // Store totals in metadata for account update
    transactions._metadata = {
        totalEstimatedValue,
        totalSellableShares,
        grantCount: transactions.length
    };
    
    return transactions;
}

// Helper function to find column index in array
function findColumnIndexInArray(headerParts, keywords) {
    for (let i = 0; i < headerParts.length; i++) {
        const col = headerParts[i].toLowerCase().trim().replace(/"/g, '');
        if (keywords.some(keyword => col.includes(keyword))) {
            return i;
        }
    }
    return -1;
}

// Helper function to find column index by name
function findColumnIndex(header, keywords) {
    const headerParts = header.split(',');
    for (let i = 0; i < headerParts.length; i++) {
        const col = headerParts[i].toLowerCase().trim();
        if (keywords.some(keyword => col.includes(keyword))) {
            return i;
        }
    }
    return -1;
}

// Helper function to parse CSV line handling quoted values
function parseCSVLine(line) {
    const parts = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            parts.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    parts.push(current); // Add last part
    
    return parts;
}

function parseGenericCSV(lines) {
    // Generic CSV: assumes Date, Description, Amount format
    const transactions = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
        
        if (parts.length < 3) continue;
        
        const date = parts[0].replace(/"/g, '').trim();
        const description = parts[1].replace(/"/g, '').trim();
        const amount = parseFloat(parts[2].replace(/"/g, '').replace(/,/g, '').trim());
        
        transactions.push({
            transaction_date: parseDate(date),
            description,
            amount,
            import_id: `generic_${date}_${description}_${Math.abs(amount)}`
        });
    }
    
    return transactions;
}

function parseDate(dateString) {
    // Try various date formats
    const formats = [
        /(\d{2})\/(\d{2})\/(\d{4})/,  // DD/MM/YYYY
        /(\d{4})-(\d{2})-(\d{2})/,    // YYYY-MM-DD
        /(\d{2})-(\d{2})-(\d{4})/     // DD-MM-YYYY
    ];
    
    for (const format of formats) {
        const match = dateString.match(format);
        if (match) {
            if (format === formats[0]) {
                // DD/MM/YYYY
                return `${match[3]}-${match[2]}-${match[1]}`;
            } else if (format === formats[1]) {
                // YYYY-MM-DD
                return dateString;
            } else {
                // DD-MM-YYYY
                return `${match[3]}-${match[2]}-${match[1]}`;
            }
        }
    }
    
    // Fallback to current date if parsing fails
    return new Date().toISOString().split('T')[0];
}

