import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * MVP acceptance flow (spec §81): create client → new proposal → Broadcast Pro →
 * swap PTZ Standard→NDI → 2→3 cameras → change upfront → 24→36 months →
 * client mode hides internal data → preview → saved → reopen → duplicate.
 */

const INTERNAL_MARKERS = ["Resumo interno", "Custo total", "Lucro bruto", "Margem", "Markup", "Break-even", "Custo €", "Ajustar proposta"];

async function login(page: Page) {
  await page.goto("/login");
  await page.fill("#email", "lucas@churchtech.pt");
  await page.fill("#password", "demo1234");
  await Promise.all([page.waitForURL(/\/dashboard/), page.getByRole("button", { name: "Entrar" }).click()]);
}

/** Final value of an animated number (screen-reader text, never the intermediate frame). */
async function readMoney(locator: Locator): Promise<number> {
  const text = (await locator.locator(".sr-only").first().textContent()) ?? "";
  return Number(text.replace(/[^\d,]/g, "").replace(",", "."));
}

async function monthly(page: Page) {
  // Wait for the counter animation to settle.
  await page.waitForTimeout(700);
  return readMoney(page.getByTestId("monthly-payment"));
}

/** Configurator URL (/proposals/<id>, never /proposals/new). */
const isConfiguratorUrl = (url: URL) => /^\/proposals\/(?!new$)[a-z0-9]+$/.test(url.pathname);

async function waitSaved(page: Page) {
  await expect(page.getByTestId("save-status")).toHaveAttribute("data-status", "saved", { timeout: 20_000 });
}

test("seller builds, presents, generates, saves, reopens and duplicates a proposal", async ({ page }) => {
  const churchName = `Igreja Teste E2E ${Date.now().toString(36)}`;
  await login(page);

  // 1. Create client from the new proposal flow
  await page.goto("/proposals/new");
  await page.getByTestId("new-client").click();
  await page.getByTestId("client-name").fill(churchName);
  await page.getByTestId("client-contact").fill("Pr. Teste Silva");
  await page.getByTestId("save-client").click();
  await expect(page.getByText(`Proposta para`)).toBeVisible();
  await expect(page.getByText(churchName).first()).toBeVisible();

  // 2. Start from Broadcast Pro
  await page.getByTestId("preset-broadcast-pro").click();
  await page.waitForURL(isConfiguratorUrl);
  const proposalUrl = page.url();

  // 3. Broadcast Pro starts with 2× PTZ Standard
  const camera = page.getByTestId("product-camera-ptz");
  await expect(camera).toHaveAttribute("data-selected", "true");
  await expect(camera.getByRole("group", { name: "Câmera PTZ" })).toContainText("2");
  await expect(camera.getByRole("radio", { name: "Standard" })).toHaveAttribute("aria-checked", "true");
  const baseMonthly = await monthly(page);
  expect(baseMonthly).toBeGreaterThan(0);

  // 4. Swap PTZ Standard → PTZ NDI: every value recalculates, no reload
  await camera.getByRole("radio", { name: "NDI" }).click();
  await expect(camera.getByRole("radio", { name: "NDI" })).toHaveAttribute("aria-checked", "true");
  const ndiMonthly = await monthly(page);
  expect(ndiMonthly).toBeGreaterThan(baseMonthly);

  // 5. 2 → 3 cameras
  await camera.getByRole("button", { name: "Aumentar Câmera PTZ" }).click();
  await expect(camera.getByRole("group", { name: "Câmera PTZ" })).toContainText("3");
  const threeCameras = await monthly(page);
  expect(threeCameras).toBeGreaterThan(ndiMonthly);

  // 6. Higher upfront lowers the monthly payment
  await page.getByRole("group", { name: "Entrada (%)" }).getByRole("button", { name: "50%" }).click();
  const higherUpfront = await monthly(page);
  expect(higherUpfront).toBeLessThan(threeCameras);

  // 7. 24 → 36 months lowers it again
  await page.getByRole("radiogroup", { name: "Prazo" }).getByRole("radio", { name: "36" }).click();
  const longerTerm = await monthly(page);
  expect(longerTerm).toBeLessThan(higherUpfront);

  // Seller mode shows internal data discreetly
  await expect(page.getByTestId("internal-summary")).toBeVisible();
  await waitSaved(page);

  // 8. Client mode: costs and margins disappear from the DOM (not just hidden)
  await page.getByTestId("enter-client-mode").click();
  await expect(page.getByTestId("exit-client-mode")).toBeVisible();
  await expect(page.getByTestId("internal-summary")).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Navegação principal" })).toHaveCount(0);
  const html = await page.content();
  for (const marker of INTERNAL_MARKERS) expect(html, `client mode leaked "${marker}"`).not.toContain(marker);
  expect(await monthly(page)).toBe(longerTerm);

  // Refreshing in client mode stays in client mode (no flash of internal data)
  await page.reload();
  await expect(page.getByTestId("exit-client-mode")).toBeVisible();
  expect(await page.content()).not.toContain("Resumo interno");

  // 9. Generate the proposal preview
  await page.getByTestId("generate-proposal").first().click();
  await page.waitForURL(/\/preview$/);
  const document = page.getByTestId("proposal-document");
  await expect(document).toContainText(churchName);
  await expect(document).toContainText("Câmera PTZ NDI");
  await expect(document).toContainText("36");
  for (const marker of ["Custo", "Margem", "Lucro"]) expect(await document.textContent()).not.toContain(marker);

  // Leave client mode
  await page.getByRole("button", { name: "Sair do modo cliente" }).click();
  await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeVisible();

  // 10. Saved: reopen later and find the same configuration
  await page.goto("/proposals");
  await page.getByRole("link", { name: new RegExp(churchName) }).first().click();
  await page.waitForURL(proposalUrl);
  const reopened = page.getByTestId("product-camera-ptz");
  await expect(reopened.getByRole("radio", { name: "NDI" })).toHaveAttribute("aria-checked", "true");
  await expect(reopened.getByRole("group", { name: "Câmera PTZ" })).toContainText("3");
  await expect(page.getByRole("radiogroup", { name: "Prazo" }).getByRole("radio", { name: "36" })).toHaveAttribute("aria-checked", "true");
  expect(await monthly(page)).toBe(longerTerm);

  // 11. Duplicate
  await page.getByRole("button", { name: "Mais ações" }).click();
  await page.getByRole("menuitem", { name: "Duplicar" }).click();
  await page.waitForURL((url) => isConfiguratorUrl(url) && url.href !== proposalUrl);
  const copy = page.getByTestId("product-camera-ptz");
  await expect(copy.getByRole("radio", { name: "NDI" })).toHaveAttribute("aria-checked", "true");
  await expect(copy.getByRole("group", { name: "Câmera PTZ" })).toContainText("3");
  expect(await monthly(page)).toBe(longerTerm);
});

test("negotiation warns internally when the margin drops below the minimum", async ({ page }) => {
  await login(page);
  await page.goto("/proposals");
  await page.getByRole("link", { name: /Igreja Batista de Leiria/ }).first().click();
  await page.getByTestId("open-negotiation").click();
  const desired = page.getByRole("textbox", { name: "Mensalidade desejada" });
  await desired.fill("60");
  await desired.press("Enter");
  await expect(page.getByRole("alert").filter({ hasText: /Margem abaixo do limite|prejuízo/i }).first()).toBeVisible();

  // Back to the automatic monthly payment (keeps demo data intact)
  await page.getByRole("button", { name: "Automática" }).click();
  await expect(page.getByRole("alert").filter({ hasText: /prejuízo/i })).toHaveCount(0);
  await waitSaved(page);
});

test("public share link shows only commercial data", async ({ page, browser }) => {
  await login(page);
  await page.goto("/proposals?status=open");
  await page.getByRole("link", { name: /Igreja da Graça Aveiro/ }).first().click();
  await page.waitForURL(isConfiguratorUrl);
  await page.goto(`${page.url()}/preview`);
  await page.getByRole("button", { name: "Mais ações" }).click();
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("menuitem", { name: "Copiar link" }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toMatch(/\/p\/[\w-]{16,}$/);

  const anonymous = await browser.newContext();
  const client = await anonymous.newPage();
  const response = await client.goto(link);
  const body = (await response?.text()) ?? "";
  for (const key of ["internalCost", "grossMargin", "grossProfit", "internalUnitCost", "pricingSnapshot", "breakEvenMonth"]) {
    expect(body, `public page leaked ${key}`).not.toContain(key);
  }
  await expect(client.getByTestId("proposal-document")).toBeVisible();
  await expect(client.getByRole("button", { name: "Aceitar e assinar" })).toBeVisible();
  await anonymous.close();
});
