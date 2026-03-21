import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("BDD: User can access login page", async ({ page }) => {
    // Given the user navigates to the login page
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "e2e/screenshots/auth-01-login-page.png" });

    // Then they see the SanctionShield branding and sign-in form
    await expect(page.locator("h1")).toContainText("Sign in to SanctionShield");
  });

  test("BDD: Local dev mode shows bypass button", async ({ page }) => {
    // Given the app is running in local dev mode (no Supabase)
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Then a local dev bypass button is shown
    const bypass = page.getByText("Enter Dashboard");
    await expect(bypass).toBeVisible();
    await page.screenshot({ path: "e2e/screenshots/auth-02-local-dev-bypass.png" });

    // When the user clicks the bypass button
    await bypass.click();
    await page.waitForURL("**/screen");
    await page.screenshot({ path: "e2e/screenshots/auth-03-dashboard-after-bypass.png" });

    // Then they are taken to the screening dashboard
    await expect(page.locator("h1")).toContainText("Screen Name");
  });

  test("BDD: User can access registration page", async ({ page }) => {
    // Given the user navigates to the registration page
    await page.goto("/register");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "e2e/screenshots/auth-04-register-page.png" });

    // Then they see the registration form with org name, email, password fields
    await expect(page.locator("h1")).toContainText("Create your account");
    await expect(page.locator("#orgName")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
  });

  test("BDD: User can access forgot password page", async ({ page }) => {
    // Given the user navigates to forgot password
    await page.goto("/forgot-password");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "e2e/screenshots/auth-05-forgot-password.png" });

    // Then they see the reset form
    await expect(page.locator("h1")).toContainText("Reset password");
  });
});
