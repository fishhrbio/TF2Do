import { emptyWorkspace, type Workspace } from "../domain/model";
import { validateExport } from "../domain/validation";

export interface WorkspaceRepository {
  load(): Promise<Workspace>;
  save(workspace: Workspace, backup?: boolean): Promise<void>;
  recovery(): Promise<Workspace | null>;
  close(): void;
}
type Stored = { workspace: Workspace; revision: number };
export class IndexedDBRepository implements WorkspaceRepository {
  private db: IDBDatabase | null = null;
  private revision = 0;
  constructor(private readonly databaseName = "tf2do") {}
  private async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.databaseName, 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("workspace");
      request.onblocked = () =>
        reject(
          new Error("Close other TF2Do tabs, then reload to update storage."),
        );
      request.onerror = () =>
        reject(request.error ?? new Error("Browser storage is unavailable."));
      request.onsuccess = () => {
        this.db = request.result;
        this.db.onversionchange = () => this.close();
        resolve(this.db);
      };
    });
  }
  private async read(key: string): Promise<Stored | undefined> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("workspace", "readonly");
      const request = tx.objectStore("workspace").get(key);
      tx.oncomplete = () => resolve(request.result as Stored | undefined);
      tx.onabort = () =>
        reject(tx.error ?? new Error("Could not read workspace."));
      tx.onerror = () =>
        reject(tx.error ?? new Error("Could not read workspace."));
    });
  }
  private validated(workspace: Workspace): Workspace {
    const { exportedAt: _, ...clean } = validateExport({
      ...workspace,
      exportedAt: new Date().toISOString(),
    });
    return clean;
  }
  async load(): Promise<Workspace> {
    const stored = await this.read("current");
    if (!stored) {
      this.revision = 0;
      return emptyWorkspace();
    }
    const workspace = this.validated(stored.workspace);
    this.revision = stored.revision;
    return workspace;
  }
  async save(workspace: Workspace, backup = false): Promise<void> {
    const clean = this.validated(workspace);
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("workspace", "readwrite");
      const store = tx.objectStore("workspace");
      const request = store.get("current");
      let reason: Error | null = null;
      const nextRevision = this.revision + 1;
      request.onsuccess = () => {
        const current = request.result as Stored | undefined;
        if ((current?.revision ?? 0) !== this.revision) {
          reason = new Error(
            "Another tab saved changes. Export your unsaved work, then reload this tab to avoid overwriting it.",
          );
          tx.abort();
          return;
        }
        if (backup)
          store.put(
            current ?? { workspace: emptyWorkspace(), revision: 0 },
            "recovery",
          );
        store.put(
          { workspace: clean, revision: nextRevision } satisfies Stored,
          "current",
        );
      };
      tx.oncomplete = () => {
        this.revision = nextRevision;
        resolve();
      };
      tx.onabort = () =>
        reject(
          reason ??
            tx.error ??
            new Error("Could not save. Browser storage may be full."),
        );
      tx.onerror = () =>
        reject(reason ?? tx.error ?? new Error("Could not save workspace."));
    });
  }
  async recovery(): Promise<Workspace | null> {
    const stored = await this.read("recovery");
    return stored ? this.validated(stored.workspace) : null;
  }
  close() {
    this.db?.close();
    this.db = null;
  }
}
