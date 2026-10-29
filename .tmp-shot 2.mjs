import { chromium } from "@playwright/test";
const S = "/private/tmp/claude-501/-Users-affanbugra-Desktop-Coding-Tayfa/54d9d123-41fa-406e-9f9a-8102c6b1c937/scratchpad";
const browser = await chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
async function login(email, width = 1400) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("SAYFA HATASI:", e.message));
  await page.goto("http://localhost:3100/giris");
  await page.getByPlaceholder("E-posta").fill(email);
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await page.waitForLoadState("networkidle");
  return page;
}
const admin = await login("yonetici@ornek.test");
await admin.goto("http://localhost:3100/yonetim/etkinlikler");
await admin.waitForLoadState("networkidle");
await admin.screenshot({ path: S + "/e1-matris.png" });
await admin.getByRole("button", { name: "Önerileri boşlara uygula" }).click();
await admin.getByRole("heading", { name: "Haftalık plan" }).scrollIntoViewIfNeeded();
await admin.screenshot({ path: S + "/e2-plan.png" });
console.log("özet:", await admin.getByText("Hiç yapılmamış ekip-etkinlik eşleşmesi:").innerText());
await admin.getByRole("button", { name: "Planı kaydet" }).click();
await admin.getByText("Plan kaydedildi").waitFor({ timeout: 15000 });
console.log("kayıt:", await admin.getByText("Plan kaydedildi").innerText());
const leader = await login("lider@ornek.test");
await leader.waitForLoadState("networkidle");
await leader.screenshot({ path: S + "/e3-lider.png" });
console.log("lider planlandı etiketi:", await leader.getByText("Planlandı", { exact: true }).count());
await browser.close();
