# Finance Manager - Quick Setup Guide

## 🚀 Quick Start

### Step 1: Set Up Supabase Database

1. Go to https://supabase.com and create a new project
2. Navigate to SQL Editor
3. Copy and paste the entire contents of `supabase-schema.sql`
4. Click "Run" to execute
5. (Optional) Run `supabase-dummy-data.sql` for sample data

### Step 2: Configure Environment Variables

**For Local Development:**

Create `.env.local` file:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
OPENAI_API_KEY=sk-your-openai-key  # Optional but recommended
```

**For Vercel Deployment:**

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add these variables:
   - `VITE_SUPABASE_URL` = Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = Your Supabase anon key
   - `OPENAI_API_KEY` = Your OpenAI API key (optional)

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Run Locally

```bash
npm run dev
```

Visit http://localhost:3000

### Step 5: Deploy to Vercel

```bash
# If not already logged in
vercel login

# Deploy
vercel --prod
```

Or connect your GitHub repository to Vercel for automatic deployments.

## 📊 Initial Data Setup

Your accounts are pre-configured in the schema:
- Leumi Bank Account: ₪109,238
- Keren Hishtalmut: ₪376,751
- Bitcoin: ₪64,300
- Phoenix Savings: ₪663,458
- Fiverr Vested: ₪322,537

## 📥 Importing Your First Transactions

1. Export CSV from your bank (Leumi, Max, etc.)
2. Go to Transactions page
3. Click "Import CSV"
4. Select:
   - Account (e.g., "Leumi Bank Account")
   - Import Source (e.g., "Leumi Bank CSV")
5. Upload your CSV file
6. Transactions will be automatically categorized and imported

## 🤖 AI Categorization Setup

The app uses OpenAI GPT for intelligent categorization. To enable:

1. Get an OpenAI API key from https://platform.openai.com
2. Add `OPENAI_API_KEY` to your environment variables
3. The app will automatically use AI for categorization

**Without OpenAI:** The app falls back to keyword-based categorization, which still works well for common transactions.

## 🔧 Troubleshooting

### Config.js not found
- Make sure `vercel-build.js` runs during build
- Check that environment variables are set correctly

### Supabase connection errors
- Verify your Supabase URL and anon key
- Check Supabase project is active
- Ensure RLS policies allow access (schema sets "Allow all operations")

### Import fails
- Check CSV format matches expected format
- Verify account_id exists in database
- Check browser console for detailed errors

### AI categorization not working
- Verify OPENAI_API_KEY is set
- Check API key has credits/quota
- App will fallback to keyword matching if AI fails

## 📝 Next Steps

1. **Import your transactions** - Start with recent bank statements
2. **Review categories** - Adjust AI-suggested categories as needed
3. **Set budgets** - Create monthly budgets for spending categories
4. **Generate reports** - View monthly reports for insights
5. **Review insights** - Check AI-generated recommendations

## 🎯 Key Features to Try

- **Dashboard** - See your financial overview at a glance
- **Transactions** - View and filter all transactions
- **Reports** - Generate monthly spending analysis
- **Insights** - Get AI-powered recommendations
- **Import** - Bulk import transactions from CSV

## 💡 Tips

- Import transactions regularly (weekly/monthly) to keep data current
- Review and adjust categories to improve AI accuracy over time
- Set budgets to get alerts when approaching limits
- Use the search and filters to find specific transactions quickly

