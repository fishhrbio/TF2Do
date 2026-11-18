import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { IndexedDBRepository } from "../src/storage/repository";
import { demoWorkspace } from "../src/domain/demo";
import { emptyWorkspace } from "../src/domain/model";

describe("IndexedDB persistence", () => {
  it("starts empty and persists a full workspace across repository instances", async () => {
    const name = crypto.randomUUID();
    const first = new IndexedDBRepository(name);
    expect(await first.load()).toEqual(emptyWorkspace());
    const original = demoWorkspace("2026-11-18");
    await first.save(original);
    first.close();
    const second = new IndexedDBRepository(name);
    expect(await second.load()).toEqual(original);
    second.close();
  });
  it("atomically replaces data and retains the pre-import recovery copy", async () => {
    const repo = new IndexedDBRepository(crypto.randomUUID());
    await repo.load();
    const original = demoWorkspace();
    await repo.save(original);
    await repo.save(emptyWorkspace(), true);
    expect(await repo.load()).toEqual(emptyWorkspace());
    expect(await repo.recovery()).toEqual(original);
    repo.close();
  });
  it("rejects an invalid replacement without touching current or recovery data", async () => {
    const repo = new IndexedDBRepository(crypto.randomUUID());
    await repo.load();
    const original = demoWorkspace();
    await repo.save(original);
    const invalid = structuredClone(original);
    invalid.tasks[0].projectId = "missing";
    await expect(repo.save(invalid, true)).rejects.toThrow(/projectId/);
    expect(await repo.load()).toEqual(original);
    expect(await repo.recovery()).toBeNull();
    repo.close();
  });
  it("rejects a stale tab instead of overwriting newer saved changes", async () => {
    const name = crypto.randomUUID();
    const first = new IndexedDBRepository(name);
    const stale = new IndexedDBRepository(name);
    await first.load();
    await stale.load();
    const original = demoWorkspace();
    await first.save(original);
    await expect(stale.save(emptyWorkspace(), true)).rejects.toThrow(
      /Another tab/,
    );
    expect(await first.load()).toEqual(original);
    expect(await first.recovery()).toBeNull();
    first.close();
    stale.close();
  });
});
