# Runbook: Authentication Failure

## Symptoms
- Users can't log in
- Registration emails not arriving
- Session expires unexpectedly
- Dashboard redirects to login loop

## Diagnosis Steps

1. **Check Supabase Auth status**
   - Go to Supabase Dashboard → Authentication → Users
   - Verify users exist and are confirmed

2. **Check environment variables**
   - `NEXT_PUBLIC_SUPABASE_URL` must be correct project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` must match project's anon key
   - These are `NEXT_PUBLIC_` prefixed — they're exposed to the client

3. **Check browser console**
   - Look for CORS errors (wrong Supabase URL)
   - Look for 401/403 responses from Supabase

## Resolution

### Login fails with valid credentials
1. Check Supabase → Authentication → Users → verify user is confirmed
2. If unconfirmed, resend confirmation email from Supabase dashboard
3. Check if email provider is configured (Supabase → Settings → Auth → SMTP)

### Registration emails not arriving
1. Supabase free tier uses built-in email (rate limited to 4/hour)
2. Check Supabase → Auth → Email Templates
3. For production: configure custom SMTP in Supabase settings

### Session/cookie issues
1. Check if cookies are being set (browser DevTools → Application → Cookies)
2. Verify the app domain matches Supabase's allowed redirect URLs
3. Supabase → Authentication → URL Configuration → add your Vercel URLs

### Redirect loop
1. Usually caused by middleware failing to read the auth cookie
2. Check that `@supabase/ssr` version matches the Supabase JS version
3. Clear browser cookies for the app domain and try again
