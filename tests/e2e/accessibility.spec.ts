import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations,
    results.violations
      .map(
        (violation) =>
          `${violation.id}: ${violation.help}\n${violation.nodes.map((node) => node.target.join(" ")).join("\n")}`,
      )
      .join("\n\n"),
  ).toEqual([]);
}

test("トップページ", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectNoAxeViolations(page);
});

test("検索ステップ2と現在位置", async ({ page }) => {
  await page.goto("/");
  await page.getByText("生活費がなく生活できない", { exact: true }).click();
  await page.getByRole("button", { name: "地域の選択へ進む" }).click();
  await expect(page.locator('[aria-current="step"]')).toContainText("地域");
  await expectNoAxeViolations(page);
});

test("検索結果", async ({ page }) => {
  await page.goto("/");
  await page.getByText("生活費がなく生活できない", { exact: true }).click();
  await page.getByRole("button", { name: "地域の選択へ進む" }).click();
  await page.getByLabel("都道府県 任意").selectOption("08");
  await page.getByLabel("市区町村 任意").selectOption("ibaraki-mito");
  await page.getByRole("button", { name: /水戸市の相談先を見る/ }).click();
  await expect(page.getByRole("heading", { name: "まず、ここから相談できます" })).toBeVisible();
  await expect(page.locator('[aria-current="step"]')).toContainText("案内を見る");
  await expectNoAxeViolations(page);
});

test("DVカテゴリーハブとEsc終了", async ({ page }) => {
  await page.route("https://weather.yahoo.co.jp/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<title>安全なページ</title>" }),
  );
  await page.goto("/support/category/violence");
  await expect(page.getByRole("heading", { name: "いま、この場で使える相談先" })).toBeVisible();
  await expectNoAxeViolations(page);
  await page.locator("body").focus();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/weather\.yahoo\.co\.jp/);
});

test("こころカテゴリーハブ", async ({ page }) => {
  await page.goto("/support/category/mental");
  await expect(page.getByText("こころの健康相談統一ダイヤル")).toBeVisible();
  await expect(
    page
      .getByRole("heading", { name: "いま、この場で使える相談先" })
      .locator("..")
      .getByRole("link", { name: "厚生労働省 SNS・チャット相談一覧" }),
  ).toBeVisible();
  await expectNoAxeViolations(page);
});

test("自治体×カテゴリページと200%拡大", async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 720 });
  await page.goto("/support/ibaraki-mito/money");
  await expectNoAxeViolations(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
  const contentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(contentWidth).toBeLessThanOrEqual(viewportWidth + 2);
});
