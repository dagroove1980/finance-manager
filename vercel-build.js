// Vercel build script to inject environment variables
const fs = require('fs');
const path = require('path');

// Get environment variables and clean them thoroughly
let rawUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
let rawKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

console.log('Build script running...');
console.log('VITE_SUPABASE_URL:', rawUrl ? `${rawUrl.substring(0, 30)}...` : 'NOT SET');
console.log('VITE_SUPABASE_ANON_KEY:', rawKey ? 'SET' : 'NOT SET');

// Clean the values: remove all newlines (both literal and escaped), trim whitespace
let supabaseUrl = rawUrl.replace(/\\n/g, '').replace(/\n/g, '').replace(/\r/g, '').trim();
let supabaseKey = rawKey.replace(/\\n/g, '').replace(/\n/g, '').replace(/\r/g, '').trim();

if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR: Supabase environment variables not found!');
    console.error('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in Vercel.');
    process.exit(1);
}

// Create a config.js file with the Supabase credentials
const configContent = `// Auto-generated config file - created during build
window.SUPABASE_URL = ${JSON.stringify(supabaseUrl)};
window.SUPABASE_ANON_KEY = ${JSON.stringify(supabaseKey)};
`;

const configPath = path.join(__dirname, 'config.js');
fs.writeFileSync(configPath, configContent, 'utf8');
console.log('✓ Created config.js with Supabase credentials');

console.log('Build script completed.');

