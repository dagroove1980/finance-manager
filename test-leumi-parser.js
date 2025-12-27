// Test script for Leumi HTML parser
const fs = require('fs');
const path = require('path');

// Read the actual file
const filePath = '/Users/david.scebat/Downloads/תנועות בחשבון 27_12_2025.xls';
const fileContent = fs.readFileSync(filePath, 'utf-8');

console.log('File size:', fileContent.length, 'bytes');
console.log('First 500 chars:', fileContent.substring(0, 500));
console.log('\n---\n');

// Copy the parseLeumiHTML function
function parseLeumiHTML(htmlContent) {
    const transactions = [];
    
    // Extract table rows
    const rowMatches = htmlContent.match(/<tr[^>]*>(.*?)<\/tr>/gis) || [];
    console.log('Found', rowMatches.length, 'table rows');
    
    // Find header row to identify column positions
    let dateIdx = -1, descriptionIdx = -1, debitIdx = -1, creditIdx = -1, referenceIdx = -1;
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
        
        console.log(`Row ${i}: First cell = "${firstCellText}", Cells count = ${cells.length}`);
        
        // Check if this is the header row (contains Hebrew column names)
        if (firstCellText === 'תאריך' || firstCellText.includes('תאריך')) {
            console.log(`Found header row at index ${i}`);
            // Find column indices
            for (let j = 0; j < cells.length; j++) {
                const cellText = cells[j]
                    .replace(/<[^>]+>/g, '')
                    .toLowerCase()
                    .trim();
                
                console.log(`  Column ${j}: "${cellText}"`);
                
                if (cellText === 'תאריך' && !cellText.includes('ערך')) {
                    // Use תאריך (date) not תאריך ערך (value date)
                    if (dateIdx === -1) {
                        dateIdx = j;
                        console.log(`    -> dateIdx = ${j}`);
                    }
                } else if (cellText === 'תיאור' || cellText.includes('תיאור') || cellText.includes('description')) {
                    descriptionIdx = j;
                    console.log(`    -> descriptionIdx = ${j}`);
                } else if (cellText === 'בחובה' || cellText.includes('חובה') || cellText.includes('debit')) {
                    debitIdx = j;
                    console.log(`    -> debitIdx = ${j}`);
                } else if (cellText === 'בזכות' || cellText.includes('זכות') || cellText.includes('credit')) {
                    creditIdx = j;
                    console.log(`    -> creditIdx = ${j}`);
                } else if (cellText === 'אסמכתא' || cellText.includes('אסמכתא') || cellText.includes('reference')) {
                    referenceIdx = j;
                    console.log(`    -> referenceIdx = ${j}`);
                }
            }
            dataStartIdx = i + 1;
            break;
        }
    }
    
    // If header not found, use default positions (common Leumi structure)
    if (dateIdx === -1) {
        console.log('Header not found, using default positions');
        dateIdx = 0;
        descriptionIdx = 2;
        debitIdx = 4;
        creditIdx = 5;
        referenceIdx = 3;
        // Find first data row
        for (let i = 0; i < Math.min(10, rowMatches.length); i++) {
            const cells = rowMatches[i].match(/<td[^>]*>(.*?)<\/td>/gis) || [];
            if (cells.length >= 6) {
                const firstCell = cells[0].replace(/<[^>]+>/g, '').trim();
                console.log(`Checking row ${i} for date pattern: "${firstCell}"`);
                // Check if it looks like a date (DD/MM/YYYY)
                if (firstCell.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                    dataStartIdx = i;
                    console.log(`Found data start at row ${i}`);
                    break;
                }
            }
        }
    }
    
    console.log('\nColumn indices:', { dateIdx, descriptionIdx, debitIdx, creditIdx, referenceIdx });
    console.log('Data starts at row:', dataStartIdx);
    console.log('\n---\n');
    
    // Extract text helper function - properly handle Hebrew
    const extractText = (cell) => {
        let text = cell
            .replace(/<[^>]+>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ')
            .replace(/&#8206;/g, '') // Remove RTL marks
            .replace(/&#8207;/g, '')
            .replace(/&#8205;/g, '') // Remove zero-width joiner
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
        
        // Clean up any remaining HTML entities
        text = text.replace(/&#\d+;/g, '');
        
        return text;
    };
    
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
        const slashMatch = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (slashMatch) {
            const [, day, month, year] = slashMatch;
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
        
        return null;
    }
    
    // Parse data rows - show first 5 transactions
    let parsedCount = 0;
    for (let i = dataStartIdx; i < Math.min(dataStartIdx + 10, rowMatches.length); i++) {
        const row = rowMatches[i];
        const cells = row.match(/<td[^>]*>(.*?)<\/td>/gis) || [];
        
        if (cells.length < 4) {
            console.log(`Row ${i}: Skipping - only ${cells.length} cells`);
            continue;
        }
        
        const dateStr = dateIdx >= 0 && dateIdx < cells.length ? extractText(cells[dateIdx]) : '';
        const description = descriptionIdx >= 0 && descriptionIdx < cells.length ? extractText(cells[descriptionIdx]) : '';
        const extendedDesc = cells.length > 7 ? extractText(cells[7]) : ''; // Column 7: תאור מורחב
        const debitStr = debitIdx >= 0 && debitIdx < cells.length ? extractText(cells[debitIdx]) : '';
        const creditStr = creditIdx >= 0 && creditIdx < cells.length ? extractText(cells[creditIdx]) : '';
        const reference = referenceIdx >= 0 && referenceIdx < cells.length ? extractText(cells[referenceIdx]) : '';
        
        console.log(`\nRow ${i}:`);
        console.log(`  Raw cells count: ${cells.length}`);
        console.log(`  Date (idx ${dateIdx}): "${dateStr}"`);
        console.log(`  Description (idx ${descriptionIdx}): "${description}"`);
        console.log(`  Extended Desc (idx 7): "${extendedDesc}"`);
        console.log(`  Raw cell 2 (first 200 chars): "${cells[2].substring(0, 200)}"`);
        console.log(`  Debit (idx ${debitIdx}): "${debitStr}"`);
        console.log(`  Credit (idx ${creditIdx}): "${creditStr}"`);
        console.log(`  Reference (idx ${referenceIdx}): "${reference}"`);
        
        // Parse amounts
        const debitAmount = parseFloat(debitStr.replace(/[₪,שח\s-]/g, '')) || 0;
        const creditAmount = parseFloat(creditStr.replace(/[₪,שח\s-]/g, '')) || 0;
        const amount = creditAmount > 0 ? creditAmount : -debitAmount;
        
        // Skip if no valid data
        if (!dateStr || !description || (debitAmount === 0 && creditAmount === 0)) {
            console.log(`  -> Skipping: date="${dateStr}", desc="${description}", amounts=${debitAmount}/${creditAmount}`);
            continue;
        }
        
        // Skip header-like rows
        if (dateStr === 'תאריך' || description === 'תיאור' || dateStr.toLowerCase().includes('תאריך')) {
            console.log(`  -> Skipping header row`);
            continue;
        }
        
        // Parse date
        const date = parseLeumiDate(dateStr);
        if (!date) {
            console.log(`  -> Skipping: Could not parse date: "${dateStr}"`);
            continue;
        }
        
        parsedCount++;
        console.log(`  -> PARSED: date=${date}, amount=${amount}, description="${description.substring(0, 30)}"`);
        
        transactions.push({
            transaction_date: date,
            description: description.replace(/\s+/g, ' ').replace(/[\u200B-\u200D\uFEFF]/g, '').trim(),
            amount: amount,
            reference_number: reference,
            import_id: `leumi_${date}_${reference}_${Math.abs(amount)}_${i}`
        });
        
        if (parsedCount >= 5) break;
    }
    
    console.log(`\n\nTotal parsed: ${transactions.length} transactions`);
    console.log('\nFirst transaction:', JSON.stringify(transactions[0], null, 2));
    
    return transactions;
}

// Run the test
const result = parseLeumiHTML(fileContent);
console.log(`\n\nFinal result: ${result.length} transactions parsed`);

