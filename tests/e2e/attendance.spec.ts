import { expect, test, type Page } from "@playwright/test";
import { formatDateShort, todayIstanbul } from "../../lib/dates";

async function login(page: Page, email: string) {
  await page.goto("/giris");
  await page.getByPlaceholder("E-posta").fill(email);
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
}

test("lider tabloda yoklama alır, yönetim görür", async ({ page, browser }) => {
  const today = todayIstanbul();
  const day = formatDateShort(today);

  await login(page, "lider@ornek.test");
  await expect(page).toHaveURL(/\/ekibim$/);
  await expect(page.getByRole("heading", { name: "Deniz Ak · 10" })).toBeVisible();

  // Yeni buluşma sütunu
  await page.getByRole("button", { name: "Buluşma", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tarih").fill(today);
  await dialog.getByRole("button", { name: "Workshop" }).click();
  await dialog.getByRole("button", { name: "Kaydet" }).click();
  await expect(dialog).toBeHidden();

  const cells = page.getByRole("button", { name: new RegExp(`, ${day}: `) });
  await expect(cells.first()).toBeVisible();
  const total = await cells.count();

  await page.getByRole("button", { name: "Hepsi geldi" }).click();
  await expect(page.getByRole("button", { name: new RegExp(`, ${day}: Geldi$`) })).toHaveCount(total);

  // İlk öğrenci: Geldi → Gelmedi; ikinci: Geldi → Gelmedi → Mazeret
  await cells.nth(0).click();
  await cells.nth(1).click();
  await cells.nth(1).click();
  await expect(cells.nth(0)).toHaveAccessibleName(new RegExp(`${day}: Gelmedi$`));
  await expect(cells.nth(1)).toHaveAccessibleName(new RegExp(`${day}: Mazeret$`));
  await expect(page.getByText(`${total - 2}/${total}`).last()).toBeVisible();

  // Sayfa yenilenince işaretler kalıcı
  await page.waitForTimeout(500);
  await page.reload();
  await expect(cells.nth(0)).toHaveAccessibleName(new RegExp(`${day}: Gelmedi$`));
  await expect(cells.nth(1)).toHaveAccessibleName(new RegExp(`${day}: Mazeret$`));

  // Lider yönetim ekranına giremez
  await page.goto("/yonetim");
  await expect(page).toHaveURL(/\/ekibim$/);

  const adminPage = await (await browser.newContext()).newPage();
  await login(adminPage, "yonetici@ornek.test");
  await expect(adminPage).toHaveURL(/\/yonetim$/);
  await adminPage.getByRole("navigation", { name: "Ekipler" }).getByRole("link", { name: "Deniz Ak · 10" }).click();
  await expect(adminPage.getByRole("heading", { name: "Deniz Ak · 10" })).toBeVisible();
  await expect(adminPage.getByText("Workshop").last()).toBeVisible();
  await expect(adminPage.getByText(`${total - 2}/${total}`).last()).toBeVisible();
});

test("davetsiz kullanıcı erişemez", async ({ page }) => {
  await login(page, "davetsiz@ornek.test");
  await expect(page).toHaveURL(/\/erisim-yok$/);
  await expect(page.getByText("Erişiminiz yok")).toBeVisible();
});
