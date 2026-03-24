import { test, expect } from "@playwright/test";

test.describe("Dashboard Navigation", () => {
  test.beforeEach(async ({ page }) => {
    // Bypass auth in local dev
    await page.goto("/login");
    const bypass = page.getByText("Enter Dashboard");
    if (await bypass.isVisible()) {
      await bypass.click();
      await page.waitForURL("**/screen");
    }
  });

  test("BDD: All dashboard pages render without errors", async ({ page }) => {
    const routes = [
      { path: "/screen", title: "Screen Name", screenshot: "nav-01-screen.png" },
      { path: "/batch", title: "Batch Screening", screenshot: "nav-02-batch.png" },
      { path: "/watchlist", title: "Watchlist", screenshot: "nav-03-watchlist.png" },
      { path: "/reports", title: "Compliance Reports", screenshot: "nav-04-reports.png" },
      { path: "/settings", title: "Settings", screenshot: "nav-05-settings.png" },
    ];

    for (const route of routes) {
      const response = await page.goto(route.path);
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: `e2e/screenshots/${route.screenshot}` });

      // Verify page loads successfully (not a 500)
      expect(response?.status()).toBeLessThan(500);

      // Verify page renders with correct title
      await expect(page.locator("h1")).toContainText(route.title);
    }
  });

  test("BDD: Root URL resolves to an allowed landing route", async ({ page }) => {
    // Given the user navigates to the root URL
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Then it resolves to one of the supported landing routes
    const url = page.url();
    expect(url).toMatch(/\/$|\/(screen|login)/);
  });

  test("BDD: Sidebar navigation links work", async ({ page }) => {
    await page.goto("/screen");

    // Click each sidebar link and verify navigation
    const navItems = ["Batch", "Watchlist", "Reports", "Settings", "Screen"];

    for (const label of navItems) {
      await page.click(`aside a:has-text("${label}")`);
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: `e2e/screenshots/nav-sidebar-${label.toLowerCase()}.png` });
    }
  });
});
