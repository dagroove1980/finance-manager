// Test the complete import flow locally
const fs = require('fs');

// Simulate the API import-transactions.js logic
function extractText(cell) {
    if (!cell) return '';
    
    let text = cell
        .replace(/<[^>]+>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ')
        .replace(/&#8206;/g, '') // Remove RTL marks
        .replace(/&#8207;/g, '')
        .replace(/&#8205;/g, '') // Remove zero-width joiner
        .replace(/&#8204;/g, '') // Remove zero-width non-joiner
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    
    // Clean up HTML entities (but preserve Hebrew characters)
    text = text.replace(/&#(\d+);/g, (match, code) => {
        const num = parseInt(code, 10);
        // Preserve Hebrew Unicode range (0x0590-0x05FF) and common characters
        if (num >= 0x0590 && num <= 0x05FF) {
            return String.fromCharCode(num);
        }
        // Preserve common punctuation and symbols
        if (num >= 32 && num <= 126) {
            return String.fromCharCode(num);
        }
        return ''; // Remove other entities
    });
    
    // Remove any remaining control characters except spaces
    text = text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
    
    return text;
}

function parseLeumiDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    
    let cleaned = dateStr
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#8206;/g, '')
        .replace(/&#8207;/g, '')
        .replace(/&#8205;/g, '')
        .trim();
    
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

function categorizeTransaction(description) {
    const desc = description.toLowerCase();
    
    // Recipient-based categorization
    const transferMatch = desc.match(/העברה\s+(?:אל|ל)[:\s]+([^\d]+?)(?:\s+\d|$)/);
    if (transferMatch) {
        const recipient = transferMatch[1].trim();
        
        if (recipient.includes('גואנה') || recipient.includes('סאיבה')) return 'Rent';
        if (recipient.includes('שמרית') || recipient.includes('פרץ')) return 'Child Care';
        if (recipient.includes('יפעת') || recipient.includes('קטיש') || recipient.includes('קטיעי')) return 'Child Care';
        if (recipient.includes('ינאי') && recipient.includes('שבת')) return 'Child Care';
        if (recipient.includes('ועד') || recipient.includes('צייטלין')) return 'Bills & Utilities';
        if (recipient.includes('מנחם') || recipient.includes('שרלאוב') || recipient.includes('שרונה') || recipient.includes('חניה')) return 'Transportation';
    }
    
    // Keyword-based
    if (desc.includes('מקס איט') || desc.includes('max')) return 'Credit Card Payment';
    if (desc.includes('הפניקס')) return 'Savings Withdrawal';
    if (desc.includes('משכורת') || desc.includes('הפועלים')) return 'Salary';
    if (desc.includes('הוראת קבע')) return 'Child Care';
    if (desc.includes('עמל')) return 'Bank Fees';
    
    return 'Uncategorized';
}

// Read the actual file
const fileContent = fs.readFileSync('/Users/david.scebat/Downloads/תנועות בחשבון 27_12_2025.xls', 'utf-8');

console.log('=== TESTING COMPLETE IMPORT FLOW ===\n');

const rowMatches = fileContent.match(/<tr[^>]*>(.*?)<\/tr>/gis) || [];
let dateIdx = 0, descriptionIdx = 2, extendedDescIdx = 7, debitIdx = 4, creditIdx = 5, referenceIdx = 3;

// Find header
let headerRow = -1;
for (let i = 0; i < Math.min(20, rowMatches.length); i++) {
    const cells = rowMatches[i].match(/<td[^>]*>(.*?)<\/td>/gis) || [];
    const firstCell = extractText(cells[0]);
    if (firstCell === 'תאריך' || firstCell.includes('תאריך')) {
        headerRow = i;
        break;
    }
}

const transactions = [];
const issues = [];

// Parse transactions
for (let i = headerRow + 1; i < rowMatches.length; i++) {
    const cells = rowMatches[i].match(/<td[^>]*>(.*?)<\/td>/gis) || [];
    if (cells.length < 4) continue;
    
    const dateStr = extractText(cells[dateIdx]);
    const shortDesc = extractText(cells[descriptionIdx]);
    const extDesc = extractText(cells[extendedDescIdx]);
    const description = extDesc && extDesc.trim() ? extDesc : shortDesc;
    const debitStr = extractText(cells[debitIdx]);
    const creditStr = extractText(cells[creditIdx]);
    const reference = extractText(cells[referenceIdx]);
    
    if (!dateStr || !description) continue;
    if (dateStr === 'תאריך' || description === 'תיאור') continue;
    
    const date = parseLeumiDate(dateStr);
    if (!date) {
        issues.push(`Row ${i}: Date parse failed: "${dateStr}"`);
        continue;
    }
    
    const debitAmount = parseFloat(debitStr.replace(/[₪,שח\s-]/g, '')) || 0;
    const creditAmount = parseFloat(creditStr.replace(/[₪,שח\s-]/g, '')) || 0;
    const amount = creditAmount > 0 ? creditAmount : -debitAmount;
    
    if (debitAmount === 0 && creditAmount === 0) continue;
    
    const category = categorizeTransaction(description);
    
    transactions.push({
        date,
        description: description.replace(/\s+/g, ' ').replace(/[\u200B-\u200D\uFEFF]/g, '').trim(),
        amount,
        reference,
        category
    });
}

console.log(`Total transactions: ${transactions.length}`);
console.log(`Issues: ${issues.length}\n`);

// Show first 20 transactions with their categories
console.log('=== FIRST 20 TRANSACTIONS ===\n');
transactions.slice(0, 20).forEach((t, idx) => {
    console.log(`${idx + 1}. ${t.date} | ${t.category}`);
    console.log(`   Desc: ${t.description.substring(0, 70)}${t.description.length > 70 ? '...' : ''}`);
    console.log(`   Amount: ${t.amount > 0 ? '+' : ''}₪${Math.abs(t.amount).toFixed(2)}\n`);
});

// Check categorization accuracy
console.log('\n=== CATEGORIZATION SUMMARY ===\n');
const categoryCounts = {};
transactions.forEach(t => {
    categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
});

Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`${cat}: ${count} transactions`);
});

// Check for problematic descriptions
console.log('\n=== CHECKING FOR PROBLEMATIC DESCRIPTIONS ===\n');
const problematic = transactions.filter(t => 
    t.description.includes('"') || 
    t.description.includes('x') && t.description.match(/x{3,}/) ||
    t.description.length < 3
);

if (problematic.length > 0) {
    console.log(`Found ${problematic.length} problematic descriptions:\n`);
    problematic.slice(0, 10).forEach((t, idx) => {
        console.log(`${idx + 1}. ${t.description}`);
    });
} else {
    console.log('No problematic descriptions found!');
}

