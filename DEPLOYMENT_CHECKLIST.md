# ✅ Deployment Checklist

## Pre-Deployment

- [x] ✅ Project structure created
- [x] ✅ Database schema ready (`supabase-schema.sql`)
- [x] ✅ API endpoints created
- [x] ✅ Frontend UI complete
- [x] ✅ Environment variables configured

## Deployment Steps

### 1. Database Setup (Required First!)

- [ ] **Go to Supabase SQL Editor:**
  - URL: https://supabase.com/dashboard/project/xkumvrpxkohnglbjqcyz/sql/new
  
- [ ] **Run Schema:**
  - Open `supabase-schema.sql` file
  - Copy ALL contents (entire file)
  - Paste into Supabase SQL Editor
  - Click **Run** button (or Cmd+Enter)
  - ✅ Verify: Should see "Success. No rows returned"

- [ ] **Optional - Add Sample Data:**
  - Open `supabase-dummy-data.sql`
  - Copy contents
  - Paste into SQL Editor
  - Click **Run**
  - ✅ Verify: Should see sample transactions

### 2. Install Dependencies

```bash
cd "/Users/david.scebat/Documents/Geek Automation/products/websites/finance-manager"
npm install
```

### 3. Deploy to Vercel

**Option A: CLI Deployment**
```bash
# Make sure you're in the finance-manager directory
vercel --prod
```

**Option B: Dashboard Deployment**
1. Go to https://vercel.com/new
2. Import folder or connect GitHub repo
3. Configure project settings
4. Deploy

### 4. Set Environment Variables in Vercel

**Go to:** Vercel Dashboard → Your Project → Settings → Environment Variables

**Add these 3 variables (Production environment):**

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://xkumvrpxkohnglbjqcyz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_88QP1RtBlvcnbwHFMQAgqQ_PDKRcpfN` |
| `OPENAI_API_KEY` | `your_openai_api_key_here` |

**⚠️ Important:** After adding variables, click **Redeploy** or trigger a new deployment!

### 5. Verify Deployment

- [ ] Visit your Vercel deployment URL
- [ ] Check browser console (F12) - should see no errors
- [ ] Dashboard should load with account balances
- [ ] Try importing a test CSV file
- [ ] Verify transactions appear

## Post-Deployment

### Test Features

- [ ] ✅ Dashboard loads with account balances
- [ ] ✅ Can navigate between pages (Dashboard, Transactions, Accounts, Reports, Insights)
- [ ] ✅ Can import CSV file
- [ ] ✅ Transactions appear after import
- [ ] ✅ AI categorization works (or falls back to keywords)
- [ ] ✅ Charts render correctly
- [ ] ✅ Monthly report generation works

### First Steps After Deployment

1. **Import Your Transactions:**
   - Export CSV from Leumi bank
   - Go to Transactions → Import CSV
   - Select "Leumi Bank Account" and "Leumi Bank CSV"
   - Upload file

2. **Review Categories:**
   - Check AI-categorized transactions
   - Adjust categories as needed
   - This improves AI accuracy over time

3. **Generate First Report:**
   - Go to Reports page
   - Select current month/year
   - Review spending analysis

## Troubleshooting

### Database Issues
- **Error:** "relation does not exist"
  - **Fix:** Run `supabase-schema.sql` in Supabase SQL Editor

- **Error:** "permission denied"
  - **Fix:** Check RLS policies - schema sets "Allow all operations"

### Environment Variable Issues
- **Error:** "Supabase credentials not found"
  - **Fix:** Verify variables are set in Vercel Dashboard
  - **Fix:** Redeploy after adding variables

### Import Issues
- **Error:** "Failed to import"
  - **Fix:** Check CSV format matches expected format
  - **Fix:** Verify account_id exists in database
  - **Fix:** Check browser console for detailed errors

### Build Issues
- **Error:** "config.js not found"
  - **Fix:** Ensure `vercel-build.js` runs during build
  - **Fix:** Check build logs in Vercel dashboard

## Success Criteria

✅ App loads without errors  
✅ Database connection works  
✅ Can import transactions  
✅ AI categorization works (or falls back)  
✅ Charts render correctly  
✅ Reports generate successfully  

## Support Files

- `QUICK_START.md` - Quick reference guide
- `SETUP.md` - Detailed setup instructions
- `README.md` - Full documentation
- `DEPLOY.md` - Deployment guide

---

**Ready to deploy?** Follow steps 1-5 above! 🚀

