import { test, expect } from "@playwright/test";

test.describe("Operational Endpoints", () => {
  test("BDD: Health endpoint returns OK", async ({ request }) => {
    // Given the application is running
    // When we call the health endpoint
    const response = await request.get("/api/health");

    // Then it returns 200 with status ok
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.version).toBe("0.1.0");
    expect(body.environment).toBeDefined();
  });

  test("BDD: Ready endpoint returns readiness status", async ({ request }) => {
    // Given the application is running
    // When we call the ready endpoint
    const response = await request.get("/api/ready");

    // Then it returns a readiness report with checks
    const body = await response.json();
    expect(body.ready).toBeDefined();
    expect(body.checks).toBeInstanceOf(Array);
    expect(body.checks.length).toBeGreaterThan(0);

    // And the environment check passes
    const envCheck = body.checks.find((c: { name: string }) => c.name === "environment");
    expect(envCheck?.status).toBe("pass");
  });

  test("BDD: Cron endpoint rejects unauthenticated requests", async ({ request }) => {
    // Given no authorization header
    // When we call the cron endpoint
    const response = await request.get("/api/cron/update-lists");

    // Then it returns 401
    expect(response.status()).toBe(401);
  });

  test("BDD: Screen API rejects unauthenticated requests", async ({ request }) => {
    // Given no authorization header
    // When we call the screen API
    const response = await request.post("/api/v1/screen", {
      data: { name: "test" },
    });

    // Then it returns 401
    expect(response.status()).toBe(401);
  });
});
