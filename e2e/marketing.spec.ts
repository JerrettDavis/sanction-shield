import { test, expect } from "@playwright/test";

test.describe("Marketing Page (Signed Out)", () => {
  test("BDD: Root URL shows marketing page when signed out", async ({ page }) => {
    // Given the user is not signed in and navigates to /
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "e2e/screenshots/marketing-01-hero.png" });

    // Then they see the marketing page with the hero headline
    await expect(page.locator("h1")).toContainText("Sanctions screening");

    // And the nav has Sign In + Start Free CTAs
    await expect(page.getByText("Sign in")).toBeVisible();
    await expect(page.getByText("Start Free")).toBeVisible();
  });

  test("BDD: Marketing page has all key sections", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Trust strip
    await expect(page.getByText("18,700+")).toBeVisible();
    await expect(page.getByText("<500ms")).toBeVisible();

    // Features section
    await expect(page.getByText("Single Name Screening")).toBeVisible();
    await expect(page.getByText("Batch CSV Screening")).toBeVisible();
    await expect(page.getByText("Audit-Ready Reports")).toBeVisible();

    // How it works
    await expect(page.getByText("How it works")).toBeVisible();

    // Pricing
    await expect(page.getByText("$79")).toBeVisible();
    await expect(page.getByText("$149")).toBeVisible();
    await expect(page.getByText("$299")).toBeVisible();

    await page.screenshot({ path: "e2e/screenshots/marketing-02-full-page.png", fullPage: true });
  });

  test("BDD: Start Free CTA navigates to register", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Click first "Start Screening Free" CTA
    await page.getByText("Start Screening Free").click();
    await page.waitForURL("**/register");

    await expect(page.locator("h1")).toContainText("Create your account");
  });

  test("BDD: Sign In link navigates to login", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.locator("nav").getByText("Sign in").click();
    await page.waitForURL("**/login");

    await expect(page.locator("h1")).toContainText("Sign in to SanctionShield");
  });
});
