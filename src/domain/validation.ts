import { priorities, statuses, type ExportEnvelope } from "./model";
import { validDate } from "./dates";

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
function fail(path: string, message: string): never {
  throw new Error(`${path}: ${message}`);
}
function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(path, "expected an object.");
  return value as Record<string, unknown>;
}
function text(
  value: unknown,
  path: string,
  required = false,
): asserts value is string {
  if (
    typeof value !== "string" ||
    value.length > 100_000 ||
    (required && !value.trim())
  )
    fail(
      path,
      "expected valid text" + (required ? " that is not empty." : "."),
    );
}
function instant(value: unknown, path: string, nullable = false) {
  if (nullable && value === null) return;
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) ||
    !Number.isFinite(Date.parse(value)) ||
    !validDate(value.slice(0, 10)) ||
    new Date(value).toISOString().slice(0, 19) !== value.slice(0, 19)
  )
    fail(path, "expected a UTC timestamp.");
}
export function validateExport(value: unknown): ExportEnvelope {
  const root = record(value, "Workspace");
  if (root.schemaVersion !== 1)
    fail("schemaVersion", "only version 1 is supported.");
  instant(root.exportedAt, "exportedAt");
  const ids = new Set<string>();
  const groups: Record<string, Record<string, unknown>[]> = {};
  for (const group of ["projects", "tasks", "notes"]) {
    const values = root[group];
    if (!Array.isArray(values) || values.length > 10_000)
      fail(group, "expected an array with at most 10,000 records.");
    groups[group] = values.map((entry, index) => {
      const path = `${group}[${index}]`;
      const item = record(entry, path);
      text(item.id, `${path}.id`, true);
      if (ids.has(item.id)) fail(`${path}.id`, "duplicate ID.");
      ids.add(item.id);
      instant(item.createdAt, `${path}.createdAt`);
      instant(item.updatedAt, `${path}.updatedAt`);
      text(
        item[group === "projects" ? "name" : "title"],
        `${path}.${group === "projects" ? "name" : "title"}`,
        true,
      );
      text(
        item[group === "notes" ? "body" : "description"],
        `${path}.${group === "notes" ? "body" : "description"}`,
      );
      return item;
    });
  }
  const projectIds = new Set(groups.projects.map((p) => p.id));
  const taskIds = new Set(groups.tasks.map((t) => t.id));
  const ref = (value: unknown, valid: Set<unknown>, path: string) => {
    if (value !== null && (typeof value !== "string" || !valid.has(value)))
      fail(path, "reference must point to an included record or be null.");
  };
  groups.projects.forEach((p, index) =>
    instant(p.archivedAt, `projects[${index}].archivedAt`, true),
  );
  groups.tasks.forEach((t, index) => {
    const path = `tasks[${index}]`;
    ref(t.projectId, projectIds, `${path}.projectId`);
    if (!(statuses as readonly unknown[]).includes(t.status))
      fail(`${path}.status`, "expected todo, doing, blocked, or done.");
    if (!(priorities as readonly unknown[]).includes(t.priority))
      fail(`${path}.priority`, "unknown priority.");
    for (const field of ["plannedDate", "dueDate"])
      if (t[field] !== null && !validDate(t[field]))
        fail(
          `${path}.${field}`,
          "expected a real calendar date (YYYY-MM-DD) or null.",
        );
    if (
      t.estimateMinutes !== null &&
      (typeof t.estimateMinutes !== "number" ||
        !Number.isSafeInteger(t.estimateMinutes) ||
        t.estimateMinutes < 0)
    )
      fail(
        `${path}.estimateMinutes`,
        "expected a nonnegative whole number or null.",
      );
    instant(t.completedAt, `${path}.completedAt`, true);
    if ((t.status === "done") !== (t.completedAt !== null))
      fail(
        `${path}.completedAt`,
        "must be a timestamp for done tasks and null for other tasks.",
      );
  });
  groups.notes.forEach((n, index) => {
    ref(n.projectId, projectIds, `notes[${index}].projectId`);
    ref(n.taskId, taskIds, `notes[${index}].taskId`);
  });
  // Select known fields so imported extra properties cannot enter application state.
  const base = (r: Record<string, unknown>) => ({
    id: r.id,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  });
  return {
    schemaVersion: 1,
    exportedAt: root.exportedAt,
    projects: groups.projects.map((p) => ({
      ...base(p),
      name: p.name,
      description: p.description,
      archivedAt: p.archivedAt,
    })),
    tasks: groups.tasks.map((t) => ({
      ...base(t),
      title: t.title,
      description: t.description,
      projectId: t.projectId,
      status: t.status,
      priority: t.priority,
      plannedDate: t.plannedDate,
      dueDate: t.dueDate,
      estimateMinutes: t.estimateMinutes,
      completedAt: t.completedAt,
    })),
    notes: groups.notes.map((n) => ({
      ...base(n),
      title: n.title,
      body: n.body,
      projectId: n.projectId,
      taskId: n.taskId,
    })),
  } as ExportEnvelope;
}
export function parseImport(content: string): ExportEnvelope {
  if (new TextEncoder().encode(content).length > MAX_IMPORT_BYTES)
    fail("File", "maximum size is 5 MB.");
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    fail("File", "could not read JSON. Choose a TF2Do JSON export.");
  }
  return validateExport(value);
}
