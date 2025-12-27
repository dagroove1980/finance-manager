#!/bin/bash
# Finance Manager Deployment Script

echo "🚀 Finance Manager Deployment"
echo "=============================="
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build config
echo "🔧 Building configuration..."
node vercel-build.js

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
echo ""
echo "⚠️  IMPORTANT: Make sure you've set these environment variables in Vercel:"
echo "   - VITE_SUPABASE_URL=https://xkumvrpxkohnglbjqcyz.supabase.co"
echo "   - VITE_SUPABASE_ANON_KEY=sb_publishable_88QP1RtBlvcnbwHFMQAgqQ_PDKRcpfN"
echo "   - OPENAI_API_KEY=your_openai_api_key_here"
echo ""
read -p "Press Enter to continue with deployment..."

vercel --prod

echo ""
echo "✅ Deployment complete!"
echo "📝 Next steps:"
echo "   1. Set up Supabase database (run supabase-schema.sql)"
echo "   2. Visit your Vercel deployment URL"
echo "   3. Start importing your transactions!"

