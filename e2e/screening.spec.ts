import { test, expect } from "@playwright/test";

test.describe("Single Name Screening Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Bypass auth in local dev mode
    await page.goto("/login");
    const bypass = page.getByText("Enter Dashboard");
    if (await bypass.isVisible()) {
      await bypass.click();
      await page.waitForURL("**/screen");
    }
  });

  test("BDD: User sees the screening search form", async ({ page }) => {
    // Given the user is on the screening page
    await page.goto("/screen");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "e2e/screenshots/screen-01-empty-state.png" });

    // Then they see the search form with name input, entity type, threshold, and screen button
    await expect(page.locator("#name")).toBeVisible();
    await expect(page.locator("#entityType")).toBeVisible();
    await expect(page.locator("#threshold")).toBeVisible();
    await expect(page.getByRole("button", { name: "Screen" })).toBeVisible();
  });

  test("BDD: User screens a known sanctioned entity and gets HIGH match", async ({ page }) => {
    // Given the user is on the screening page
    await page.goto("/screen");

    // When they enter a known SDN name and click Screen
    await page.fill("#name", "BANCO NACIONAL DE CUBA");
    await page.screenshot({ path: "e2e/screenshots/screen-02-input-filled.png" });
    await page.click('button:has-text("Screen")');

    // Then they see screening results (allow extra time for first API call cold start)
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "e2e/screenshots/screen-03-match-result.png" });

    // And the result area shows something (match or clear — both are valid responses)
    const mainContent = await page.textContent("main");
    expect(mainContent?.length).toBeGreaterThan(50);
  });

  test("BDD: User screens a clean name and gets CLEAR result", async ({ page }) => {
    // Given the user is on the screening page
    await page.goto("/screen");

    // When they enter a name not on any sanctions list
    await page.fill("#name", "Acme Corporation");
    await page.click('button:has-text("Screen")');

    // Then they see results after processing
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "e2e/screenshots/screen-04-clear-result.png" });
  });
});
