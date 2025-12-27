# 🚀 Deployment Guide

## Environment Variables for Vercel

Set these in Vercel Dashboard → Settings → Environment Variables:

```
VITE_SUPABASE_URL=https://xkumvrpxkohnglbjqcyz.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_88QP1RtBlvcnbwHFMQAgqQ_PDKRcpfN
OPENAI_API_KEY=your_openai_api_key_here
```

## Step 1: Set Up Supabase Database

1. Go to https://supabase.com/dashboard/project/xkumvrpxkohnglbjqcyz
2. Navigate to **SQL Editor**
3. Copy the entire contents of `supabase-schema.sql`
4. Paste and click **Run**
5. (Optional) Run `supabase-dummy-data.sql` for sample data

## Step 2: Deploy to Vercel

### Option A: Using Vercel CLI

```bash
cd finance-manager
npm install
vercel --prod
```

When prompted:
- Set environment variables (or set them in dashboard after)
- Confirm project settings

### Option B: Using Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your GitHub repository (or upload the folder)
3. Set environment variables in Settings
4. Deploy

## Step 3: Verify Deployment

1. Visit your Vercel deployment URL
2. Check browser console for any errors
3. Try importing a test CSV file
4. Verify transactions appear in the dashboard

## Troubleshooting

### Database Connection Issues
- Verify Supabase project is active
- Check that schema.sql was executed successfully
- Ensure RLS policies allow access

### Environment Variables Not Working
- Make sure variables are set for Production environment
- Redeploy after adding variables
- Check vercel-build.js runs during build

### Import Not Working
- Check API endpoint is accessible
- Verify CSV format matches expected format
- Check browser console for errors

