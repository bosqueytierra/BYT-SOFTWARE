# Supabase Configuration

## Current Setup

This repository uses a centralized Supabase client configuration. The Supabase client is initialized in:

- `src/supabaseClient.js` (root level - main configuration)
- `BYT_SOFTWARE/src/supabaseClient.js` (BYT_SOFTWARE app)
- `docs/src/supabaseClient.js` (docs site)

All other files import the client from these centralized locations instead of creating their own instances.

## Security Notice

**IMPORTANT**: The Public ANON KEY is currently hardcoded in the source files. While this is acceptable for the PUBLIC anon key (it's meant to be public), for better security practices in production, you should:

1. Move the keys to environment variables
2. Use GitHub Secrets for CI/CD pipelines
3. Configure your deployment platform (Vercel, Netlify, etc.) with environment variables

## Migrating to GitHub Secrets (Recommended for Production)

### Step 1: Add Secrets to GitHub

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these secrets:
   - `SUPABASE_URL`: `https://paatfcaylifoqbsqqvpq.supabase.co`
   - `SUPABASE_ANON_KEY`: Your public anon key

### Step 2: Update the Code

Modify the `supabaseClient.js` files to use environment variables:

```javascript
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://paatfcaylifoqbsqqvpq.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-fallback-key';

if (!globalThis.__supabaseClient) {
  globalThis.__supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export const supabase = globalThis.__supabaseClient;
export default supabase;
```

### Step 3: Configure Your Build Tool

For Vercel:
- Add environment variables in Project Settings → Environment Variables

For Netlify:
- Add environment variables in Site Settings → Build & deploy → Environment

For local development:
- Create a `.env` file (add it to `.gitignore`!)
- Add your variables:
  ```
  SUPABASE_URL=https://paatfcaylifoqbsqqvpq.supabase.co
  SUPABASE_ANON_KEY=your-anon-key
  ```

## Files Modified in This Update

The following files were updated to use the centralized Supabase client:

### Updated Files:
- `src/supabaseClient.js` (created)
- `BYT_SOFTWARE/src/supabaseClient.js` (updated)
- `BYT_SOFTWARE/src/js/supabase.js` (updated)
- `BYT_SOFTWARE/src/js/globalSupabase.js` (updated)
- `docs/src/supabaseClient.js` (updated)
- `docs/src/js/supabase.js` (updated)
- `docs/src/js/globalSupabase.js` (updated)
- `src/js/wizard.js` (updated)
- `src/js/supabase.client.test.js` (updated)

### Backup Files Created:
- `*.bak` files contain the original versions before modification

## Testing the Changes

After deployment, verify that:

1. The application connects to Supabase successfully
2. All existing functionality works as expected
3. No console errors related to Supabase initialization
4. Multiple instances warning is gone (if it existed before)

## Troubleshooting

If you encounter connection issues:

1. Check that the SUPABASE_URL is correct
2. Verify the ANON_KEY is valid and not expired
3. Ensure Row Level Security (RLS) policies are configured correctly in Supabase
4. Check browser console for specific error messages
