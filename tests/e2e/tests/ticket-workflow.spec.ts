import { expect, test } from "@playwright/test";

test("ticket workflow from create to invoice", async ({ page }) => {
  await page.goto("/");

  await page.fill("input[name=title]", "E2E Demo Ticket");
  await page.fill("textarea[name=description]", "Der Kühlschrank kühlt nicht mehr.");
  await page.fill("input[name=unit_id]", "1");
  await page.fill("input[name=tenant_id]", "1");
  await page.click("button:has-text('Ticket anlegen')");

  await expect(page.locator("button.list-item:has-text('E2E Demo Ticket')")).toBeVisible();
  await page.click("button.list-item:has-text('E2E Demo Ticket')");

  await page.selectOption("select", { index: 0 });
  await page.click("button:has-text('Zuweisen')");
  await page.click("button:has-text('Starten')");
  await page.click("button:has-text('Als erledigt markieren')");

  await page.fill("input[type=number]", "120");
  await page.click("button:has-text('Rechnung erstellen')");
  await expect(page.locator(".invoice-panel")).toContainText("Betrag");
});
