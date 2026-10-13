import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("home and pricing tell the truthful estimate story", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /fresh laundry/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /book a pickup/i }).first()).toBeVisible();
  await page.goto("/services");
  await expect(page.getByRole("table", { name: /wash, dry & fold/i })).toContainText("J$850");
  await expect(page.getByText("Staff quote").first()).toBeVisible();
});

test("guest completes a booking request at 320px", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-320", "Mobile critical journey");
  await page.goto("/book");
  await page.getByLabel("Full name").fill("Morgan Reid");
  await page.getByLabel("Mobile / WhatsApp number").fill("876-555-0199");
  await page.getByLabel("Email").fill("morgan@example.com");
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByLabel("Kingston address line").fill("12 Example Road");
  await page.getByLabel("Community / area").fill("Kingston 6");
  await page.getByLabel("Pickup date").selectOption({ index: 1 });
  await page.getByLabel("Pickup window").selectOption({ index: 1 });
  await page.getByRole("button", { name: /continue/i }).click();
  await expect(page.getByText(/estimated total/i)).toBeVisible();
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByRole("button", { name: /continue/i }).click();
  await page.getByLabel(/I agree to the draft Terms/i).check();
  await page.getByLabel(/I emptied all pockets/i).check();
  await page.getByLabel(/I understand this is a request/i).check();
  await page.getByRole("button", { name: /submit request/i }).click();
  await expect(page.getByRole("heading", { name: /thanks, morgan/i })).toBeVisible();
  await expect(page.getByText(/No FreshFold team member/i)).toBeVisible();
});

test("proof action creates review, never paid", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Admin workflow covered on desktop");
  await page.goto("/admin/orders");
  await page.getByRole("button", { name: "Open" }).first().click();
  await page.getByRole("button", { name: /simulate proof upload/i }).click();
  await expect(page.getByText("REVIEW", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Append status")).toHaveValue("PAYMENT_REVIEW");
  await expect(page.getByText("PAID", { exact: true })).toHaveCount(0);
});

for (const route of ["/", "/services", "/book", "/faq", "/orders", "/admin"]) {
  test(`has no serious accessibility violations on ${route}`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((issue) => ["serious", "critical"].includes(issue.impact ?? ""));
    expect(serious).toEqual([]);
  });
}

test("pages do not overflow at 320px", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-320", "Small-screen check");
  for (const route of ["/", "/services", "/book", "/admin"]) {
    await page.goto(route);
    const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(widths.scroll, `${route} overflow`).toBeLessThanOrEqual(widths.client);
  }
});

test("mobile navigation remains usable with motion enabled", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-320", "Mobile navigation interaction");
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  const mobileNavigation = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(mobileNavigation).toBeVisible();
  await mobileNavigation.getByRole("link", { name: "Services & prices" }).click();
  await expect(page).toHaveURL(/\/services$/);
  await expect(page.getByRole("heading", { name: /clear starting prices/i })).toBeVisible();
});

test("reduced-motion preference minimizes booking transitions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/book");
  const durationSeconds = await page.locator(".wizard-step").evaluate((element) => {
    const duration = getComputedStyle(element).animationDuration;
    return duration.endsWith("ms") ? Number.parseFloat(duration) / 1000 : Number.parseFloat(duration);
  });
  expect(durationSeconds).toBeLessThan(.02);
});

test("captures desktop owner-review preview", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Desktop capture");
  await page.goto("/");
  await page.screenshot({ path: "artifacts/freshfold-home-desktop.png", fullPage: true });
});

test("captures mobile booking preview", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-320", "Mobile capture");
  await page.goto("/book");
  await page.screenshot({ path: "artifacts/freshfold-booking-mobile.png", fullPage: true });
});
