import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const saved = (page: Page) =>
  expect(
    page
      .getByRole("status", { name: "", exact: true })
      .filter({ hasText: "Saved in this browser" }),
  ).toBeVisible();
async function addTask(page: Page, title: string) {
  await page.getByRole("textbox", { name: "Quick add task" }).fill(title);
  await page.getByRole("textbox", { name: "Quick add task" }).press("Enter");
}
test("full planning loop persists tasks, dates, notes, archive, completion, and undo", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByText("Plan your first task.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Project name", exact: true })
    .fill("Research questions");
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Today" })
    .click();
  for (const title of [
    "Plan question",
    "Read review",
    "Prepare meeting",
    "Review feedback",
    "Unscheduled thought",
  ])
    await addTask(page, title);
  await page
    .getByRole("button", { name: "Plan question", exact: false })
    .filter({ has: page.locator(".task-title") })
    .click();
  await page
    .getByRole("combobox", { name: "Project", exact: true })
    .selectOption({ label: "Research questions" });
  await page
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("blocked");
  await page.getByLabel("Due date", { exact: true }).fill("2020-01-01");
  await page.getByLabel("Estimate (minutes)", { exact: true }).fill("45");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Needs attention" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Unscheduled thought", exact: false })
    .filter({ has: page.locator(".task-title") })
    .click();
  await page.getByLabel("Planned day", { exact: true }).fill("");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await page
    .getByRole("button", { name: "Complete Read review", exact: true })
    .click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Complete Read review", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Complete Read review", exact: true })
    .click();
  await page.getByLabel("Show completed", { exact: true }).check();
  await page
    .getByRole("button", { name: "Reopen Read review", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Plan question", exact: false })
    .filter({ has: page.locator(".task-title") })
    .click();
  await page
    .getByRole("button", { name: "Write linked note", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Note title", exact: true })
    .fill("Questions to revisit");
  await page
    .getByRole("textbox", { name: "Your notes", exact: true })
    .fill("Keep the question focused. <script>alert(1)</script>");
  await saved(page);
  await page.reload();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Notes", exact: false })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Your notes", exact: true }),
  ).toHaveValue("Keep the question focused. <script>alert(1)</script>");
  await expect(
    page.getByRole("combobox", { name: "Linked task", exact: true }),
  ).toHaveValue(/.+/);
  await page
    .getByRole("button", { name: "Search anything", exact: false })
    .click();
  await page
    .getByRole("textbox", { name: "Search tasks and notes", exact: true })
    .fill("focused");
  await expect(
    page.getByRole("button", {
      name: "Questions to revisit Note",
      exact: true,
    }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Inbox", exact: false })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Complete Unscheduled thought",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Unscheduled thought", exact: false })
    .filter({ has: page.locator(".task-title") })
    .click();
  await page.getByRole("button", { name: "Delete task", exact: true }).click();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Complete Unscheduled thought",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Projects", exact: true })
    .getByRole("button", { name: "Research questions", exact: true })
    .click();
  await page.getByRole("button", { name: "Edit project", exact: true }).click();
  await page.getByLabel("Archive this project", { exact: true }).check();
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await expect(
    page
      .getByRole("navigation", { name: "Projects", exact: true })
      .getByRole("button", { name: "Research questions", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Edit project", exact: true }).click();
  await page.getByLabel("Archive this project", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await expect(
    page
      .getByRole("navigation", { name: "Projects", exact: true })
      .getByRole("button", { name: "Research questions", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("export/import round-trip, invalid and cancelled imports, and recovery", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Load demo workspace", exact: true })
    .click();
  await saved(page);
  await page
    .getByRole("button", { name: "Workspace & backups", exact: false })
    .click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export workspace", exact: true })
    .click();
  const file = await download;
  const original = JSON.parse(await readFile((await file.path())!, "utf8"));
  const empty = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    projects: [],
    tasks: [],
    notes: [],
  };
  const input = page.locator("input[type=file]");
  await input.setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"schemaVersion":9}'),
  });
  await expect(page.getByRole("alert")).toContainText("schemaVersion");
  await input.setInputFiles({
    name: "empty.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(empty)),
  });
  await expect(
    page.getByRole("button", { name: "Replace workspace", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Cancel import", exact: true })
    .click();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Complete Read two papers for the review",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Workspace & backups", exact: false })
    .click();
  await input.setInputFiles({
    name: "empty.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(empty)),
  });
  await page
    .getByRole("checkbox", {
      name: "I understand this replaces my current workspace.",
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Replace workspace", exact: true })
    .click();
  await saved(page);
  await expect(
    page.getByText("Plan your first task.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Workspace & backups", exact: false })
    .click();
  const recovery = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export recovery backup", exact: true })
    .click();
  const recovered = JSON.parse(
    await readFile((await (await recovery).path())!, "utf8"),
  );
  expect(recovered.tasks).toEqual(original.tasks);
  expect(recovered.notes).toEqual(original.notes);
  await input.setInputFiles({
    name: "restore.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(original)),
  });
  await page
    .getByRole("checkbox", {
      name: "I understand this replaces my current workspace.",
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Replace workspace", exact: true })
    .click();
  await saved(page);
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "Complete Read two papers for the review",
      exact: true,
    }),
  ).toBeVisible();
});
test("keyboard editing, modal focus return, and dirty form protection", async ({
  page,
}) => {
  await page.goto("/");
  await addTask(page, "Keyboard task");
  const open = page
    .locator(".task-content")
    .filter({ hasText: "Keyboard task" });
  await open.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("textbox", { name: "Task title", exact: true }),
  ).toBeFocused();
  const today = await page
    .getByLabel("Planned day", { exact: true })
    .inputValue();
  await page.getByLabel("Due date", { exact: true }).fill(today);
  await page.getByRole("button", { name: "Save task", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(open).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Due date", { exact: true })).toHaveValue(today);
  await page
    .getByRole("textbox", { name: "Task title", exact: true })
    .fill("Unsaved title");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("alert")).toContainText("unsaved");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(open).toBeFocused();
});
test("demo desktop/mobile layouts and screenshot evidence", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Load demo workspace", exact: true })
    .click();
  await saved(page);
  await page
    .getByRole("button", { name: "Dismiss notification", exact: true })
    .click();
  if (process.env.TF2DO_CAPTURE_SCREENSHOTS)
    await page.screenshot({
      path: "docs/screenshots/today.png",
      fullPage: true,
    });
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Week", exact: false })
    .click();
  if (process.env.TF2DO_CAPTURE_SCREENSHOTS)
    await page.screenshot({
      path: "docs/screenshots/week.png",
      fullPage: true,
    });
  await page.setViewportSize({ width: 360, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  if (process.env.TF2DO_CAPTURE_SCREENSHOTS)
    await page.screenshot({
      path: "docs/screenshots/mobile.png",
      fullPage: true,
    });
  await page.locator(".task-content").first().click();
  await expect(
    page.getByRole("button", { name: "Save task", exact: true }),
  ).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("retrying a failed workspace replacement still saves the original recovery copy", async ({
  page,
}) => {
  await page.goto("/");
  await addTask(page, "Keep in recovery");
  await saved(page);
  await page.evaluate(() => {
    const original = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (storeNames, mode, options) {
      const transaction = original.call(this, storeNames, mode, options);
      if (mode === "readwrite") {
        IDBDatabase.prototype.transaction = original;
        queueMicrotask(() => transaction.abort());
      }
      return transaction;
    };
  });
  await page.getByRole("button", { name: /Workspace & backups/ }).click();
  await page.getByRole("button", { name: "Preview demo workspace" }).click();
  await page
    .getByRole("checkbox", { name: /I understand this replaces/ })
    .check();
  await page.getByRole("button", { name: "Replace workspace" }).click();
  await expect(page.getByRole("alert")).toContainText("Changes are not saved");
  await page.getByRole("button", { name: "Retry save" }).click();
  await saved(page);
  await page.getByRole("button", { name: /Workspace & backups/ }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export recovery backup" }).click();
  const restoredFile = await (await download).path();
  const recovery = JSON.parse(await readFile(restoredFile!, "utf8"));
  expect(recovery.tasks.map((task: { title: string }) => task.title)).toEqual([
    "Keep in recovery",
  ]);
});
