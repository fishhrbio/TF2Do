import { describe, expect, it } from "vitest";
import {
  addDays,
  completedOn,
  localDate,
  todayGroups,
  validDate,
  weekDays,
} from "../src/domain/dates";
import { demoWorkspace } from "../src/domain/demo";
import { makeTask, removeTask, updateTask } from "../src/domain/model";
import { parseImport, validateExport } from "../src/domain/validation";

const exported = () => ({
  ...demoWorkspace("2026-11-18"),
  exportedAt: "2026-11-18T12:00:00Z",
});
describe("calendar dates and task semantics", () => {
  it("keeps local calendar days across DST and year boundaries", () => {
    expect(addDays("2026-03-07", 2)).toBe("2026-03-09");
    expect(addDays("2026-10-31", 2)).toBe("2026-11-02");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(localDate(new Date(2026, 10, 18, 23, 59))).toBe("2026-11-18");
    expect(weekDays("2027-01-03")).toEqual([
      "2026-12-28",
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
      "2027-01-03",
    ]);
  });
  it("rejects normalized impossible dates and accepts leap days", () => {
    expect(validDate("2026-02-29")).toBe(false);
    expect(validDate("2028-02-29")).toBe(true);
    expect(validDate("2026-13-01")).toBe(false);
    expect(validDate("0000-01-01")).toBe(false);
    expect(validDate("0099-01-01")).toBe(true);
  });
  it("groups completions by the local day rather than the UTC date", () => {
    const originalTimezone = process.env.TZ;
    process.env.TZ = "America/New_York";
    try {
      const task = {
        ...makeTask("Late evening"),
        status: "done" as const,
        completedAt: "2026-11-19T02:30:00Z",
      };
      expect(completedOn(task, "2026-11-18")).toBe(true);
      expect(completedOn(task, "2026-11-19")).toBe(false);
    } finally {
      if (originalTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimezone;
    }
  });
  it("restores the original completion timestamp when undoing a reopen", () => {
    const original = {
      ...makeTask("Already done"),
      status: "done" as const,
      completedAt: "2026-11-17T12:00:00Z",
    };
    const reopened = updateTask(original, { status: "todo" });
    expect(
      updateTask(reopened, {
        status: original.status,
        completedAt: original.completedAt,
      }).completedAt,
    ).toBe(original.completedAt);
  });
  it("keeps past plans and overdue deadlines visible without duplicating today", () => {
    const old = makeTask("Past plan", "2026-11-17");
    const due = { ...makeTask("Deadline"), dueDate: "2026-11-17" };
    const current = makeTask("Today", "2026-11-18");
    const both = { ...makeTask("Both", "2026-11-18"), dueDate: "2026-11-17" };
    const done = updateTask(old, { status: "done" });
    const groups = todayGroups([old, due, current, both, done], "2026-11-18");
    expect(groups.attention.map((t) => t.title)).toEqual([
      "Past plan",
      "Deadline",
      "Both",
    ]);
    expect(groups.planned.map((t) => t.title)).toEqual(["Today"]);
  });
  it("sets completion timestamps, clears them on reopen, and detaches notes on delete", () => {
    const w = demoWorkspace("2026-11-18");
    const task = w.tasks[0];
    expect(updateTask(task, { status: "done" }).completedAt).toBeTruthy();
    expect(
      updateTask(updateTask(task, { status: "done" }), { status: "todo" })
        .completedAt,
    ).toBeNull();
    const next = removeTask(w, task.id);
    expect(next.tasks.find((t) => t.id === task.id)).toBeUndefined();
    expect(next.notes[0].taskId).toBeNull();
    expect(next.notes[0].body).toBe(w.notes[0].body);
  });
});
describe("export boundary", () => {
  it("round-trips all IDs, links, statuses, and dates", () => {
    const original = exported();
    expect(parseImport(JSON.stringify(original))).toEqual(original);
  });
  it.each([
    [
      "unsupported schema",
      (w: ReturnType<typeof exported>) => {
        w.schemaVersion = 7 as 1;
      },
      /schemaVersion/,
    ],
    [
      "invalid date",
      (w: ReturnType<typeof exported>) => {
        w.tasks[0].plannedDate = "2026-02-30";
      },
      /plannedDate/,
    ],
    [
      "negative estimate",
      (w: ReturnType<typeof exported>) => {
        w.tasks[0].estimateMinutes = -1;
      },
      /estimateMinutes/,
    ],
    [
      "duplicate id",
      (w: ReturnType<typeof exported>) => {
        w.tasks[0].id = w.projects[0].id;
      },
      /duplicate/,
    ],
    [
      "dangling project",
      (w: ReturnType<typeof exported>) => {
        w.tasks[0].projectId = "missing";
      },
      /projectId/,
    ],
    [
      "dangling task",
      (w: ReturnType<typeof exported>) => {
        w.notes[0].taskId = "missing";
      },
      /taskId/,
    ],
    [
      "inconsistent completion",
      (w: ReturnType<typeof exported>) => {
        w.tasks[0].status = "done";
      },
      /completedAt/,
    ],
    [
      "unknown status",
      (w: ReturnType<typeof exported>) => {
        w.tasks[0].status = "waiting" as "todo";
      },
      /status/,
    ],
    [
      "invalid instant",
      (w: ReturnType<typeof exported>) => {
        w.exportedAt = "2026-02-30T12:00:00Z";
      },
      /exportedAt/,
    ],
  ])("rejects %s", (_name, modify, message) => {
    const value = exported();
    modify(value);
    expect(() => validateExport(value)).toThrow(message);
  });
  it("rejects broken JSON and oversized files with actionable errors", () => {
    expect(() => parseImport("{")).toThrow(/could not read JSON/);
    expect(() => parseImport(" ".repeat(5 * 1024 * 1024 + 1))).toThrow(/5 MB/);
  });
});
