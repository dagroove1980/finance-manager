# ⚡ Quick Start - Finance Manager

## 🎯 Ready to Deploy!

Your credentials are configured. Follow these steps:

### Step 1: Set Up Database (5 minutes)

1. **Go to Supabase SQL Editor:**
   - https://supabase.com/dashboard/project/xkumvrpxkohnglbjqcyz/sql/new

2. **Run the Schema:**
   - Open `supabase-schema.sql`
   - Copy ALL contents
   - Paste into SQL Editor
   - Click **Run** (or press Cmd+Enter)

3. **Optional - Add Sample Data:**
   - Open `supabase-dummy-data.sql`
   - Copy contents
   - Paste into SQL Editor
   - Click **Run**

### Step 2: Deploy to Vercel (2 minutes)

**Option A: Using CLI**
```bash
cd finance-manager
npm install
vercel --prod
```

**Option B: Using Dashboard**
1. Go to https://vercel.com/new
2. Import this folder or connect GitHub repo
3. Add environment variables (see below)
4. Deploy

### Step 3: Set Environment Variables in Vercel

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add these 3 variables:

```
VITE_SUPABASE_URL=https://xkumvrpxkohnglbjqcyz.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_88QP1RtBlvcnbwHFMQAgqQ_PDKRcpfN
OPENAI_API_KEY=your_openai_api_key_here
```

**Important:** After adding variables, redeploy!

### Step 4: Test Your App

1. Visit your Vercel deployment URL
2. You should see the dashboard with your accounts:
   - Leumi Bank Account: ₪109,238
   - Keren Hishtalmut: ₪376,751
   - Bitcoin: ₪64,300
   - Phoenix Savings: ₪663,458
   - Fiverr Vested: ₪322,537

3. **Import Your First Transactions:**
   - Go to **Transactions** page
   - Click **Import CSV**
   - Select account and import source
   - Upload your CSV file

### 🎉 You're Done!

Your finance manager is now live and ready to use!

## 📋 What's Next?

- **Import transactions** from Leumi, Max, Phoenix
- **Review categories** - AI will categorize automatically
- **Generate reports** - See your spending patterns
- **Get insights** - AI recommendations for savings

## 🆘 Troubleshooting

**Database not working?**
- Check Supabase project is active
- Verify schema.sql was executed
- Check RLS policies allow access

**Import failing?**
- Verify CSV format matches expected format
- Check browser console for errors
- Ensure account exists in database

**Environment variables not working?**
- Make sure they're set for Production environment
- Redeploy after adding variables
- Check vercel-build.js runs during build

## 📞 Need Help?

Check the full documentation in `README.md` or `SETUP.md`

