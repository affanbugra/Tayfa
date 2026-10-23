import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/giris");
  await page.getByPlaceholder("E-posta").fill(email);
  await page.getByRole("button", { name: "Giriş yap" }).click();
}

test("lider yoklama alır, yönetim görür", async ({ page, browser }) => {
  await login(page, "lider@ornek.test");
  await expect(page).toHaveURL(/\/ekibim$/);
  await expect(page.getByRole("heading", { name: "Deniz Ak · 10" })).toBeVisible();

  await page.getByRole("link", { name: "Yoklama Al" }).click();
  await page.getByText("Workshop", { exact: true }).click();
  await page.getByRole("button", { name: "Yoklamaya başla" }).click();
  await expect(page).toHaveURL(/\/yoklama\/[0-9a-f-]{36}/);

  await page.getByRole("button", { name: "Tümünü Geldi işaretle" }).click();
  const rows = page.locator("li").filter({ has: page.getByRole("group") });
  const total = await rows.count();
  await rows.nth(0).getByRole("button", { name: "Gelmedi" }).click();
  await rows.nth(1).getByRole("button", { name: "Mazeret" }).click();
  await rows.nth(1).getByPlaceholder("Mazeret açıklaması (isteğe bağlı)").fill("Düğün");
  await rows.nth(1).getByPlaceholder("Mazeret açıklaması (isteğe bağlı)").blur();
  await expect(page.getByText(`Geldi ${total - 2} · Gelmedi 1 · Mazeret 1 · İşaretsiz 0`)).toBeVisible();
  await expect(page.locator('[aria-label="Kaydediliyor"]')).toHaveCount(0);

  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(page).toHaveURL(/\/yoklamalar$/);
  await expect(page.getByText(`${total - 2}/${total}`).first()).toBeVisible();

  // Sayfa yenilenince işaretler kalıcı
  await page.goBack();
  await page.reload();
  await expect(page.getByText(`Geldi ${total - 2} · Gelmedi 1 · Mazeret 1 · İşaretsiz 0`)).toBeVisible();

  // Lider yönetim ekranına giremez
  await page.goto("/yonetim");
  await expect(page).toHaveURL(/\/ekibim$/);

  const adminPage = await (await browser.newContext()).newPage();
  await login(adminPage, "yonetici@ornek.test");
  await expect(adminPage).toHaveURL(/\/yonetim$/);
  await adminPage.getByRole("link", { name: "Deniz Ak · 10" }).first().click();
  await expect(adminPage.getByText("Workshop").first()).toBeVisible();
  await expect(adminPage.getByText(`${total - 2}/${total}`).first()).toBeVisible();
});

test("davetsiz kullanıcı erişemez", async ({ page }) => {
  await login(page, "davetsiz@ornek.test");
  await expect(page).toHaveURL(/\/erisim-yok$/);
  await expect(page.getByText("Erişiminiz yok")).toBeVisible();
});
