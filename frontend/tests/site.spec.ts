import { expect, test } from "@playwright/test";

const record = {
  id: 142,
  title: "King Street housing proposal",
  kind: "project",
  provenance: "official",
  description: "Housing and pedestrian access are being reviewed.",
  tags: ["housing"],
  locations: ["King Street"],
  published_at: "2026-11-04",
  checked_at: "2026-11-13",
  updated_at: "2026-11-13",
  status: "unknown",
  availability: "available",
  source_url: "https://example.org/notice",
  body: "The report identifies pedestrian access as requiring further review.",
  chunks: [
    {
      id: 1,
      page: 3,
      text: "The report identifies pedestrian access as requiring further review.",
    },
  ],
  related_bylaws: [],
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const body =
      path === "/api/facets"
        ? {
            kinds: [{ kind: "project", count: 1 }],
            tags: [{ tag: "housing", count: 1 }],
          }
        : path === "/api/search"
          ? { items: [record], total: 1, limit: 12, offset: 0 }
          : path.endsWith("/revisions/1")
            ? {
                id: 1,
                title: record.title,
                captured_at: "2026-11-04",
                body: "Original housing proposal text.",
              }
            : path.endsWith("/revisions")
              ? [{ id: 1, title: record.title, captured_at: "2026-11-04" }]
              : path === "/api/documents/preview"
                ? { ...record, published: false }
                : path === "/api/documents/upload"
                  ? { id: 142, created: true }
                  : record;
    await route.fulfill({ json: body });
  });
});

test("welcome, search, save, updates, document keyboard tabs and participation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Explore", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Update Board" }),
  ).toBeVisible();
  await page.getByLabel("Item number or keywords").fill("housing");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("heading", { name: record.title })).toBeVisible();
  await page
    .getByRole("button", { name: "Save " + record.title, exact: true })
    .click();
  await page.getByRole("link", { name: "Updates", exact: true }).click();
  await expect(page.getByRole("heading", { name: record.title })).toBeVisible();
  await page.getByRole("link", { name: "View", exact: true }).click();
  await page.getByRole("tab", { name: "At a glance" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Read document" })).toBeFocused();
  await expect(page.getByText(record.body, { exact: true })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await page.getByLabel("Captured version").selectOption("1");
  await expect(page.getByText("Original housing proposal text.")).toBeVisible();
  await page.getByRole("link", { name: "How to comment" }).click();
  await expect(
    page.getByRole("link", { name: "Official participation details" }),
  ).toHaveAttribute("href", record.source_url);
});

test("upload reviews without publishing, then publishes only on confirmation", async ({
  page,
}) => {
  let publishes = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/documents/upload")
      publishes++;
  });
  await page.goto("/#/upload");
  await page.locator("input[type=file]").setInputFiles({
    name: "proposal.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(record.body),
  });
  await page.getByLabel("Document title").fill("Housing report");
  await page.getByRole("button", { name: "Choose file & review" }).click();
  await expect(
    page.getByRole("heading", { name: "Review source text before publishing" }),
  ).toBeVisible();
  expect(publishes).toBe(0);
  await page.getByRole("button", { name: "Back to editing" }).click();
  await expect(page.getByLabel("Document title")).toHaveValue("Housing report");
  await page.getByRole("button", { name: "Save draft details" }).click();
  await expect(page.getByText(/Details saved in this browser/)).toBeVisible();
  await page.getByRole("button", { name: "Choose file & review" }).click();
  await page.getByRole("button", { name: "Publish document" }).click();
  await expect(
    page.getByRole("heading", { name: "Added to the collection" }),
  ).toBeVisible();
  expect(publishes).toBe(1);
});

test("place and reading preferences persist after reload", async ({ page }) => {
  await page.goto("/#/places");
  await page.getByLabel("Home", { exact: true }).fill("King Street");
  await page.getByLabel("housing", { exact: true }).check();
  await page.getByRole("button", { name: "Save preferences" }).click();
  await page.reload();
  await expect(page.getByLabel("Home", { exact: true })).toHaveValue(
    "King Street",
  );
  await expect(
    page.getByRole("link", { name: "King Street", exact: true }),
  ).toHaveAttribute("href", "#/search?location=King%20Street");
  await page.getByRole("link", { name: "Reading & accessibility" }).click();
  await page.getByRole("button", { name: "Large text view" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Large text view" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("pages reflow at 320px and show no runtime errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 320, height: 750 });
  for (const path of [
    "/",
    "/explore",
    "/search",
    "/archive",
    "/item/142",
    "/upload",
    "/places",
    "/updates",
    "/saved",
    "/lookup",
    "/help",
    "/municipal",
    "/events",
    "/accessibility",
    "/participate/142",
    "/missing",
  ]) {
    await page.goto("/#" + path);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      path,
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});

test("mobile menu works by touch and keyboard, and desktop navigation stays visible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Menu", exact: true });
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(navigation).toBeHidden();
  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await expect(navigation).toBeVisible();
  await page.getByRole("link", { name: "My places", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your places & updates" }),
  ).toBeVisible();
  await expect(navigation).toBeHidden();
  await menu.click();
  await page.keyboard.press("Escape");
  await expect(navigation).toBeHidden();
  await expect(menu).toBeFocused();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(navigation).toBeVisible();
  await expect(menu).toBeHidden();
  for (const link of await navigation.locator("a:visible").all()) {
    const box = await link.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});

test("phone, tablet and desktop layouts fit their viewport including large text", async ({
  page,
}) => {
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/",
      "/explore",
      "/search",
      "/item/142",
      "/lookup",
      "/upload",
    ]) {
      await page.goto("/#" + path);
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${width}px ${path}`,
      ).toBe(true);
    }
  }
  await page.setViewportSize({ width: 320, height: 750 });
  await page.goto("/#/accessibility");
  await page.getByRole("button", { name: "Large text view" }).click();
  for (const path of ["/search", "/item/142", "/places", "/upload"]) {
    await page.goto("/#" + path);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `large text ${path}`,
    ).toBe(true);
  }
  await page.screenshot({
    path: test.info().outputPath("phone-upload.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/#/explore");
  await page.screenshot({
    path: test.info().outputPath("desktop-board.png"),
    fullPage: true,
  });
});
