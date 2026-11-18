export const statuses = ["todo", "doing", "blocked", "done"] as const;
export const priorities = ["none", "low", "normal", "high"] as const;
export type Status = (typeof statuses)[number];
export type Priority = (typeof priorities)[number];
export interface RecordBase {
  id: string;
  createdAt: string;
  updatedAt: string;
}
export interface Project extends RecordBase {
  name: string;
  description: string;
  archivedAt: string | null;
}
export interface Task extends RecordBase {
  title: string;
  description: string;
  projectId: string | null;
  status: Status;
  plannedDate: string | null;
  dueDate: string | null;
  estimateMinutes: number | null;
  priority: Priority;
  completedAt: string | null;
}
export interface Note extends RecordBase {
  title: string;
  body: string;
  projectId: string | null;
  taskId: string | null;
}
export interface Workspace {
  schemaVersion: 1;
  projects: Project[];
  tasks: Task[];
  notes: Note[];
}
export interface ExportEnvelope extends Workspace {
  exportedAt: string;
}
export const emptyWorkspace = (): Workspace => ({
  schemaVersion: 1,
  projects: [],
  tasks: [],
  notes: [],
});
export const identity = (): RecordBase => {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), createdAt: now, updatedAt: now };
};
export function makeTask(
  title: string,
  plannedDate: string | null = null,
  projectId: string | null = null,
): Task {
  return {
    ...identity(),
    title: title.trim(),
    description: "",
    projectId,
    plannedDate,
    dueDate: null,
    status: "todo",
    estimateMinutes: null,
    priority: "none",
    completedAt: null,
  };
}
export function updateTask(task: Task, patch: Partial<Task>): Task {
  const now = new Date().toISOString();
  const status = patch.status ?? task.status;
  return {
    ...task,
    ...patch,
    id: task.id,
    updatedAt: now,
    completedAt:
      status === "done" ? (patch.completedAt ?? task.completedAt ?? now) : null,
  };
}
export function removeTask(workspace: Workspace, id: string): Workspace {
  return {
    ...workspace,
    tasks: workspace.tasks.filter((t) => t.id !== id),
    notes: workspace.notes.map((n) =>
      n.taskId === id
        ? { ...n, taskId: null, updatedAt: new Date().toISOString() }
        : n,
    ),
  };
}
