#!/usr/bin/env sh
set -eu

# Generate runtime env file for client-side usage.
# This lets you provide NEXT_PUBLIC_* at container runtime (not build time).
node -e "const fs=require('fs'); const path=require('path'); const env={NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}; const out='window.__ENV='+JSON.stringify(env)+';'; const p=path.join(process.cwd(),'public','runtime-env.js'); fs.mkdirSync(path.dirname(p),{recursive:true}); fs.writeFileSync(p,out);"

exec "$@"

