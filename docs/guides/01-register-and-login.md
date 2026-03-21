# Guide: Register & Login

> Based on BDD scenarios: `auth.spec.ts` — auth-01 through auth-05

## Creating Your Account

1. Navigate to the registration page at `/register`

   ![Registration page](../../e2e/screenshots/auth-04-register-page.png)

2. Fill in your details:
   - **Organization name** — your company name (used for tenant isolation)
   - **Email** — your business email
   - **Password** — at least 8 characters

3. Click **Create account**

4. Check your email for a confirmation link. Click it to activate your account.

## Signing In

1. Navigate to `/login`

   ![Login page](../../e2e/screenshots/auth-01-login-page.png)

2. Enter your email and password

3. Click **Sign in**

4. You'll be redirected to the screening dashboard

   ![Dashboard after login](../../e2e/screenshots/auth-03-dashboard-after-bypass.png)

## Local Development Mode

When running locally without Supabase credentials, authentication is bypassed. You'll see a blue banner with an **Enter Dashboard** button.

![Local dev bypass](../../e2e/screenshots/auth-02-local-dev-bypass.png)

This uses a pre-configured dev API key (`sk_test_localdevelopment`) which is blocked in production.

## Resetting Your Password

1. From the login page, click **Forgot password?**

   ![Forgot password](../../e2e/screenshots/auth-05-forgot-password.png)

2. Enter your email address
3. Check your email for a reset link
4. Click the link to set a new password

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Confirmation email not arriving | Check spam folder. Supabase free tier is rate-limited to 4 emails/hour. |
| "Invalid login credentials" | Verify email is confirmed. Try password reset. |
| Redirect loop after login | Clear browser cookies for the app domain. |

> See also: [Auth Failure Runbook](../runbooks/auth-failure.md)
