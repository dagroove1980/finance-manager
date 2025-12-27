# Leumi Bank Import - Important Patterns & Notes

## File Structure
- **Format**: HTML table (exported as .xls)
- **Columns**: 
  - Column 0: תאריך (Date) - DD/MM/YYYY format
  - Column 1: תאריך ערך (Value Date)
  - Column 2: תיאור (Short Description)
  - Column 3: אסמכתא (Reference Number)
  - Column 4: בחובה (Debit Amount)
  - Column 5: בזכות (Credit Amount)
  - Column 6: היתרה בש"ח (Balance in ILS)
  - Column 7: תאור מורחב (Extended Description) - **Contains full recipient info!**

## Key Patterns Identified

### 1. **Salary Pattern**
- **Source**: הפועלים (Bank Hapoalim)
- **Frequency**: Monthly (1st-3rd of month)
- **Amount**: ~₪27k-30k per month
- **Pattern**: "העברה מאת: הפועלים 12-394-000151003 משכורת"
- **Use**: Can auto-detect and categorize as Salary income

### 2. **Recurring Payments (Standing Orders)**
- **Pattern**: "הוראת קבע" (Standing Order)
- **Frequency**: Monthly
- **Amount**: ~₪4,895 (likely childcare for Yanai)
- **Use**: Mark as recurring, can set up budget alerts

### 3. **Credit Card Payments**
- **Pattern**: "מקס איט פיננ-י" (Max credit card)
- **Frequency**: Multiple times per month (55 transactions in 3 months)
- **Amount Range**: Small (₪3-200) to large monthly payments (₪13k-19k)
- **Large payments**: Usually around 1st-3rd of month (paying previous month's bill)
- **Use**: Can detect large credit card payments and track monthly spending

### 4. **Transfer Patterns**
- **Digital Transfers** ("העברה דיגיטל"): Rent, childcare, parking
- **Internet Transfers** ("הע. אינטרנט"): Same as digital, just different channel
- **Extended descriptions** contain recipient names for categorization

### 5. **Transaction Frequency**
- Most transactions occur on **Tuesday** and **Friday**
- Least on **Thursday**
- Can use for anomaly detection (unusual day patterns)

### 6. **Monthly Spending Patterns**
- **August 2025**: Net -₪20k (expenses > income)
- **September 2025**: Net -₪23k
- **October 2025**: Net +₪75k (large Phoenix withdrawal)
- **November 2025**: Net -₪10k
- **December 2025**: Net -₪31k

### 7. **Large Transaction Detection**
- Phoenix withdrawal: ₪98,496 (October)
- Credit card payments: ₪13k-19k monthly
- Can flag transactions > ₪10k for review

## Categorization Rules

### Recipient-Based (from Extended Description)
- **גואנה סאיבה** (Johanna Saiba) → Rent
- **שמרית פרץ** (Shimrit Peretz) → Child Care (3 small kids)
- **יפעת קטיש/קטיעי** (Yifat Katish) → Child Care (3 small kids)
- **ינאי שבת** (Yanai Shabat) → Child Care (pocket money)
- **ועד צייטלין** (Building Committee) → Bills & Utilities (building fees)
- **מנחם/שרלאוב/שרונה** (Menachem/Sherla'ov/Sharon) → Transportation (parking)

### Keyword-Based
- "מקס איט פיננ-י" → Credit Card Payment
- "הפניקס חברה" → Savings Withdrawal (income)
- "העברת משכורת" → Salary (income)
- "הוראת קבע" → Child Care (recurring)
- "עמל.ערוץ" → Bank Fees

## Import ID Format
- **Leumi**: `leumi_YYYY-MM-DD_reference_amount`
- **Stable**: Same transaction always gets same ID (no row index)
- **Duplicate handling**: `ignoreDuplicates: true` - skips existing transactions

## Balance Updates
- Use **most recent balance** (first transaction in file, newest date)
- Balance column: Column 6 (היתרה בש"ח)
- Updates account balance after successful import

## Edge Cases Handled
- Empty extended descriptions → fallback to short description
- Missing reference numbers → use "no_ref" in import_id
- HTML entities in descriptions → properly decoded
- Hebrew RTL marks → removed
- Date validation → ensures valid dates (not Feb 30, etc.)

## Future Enhancements
1. **Recurring Transaction Detection**: Auto-detect standing orders
2. **Salary Detection**: Auto-categorize הפועלים transfers as Salary
3. **Large Transaction Alerts**: Flag transactions > ₪10k
4. **Monthly Pattern Analysis**: Compare month-over-month spending
5. **Anomaly Detection**: Unusual amounts or frequencies

