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

  // Geldi → Gelmedi → Mazeret: birinci bir kez, ikinci iki kez, üçüncü üç kez dokunulur
  await cells.nth(0).click();
  await cells.nth(1).click();
  await cells.nth(1).click();
  await cells.nth(2).click();
  await cells.nth(2).click();
  await cells.nth(2).click();
  await expect(cells.nth(0)).toHaveAccessibleName(new RegExp(`${day}: Geldi$`));
  await expect(cells.nth(1)).toHaveAccessibleName(new RegExp(`${day}: Gelmedi$`));
  await expect(cells.nth(2)).toHaveAccessibleName(new RegExp(`${day}: Mazeret$`));
  await expect(page.getByText(/^1\/\d+$/).last()).toBeVisible();

  // Sayfa yenilenince işaretler kalıcı
  await page.waitForTimeout(500);
  await page.reload();
  await expect(cells.nth(0)).toHaveAccessibleName(new RegExp(`${day}: Geldi$`));
  await expect(cells.nth(1)).toHaveAccessibleName(new RegExp(`${day}: Gelmedi$`));
  await expect(cells.nth(2)).toHaveAccessibleName(new RegExp(`${day}: Mazeret$`));

  // Öğrenciyi "Ayrıldı" yap: listenin altına iner, ekip sayısından düşer
  const heading = page.getByText(/\d+ öğrenci/).first();
  const before = Number((await heading.innerText()).match(/(\d+) öğrenci/)![1]);
  await page.getByRole("button", { name: /Durumu değiştir/ }).last().click();
  await page.getByRole("dialog").getByRole("button", { name: "Ayrıldı" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Kaydet" }).click();
  await expect(page.getByText(/Ekipten ayrılanlar \(\d+\)/)).toBeVisible();
  await expect(heading).toHaveText(new RegExp(`${before - 1} öğrenci`));

  // Lider yönetim ekranına giremez
  await page.goto("/yonetim");
  await expect(page).toHaveURL(/\/ekibim$/);

  const adminPage = await (await browser.newContext()).newPage();
  await login(adminPage, "yonetici@ornek.test");
  await expect(adminPage).toHaveURL(/\/yonetim$/);
  await adminPage.getByRole("navigation", { name: "Ekipler" }).getByRole("link", { name: "Deniz Ak · 10" }).click();
  await expect(adminPage.getByRole("heading", { name: "Deniz Ak · 10" })).toBeVisible();
  await expect(adminPage.getByText("Workshop").last()).toBeVisible();
  await expect(adminPage.getByText(/^1\/\d+$/).last()).toBeVisible();
});

test("davetsiz kullanıcı erişemez", async ({ page }) => {
  await login(page, "davetsiz@ornek.test");
  await expect(page).toHaveURL(/\/erisim-yok$/);
  await expect(page.getByText("Erişiminiz yok")).toBeVisible();
});
