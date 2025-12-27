# 💰 Finance Manager

Next-generation personal finance management application with AI-powered insights, automated categorization, and comprehensive financial tracking.

## Features

### 🎯 Core Features

- **Multi-Account Management**
  - Bank accounts (Leumi)
  - Credit cards (Max)
  - Savings accounts (Phoenix)
  - Investments (Fiverr vesting via IBI)
  - Retirement accounts (Keren Hishtalmut)
  - Cryptocurrency (Bitcoin)

- **Smart Transaction Categorization**
  - AI-powered categorization using OpenAI GPT
  - Keyword-based fallback categorization
  - Supports Hebrew and English descriptions
  - Automatic merchant recognition

- **CSV Import**
  - Import bank statements from Leumi
  - Import credit card statements from Max
  - Import savings statements from Phoenix
  - Generic CSV support for other sources
  - Automatic duplicate detection

- **Monthly Reports**
  - Comprehensive spending analysis
  - Income vs expenses tracking
  - Category breakdowns
  - Comparison with previous periods
  - AI-generated insights and recommendations

- **Dashboard & Analytics**
  - Real-time financial overview
  - Expense trends visualization
  - Category spending charts
  - Account balance tracking
  - Recent transactions feed

- **AI Insights**
  - Spending pattern analysis
  - Budget alerts
  - Savings opportunities
  - Anomaly detection
  - Personalized recommendations

## Setup

### Prerequisites

- Node.js (v14+)
- Supabase account (free tier works)
- Vercel account (free tier works)
- OpenAI API key (optional, for AI categorization)

### Installation

1. **Clone or navigate to the project directory**

2. **Set up Supabase**
   - Create a new project at https://supabase.com
   - Run the SQL from `supabase-schema.sql` in the SQL Editor
   - (Optional) Run `supabase-dummy-data.sql` for sample data

3. **Configure Environment Variables**

   Create `.env.local` for local development:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   OPENAI_API_KEY=your_openai_api_key  # Optional
   ```

   For Vercel deployment, set these in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY` (optional)

4. **Install Dependencies**
   ```bash
   npm install
   ```

5. **Run Development Server**
   ```bash
   npm run dev
   ```

6. **Deploy to Vercel**
   ```bash
   npm run deploy
   ```

## Usage

### Adding Accounts

Your initial accounts are pre-configured based on your financial data:
- Leumi Bank Account (₪109,238)
- Keren Hishtalmut (₪376,751)
- Bitcoin (₪64,300)
- Phoenix Savings (₪663,458)
- Fiverr Vested (₪322,537)

### Importing Transactions

1. Export CSV from your bank/credit card provider
2. Go to Transactions page
3. Click "Import CSV"
4. Select account and import source
5. Upload CSV file
6. Transactions are automatically categorized and imported

### CSV Format Support

**Leumi Bank CSV:**
- Format: Date, Description, Amount, Balance, Reference
- Date format: DD/MM/YYYY

**Max Credit Card CSV:**
- Format: Date, Merchant, Amount, Category
- Date format: DD/MM/YYYY

**Phoenix Savings CSV:**
- Format: Date, Description, Amount, Balance

**Generic CSV:**
- Format: Date, Description, Amount
- Flexible date formats supported

### Viewing Reports

1. Navigate to Reports page
2. Select month and year
3. View comprehensive spending analysis
4. See AI-generated insights and recommendations

### AI Categorization

Transactions are automatically categorized using:
1. **OpenAI GPT** (if API key configured) - Most accurate
2. **Keyword matching** - Fallback method using predefined keywords

Categories include:
- Food & Dining
- Transportation
- Shopping
- Bills & Utilities
- Rent
- Child Care
- Healthcare
- Entertainment
- Education
- Travel
- Salary
- Investment Returns
- Other

## Project Structure

```
finance-manager/
├── api/                    # Vercel serverless functions
│   ├── categorize-transaction.js  # AI categorization
│   ├── import-transactions.js    # CSV import handler
│   └── generate-report.js        # Monthly report generator
├── index.html             # Main HTML file
├── styles.css             # Application styles
├── app.js                 # Main application logic
├── supabase.js            # Supabase client & API functions
├── config.js              # Auto-generated config (from build)
├── supabase-schema.sql    # Database schema
├── supabase-dummy-data.sql  # Sample data
├── vercel-build.js       # Build script for env vars
├── vercel.json           # Vercel configuration
└── package.json          # Dependencies
```

## Database Schema

### Tables

- **accounts** - Financial accounts (bank, credit card, savings, etc.)
- **categories** - Transaction categories with keywords
- **transactions** - All financial transactions
- **budgets** - Monthly/yearly budgets per category
- **insights** - AI-generated insights and recommendations
- **monthly_reports** - Generated monthly summaries

See `supabase-schema.sql` for complete schema definition.

## API Endpoints

### `/api/categorize-transaction`
- **Method:** POST
- **Body:** `{ description, amount, merchant, account_type }`
- **Returns:** `{ category, confidence, reasoning }`

### `/api/import-transactions`
- **Method:** POST
- **Body:** `{ account_id, import_source, csv_data }`
- **Returns:** `{ success, count, transactions }`

### `/api/generate-report`
- **Method:** GET
- **Query:** `?year=2025&month=3`
- **Returns:** Monthly report object

## Technologies

- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Charts:** Chart.js
- **Backend:** Vercel Serverless Functions
- **Database:** Supabase (PostgreSQL)
- **AI:** OpenAI GPT-3.5-turbo (optional)
- **Deployment:** Vercel

## Future Enhancements

- [ ] Recurring transaction detection
- [ ] Budget tracking and alerts
- [ ] Investment portfolio tracking
- [ ] Goal setting and tracking
- [ ] Receipt scanning and OCR
- [ ] Multi-currency support
- [ ] Export to Excel/PDF
- [ ] Mobile app
- [ ] Bank API integration (Open Banking)

## License

Personal use project.

## Support

For issues or questions, check the code comments or create an issue in the repository.

