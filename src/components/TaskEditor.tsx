import { useState, type FormEvent } from "react";
import { priorities, statuses, type Project, type Task } from "../domain/model";
import { Modal } from "./Modal";

export const statusLabels = {
  todo: "To do",
  doing: "In progress",
  blocked: "Blocked",
  done: "Done",
};
export function TaskEditor({
  task,
  projects,
  onSave,
  onClose,
  onDelete,
  onNote,
}: {
  task: Task;
  projects: Project[];
  onSave: (task: Task) => void;
  onClose: () => void;
  onDelete: () => void;
  onNote: () => void;
}) {
  const [draft, setDraft] = useState(task);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const dirty = JSON.stringify(task) !== JSON.stringify(draft);
  const patch = (value: Partial<Task>) => {
    setDraft((current) => ({ ...current, ...value }));
    setConfirmDiscard(false);
  };
  function close() {
    if (dirty && !confirmDiscard) setConfirmDiscard(true);
    else onClose();
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (draft.title.trim()) onSave({ ...draft, title: draft.title.trim() });
  }
  return (
    <Modal title="Task details" onClose={close}>
      <form onSubmit={submit} className="form-stack">
        <label>
          Task title
          <input
            autoFocus
            data-autofocus
            required
            maxLength={300}
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
        </label>
        <label>
          Description
          <textarea
            rows={4}
            maxLength={100000}
            value={draft.description}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder="What does the next step look like?"
          />
        </label>
        <div className="form-grid">
          <label>
            Status
            <select
              value={draft.status}
              onChange={(e) =>
                patch({ status: e.target.value as Task["status"] })
              }
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {statusLabels[s]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Project
            <select
              value={draft.projectId ?? ""}
              onChange={(e) => patch({ projectId: e.target.value || null })}
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.archivedAt ? " (archived)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            Planned day
            <input
              type="date"
              min="0001-01-01"
              max="9999-12-31"
              value={draft.plannedDate ?? ""}
              onChange={(e) => patch({ plannedDate: e.target.value || null })}
            />
          </label>
          <label>
            Due date
            <input
              type="date"
              min="0001-01-01"
              max="9999-12-31"
              value={draft.dueDate ?? ""}
              onChange={(e) => patch({ dueDate: e.target.value || null })}
            />
          </label>
          <label>
            Estimate (minutes)
            <input
              type="number"
              min={0}
              max={1000000}
              step={1}
              value={draft.estimateMinutes ?? ""}
              onChange={(e) =>
                patch({
                  estimateMinutes:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </label>
          <label>
            Priority
            <select
              value={draft.priority}
              onChange={(e) =>
                patch({ priority: e.target.value as Task["priority"] })
              }
            >
              {priorities.map((p) => (
                <option key={p} value={p}>
                  {p === "none"
                    ? "No priority"
                    : p[0].toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="field-help">
          Planned day is when you intend to work. Due date is the deadline.
        </p>
        {confirmDiscard && (
          <div role="alert" className="notice">
            You have unsaved changes. Close again to discard them, or save the
            task.
          </div>
        )}
        <div className="button-row task-save-actions">
          <button className="primary" type="submit">
            Save task
          </button>
          <button type="button" onClick={close}>
            Cancel
          </button>
        </div>
        <div className="dialog-footer">
          <button type="button" disabled={dirty} onClick={onNote}>
            Write linked note
          </button>
          <button
            type="button"
            className="danger"
            disabled={dirty}
            onClick={onDelete}
          >
            Delete task
          </button>
        </div>
        {dirty && (
          <small>
            Save or discard your changes before writing a linked note or
            deleting this task.
          </small>
        )}
      </form>
    </Modal>
  );
}
