import { useState } from "react";
import type { Workspace } from "../domain/model";
import { MAX_IMPORT_BYTES, parseImport } from "../domain/validation";
import { Modal } from "./Modal";
import { demoWorkspace } from "../domain/demo";

export function downloadWorkspace(workspace: Workspace, name = "tf2do-backup") {
  const blob = new Blob(
    [
      JSON.stringify(
        { ...workspace, exportedAt: new Date().toISOString() },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function DataDialog({
  workspace,
  onClose,
  onReplace,
  recovery,
  disabled,
}: {
  workspace: Workspace;
  onClose: () => void;
  onReplace: (next: Workspace) => void;
  recovery: () => Promise<Workspace | null>;
  disabled: boolean;
}) {
  const [preview, setPreview] = useState<Workspace | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [label, setLabel] = useState("");
  const [reading, setReading] = useState(false);
  function stage(value: Workspace, name: string) {
    setPreview(value);
    setLabel(name);
    setConfirmed(false);
    setError("");
  }
  return (
    <Modal title="Workspace & backups" onClose={onClose}>
      <p>
        Your workspace is saved in this browser. Export a backup regularly,
        especially before clearing browsing data or changing devices.
      </p>
      <div className="button-row">
        <button
          className="primary"
          onClick={() => downloadWorkspace(workspace)}
        >
          Export workspace
        </button>
        <button
          onClick={async () => {
            try {
              const previous = await recovery();
              if (previous)
                downloadWorkspace(previous, "tf2do-before-replacement");
              else setError("No replacement backup exists yet.");
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : "Could not read recovery backup.",
              );
            }
          }}
        >
          Export recovery backup
        </button>
      </div>
      <hr />
      <h3>Restore a workspace</h3>
      <label className="file-label">
        Choose JSON backup (up to 5 MB)
        <input
          type="file"
          accept=".json,application/json"
          disabled={disabled || reading}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setPreview(null);
            setConfirmed(false);
            setError("");
            setReading(true);
            try {
              if (file.size > MAX_IMPORT_BYTES)
                throw new Error("File: maximum size is 5 MB.");
              stage(parseImport(await file.text()), file.name);
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Could not read the file.",
              );
            } finally {
              setReading(false);
            }
          }}
        />
      </label>
      <div className="button-row">
        <button
          disabled={disabled || reading}
          onClick={() => stage(demoWorkspace(), "Demo workspace")}
        >
          Preview demo workspace
        </button>
      </div>
      {disabled && (
        <p className="notice">
          Wait for saving to finish or resolve the save error before replacing
          data.
        </p>
      )}
      {error && (
        <p className="notice error" role="alert">
          {error} Your current workspace has not changed.
        </p>
      )}
      {preview && (
        <section className="import-preview" aria-label="Import preview">
          <h3>{label}</h3>
          <p>
            {preview.projects.length} projects · {preview.tasks.length} tasks ·{" "}
            {preview.notes.length} notes
          </p>
          <p>
            This replaces the current {workspace.tasks.length} tasks,{" "}
            {workspace.projects.length} projects, and {workspace.notes.length}{" "}
            notes. A recovery copy of the previous saved workspace is retained
            in this browser.
          </p>
          <label className="check-label">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            I understand this replaces my current workspace.
          </label>
          <div className="button-row">
            <button
              className="primary"
              disabled={!confirmed || disabled}
              onClick={() => onReplace(preview)}
            >
              Replace workspace
            </button>
            <button
              onClick={() => {
                setPreview(null);
                setConfirmed(false);
              }}
            >
              Cancel import
            </button>
          </div>
        </section>
      )}
      <p className="field-help">
        Backups preserve IDs, links, statuses, and dates. Import is replacement,
        with no merge. Recovery keeps only the most recent replacement backup.
      </p>
    </Modal>
  );
}
