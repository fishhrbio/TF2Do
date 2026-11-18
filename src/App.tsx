import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  addDays,
  carried,
  completedOn,
  formatDay,
  localDate,
  overdue,
  todayGroups,
  weekDays,
} from "./domain/dates";
import { demoWorkspace } from "./domain/demo";
import {
  identity,
  makeTask,
  removeTask,
  updateTask,
  type Note,
  type Project,
  type Task,
} from "./domain/model";
import { useWorkspace } from "./storage/useWorkspace";
import { DataDialog, downloadWorkspace } from "./components/DataDialog";
import { Modal } from "./components/Modal";
import { statusLabels, TaskEditor } from "./components/TaskEditor";

type View = "Today" | "Week" | "Inbox" | "Projects" | "Notes";
const navIcons = {
  Today: "◷",
  Week: "▦",
  Inbox: "⌑",
  Projects: "▤",
  Notes: "≡",
};
export default function App() {
  const {
    workspace: w,
    ready,
    saving,
    loadError,
    saveError,
    commit,
    retry,
    repository,
  } = useWorkspace();
  const [view, setView] = useState<View>("Today");
  const [today, setToday] = useState(localDate);
  const [week, setWeek] = useState(localDate);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [projectDraft, setProjectDraft] = useState<Project | null>(null);
  const [projectDirty, setProjectDirty] = useState(false);
  const [discardProject, setDiscardProject] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [noteId, setNoteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    text: string;
    undo?: () => void;
  } | null>(null);
  const quickRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const task = w.tasks.find((t) => t.id === taskId);
  const selectedProject = w.projects.find((p) => p.id === projectId);
  useEffect(() => {
    const interval = window.setInterval(() => setToday(localDate()), 30_000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement;
      if (
        element.closest('input,textarea,select,[contenteditable="true"],dialog')
      )
        return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  function navigate(next: View, project: string | null = null) {
    setView(next);
    setProjectId(project);
    setNoteId(null);
  }
  function changeTask(id: string, patch: Partial<Task>) {
    commit((current) => ({
      ...current,
      tasks: current.tasks.map((t) => (t.id === id ? updateTask(t, patch) : t)),
    }));
  }
  function completeTask(task: Task) {
    changeTask(task.id, { status: task.status === "done" ? "todo" : "done" });
    setToast({
      text:
        task.status === "done"
          ? "Task reopened."
          : "One step forward. Task completed.",
      undo: () => {
        changeTask(task.id, {
          status: task.status,
          completedAt: task.completedAt,
        });
        setToast(null);
      },
    });
  }
  function deleteTask(task: Task) {
    const linked = w.notes.filter((n) => n.taskId === task.id).map((n) => n.id);
    commit((current) => removeTask(current, task.id));
    setTaskId(null);
    setToast({
      text: "Task deleted. Linked notes were kept.",
      undo: () => {
        commit((current) => ({
          ...current,
          tasks: [...current.tasks, task],
          notes: current.notes.map((n) =>
            linked.includes(n.id) && n.taskId === null
              ? { ...n, taskId: task.id }
              : n,
          ),
        }));
        setToast(null);
      },
    });
  }
  function addTask(event: FormEvent) {
    event.preventDefault();
    if (!quickTitle.trim()) return;
    const next = makeTask(
      quickTitle,
      view === "Today" ? today : null,
      projectId,
    );
    commit((current) => ({ ...current, tasks: [...current.tasks, next] }));
    setQuickTitle("");
    setToast({
      text: `Task added${next.plannedDate ? " to today" : " to Inbox"}.`,
    });
  }
  function addNote(project: string | null, linkedTask: string | null = null) {
    const note: Note = {
      ...identity(),
      title: "Untitled note",
      body: "",
      projectId: project,
      taskId: linkedTask,
    };
    commit((current) => ({ ...current, notes: [note, ...current.notes] }));
    setView("Notes");
    setProjectId(project);
    setNoteId(note.id);
    setTaskId(null);
  }
  function patchNote(id: string, patch: Partial<Note>) {
    commit((current) => ({
      ...current,
      notes: current.notes.map((n) =>
        n.id === id
          ? { ...n, ...patch, updatedAt: new Date().toISOString() }
          : n,
      ),
    }));
  }
  function openProject(project?: Project) {
    setProjectDraft(
      project ?? { ...identity(), name: "", description: "", archivedAt: null },
    );
    setProjectDirty(false);
    setDiscardProject(false);
  }
  function closeProject() {
    if (projectDirty && !discardProject) setDiscardProject(true);
    else setProjectDraft(null);
  }
  const visible = w.tasks.filter(
    (t) =>
      (!projectId || t.projectId === projectId) &&
      (showCompleted || t.status !== "done"),
  );
  const groups = todayGroups(visible, today);
  const days = weekDays(week);
  const notes = w.notes.filter((n) => !projectId || n.projectId === projectId);
  const activeNote = notes.find((n) => n.id === noteId) ?? notes[0];
  const matches = query.trim().toLocaleLowerCase();
  const searchTasks = matches
    ? w.tasks.filter((t) =>
        `${t.title} ${t.description}`.toLocaleLowerCase().includes(matches),
      )
    : [];
  const searchNotes = matches
    ? w.notes.filter((n) =>
        `${n.title} ${n.body}`.toLocaleLowerCase().includes(matches),
      )
    : [];
  function rows(
    tasks: Task[],
    empty = "A little breathing room. Nothing here yet.",
  ) {
    return tasks.length ? (
      <ul className="task-list">
        {tasks.map((t) => (
          <li
            className={`task-row ${t.status === "done" ? "completed" : ""}`}
            key={t.id}
          >
            <button
              className={`complete-button ${t.status === "done" ? "checked" : ""}`}
              aria-label={`${t.status === "done" ? "Reopen" : "Complete"} ${t.title}`}
              onClick={() => completeTask(t)}
            >
              {t.status === "done" ? "✓" : ""}
            </button>
            <button className="task-content" onClick={() => setTaskId(t.id)}>
              <span className="task-title">{t.title}</span>
              <span className="task-meta">
                {t.projectId && (
                  <span className="project-label">
                    <i />
                    {w.projects.find((p) => p.id === t.projectId)?.name}
                  </span>
                )}
                {t.status !== "todo" && (
                  <span
                    className={t.status === "blocked" ? "tag blocked" : "tag"}
                  >
                    {statusLabels[t.status]}
                  </span>
                )}
                {t.priority !== "none" && (
                  <span>
                    {t.priority[0].toUpperCase() + t.priority.slice(1)} priority
                  </span>
                )}
                {t.estimateMinutes !== null && (
                  <span>{t.estimateMinutes} min</span>
                )}
                {t.plannedDate && (
                  <span>
                    {carried(t, today) ? "Planned " : ""}
                    {formatDay(t.plannedDate)}
                  </span>
                )}
                {t.dueDate && (
                  <span className={overdue(t, today) ? "deadline" : ""}>
                    {overdue(t, today) ? "Overdue · " : "Due "}
                    {formatDay(t.dueDate)}
                  </span>
                )}
              </span>
            </button>
            <span className="row-arrow" aria-hidden="true">
              ↗
            </span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="empty-line">{empty}</p>
    );
  }
  const section = (title: string, tasks: Task[], hint?: string) => (
    <section className="task-section">
      <div className="section-heading">
        <h2>{title}</h2>
        <span>{tasks.length.toString().padStart(2, "0")}</span>
      </div>
      {hint && <p className="section-hint">{hint}</p>}
      {rows(tasks)}
    </section>
  );
  if (loadError)
    return (
      <main className="startup">
        <h1>Let’s recover your workspace</h1>
        <p role="alert">{loadError}</p>
        <p>
          Existing storage has not been replaced. Try allowing browser storage
          or closing other TF2Do tabs.
        </p>
        <button onClick={() => location.reload()}>Retry loading</button>
      </main>
    );
  if (!ready)
    return (
      <main className="startup" role="status">
        Opening your notebook…
      </main>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a href="#main" className="skip-link">
          Skip to planner
        </a>
        <div className="brand">
          <img src="./favicon.svg" width="38" height="38" alt="" />
          <div>
            <strong>TF2Do</strong>
            <span>A little structure.</span>
          </div>
        </div>
        <button className="search-launch" onClick={() => setSearchOpen(true)}>
          <span>⌕ &nbsp; Search anything</span>
          <kbd>⌘ K</kbd>
        </button>
        <span className="rail-label">YOUR WORKSPACE</span>
        <nav aria-label="Main navigation">
          {(["Today", "Week", "Inbox", "Projects", "Notes"] as View[]).map(
            (item) => (
              <button
                key={item}
                className={`nav-item ${view === item && !projectId ? "active" : ""}`}
                aria-current={view === item && !projectId ? "page" : undefined}
                onClick={() => navigate(item)}
              >
                <span className="nav-icon" aria-hidden="true">
                  {navIcons[item]}
                </span>
                {item}
                {item === "Inbox" && (
                  <span className="nav-count">
                    {
                      w.tasks.filter(
                        (t) => !t.plannedDate && t.status !== "done",
                      ).length
                    }
                  </span>
                )}
              </button>
            ),
          )}
        </nav>
        <div className="rail-label project-rail-title">
          <span>PROJECTS</span>
          <button
            className="icon-button"
            aria-label="Create project"
            onClick={() => openProject()}
          >
            +
          </button>
        </div>
        <nav aria-label="Projects" className="project-nav">
          {w.projects
            .filter((p) => !p.archivedAt)
            .map((p) => (
              <button
                key={p.id}
                className={`nav-item ${projectId === p.id ? "active" : ""}`}
                onClick={() => navigate("Projects", p.id)}
              >
                <span className="project-dot" />
                {p.name}
              </button>
            ))}
          {!w.projects.some((p) => !p.archivedAt) && (
            <p className="rail-empty">A home for each idea.</p>
          )}
        </nav>
        <div className="rail-bottom">
          <div className="storage-state">
            <span className={`storage-dot ${saveError ? "failed" : ""}`} />
            <span role="status">
              {saveError
                ? "Unsaved changes"
                : saving
                  ? "Saving…"
                  : "Saved in this browser"}
            </span>
          </div>
          <button onClick={() => setDataOpen(true)}>
            Workspace & backups <span>↗</span>
          </button>
          <button onClick={() => setAboutOpen(true)}>
            About TF2Do <span>↗</span>
          </button>
          <small>Developed by Robert Waite</small>
        </div>
      </aside>
      <main id="main" tabIndex={-1}>
        <div className="topbar">
          <span>
            THE RESEARCH NOTEBOOK /{" "}
            {selectedProject ? selectedProject.name : view.toUpperCase()}
          </span>
          <span className="local-pill">Personal · Local storage</span>
        </div>
        {saveError && (
          <div className="notice error save-error" role="alert">
            <strong>Changes are not saved.</strong>
            <p>{saveError}</p>
            <div className="button-row">
              <button onClick={retry}>Retry save</button>
              <button onClick={() => downloadWorkspace(w, "tf2do-unsaved")}>
                Export unsaved work
              </button>
            </div>
          </div>
        )}
        <div className="page-content">
          <header className="page-heading">
            <div>
              <p className="eyebrow">
                {view === "Today"
                  ? formatDay(today, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "SPACE TO THINK. ROOM TO DO."}
              </p>
              <h1>
                {selectedProject?.name ??
                  (view === "Today"
                    ? "Today, one step at a time."
                    : view === "Week"
                      ? "Make room for what matters."
                      : view === "Inbox"
                        ? "A place for the next idea."
                        : view === "Notes"
                          ? "Keep your thoughts close."
                          : "Your work, in perspective.")}
              </h1>
              <p className="page-subtitle">
                {selectedProject?.description ||
                  (view === "Today"
                    ? "A clear view of the work in front of you."
                    : view === "Week"
                      ? "Plan the work. Leave a little breathing room."
                      : view === "Inbox"
                        ? "Capture first. Find the right day later."
                        : view === "Notes"
                          ? "Small notes, right beside the work."
                          : "Bring the moving parts together.")}
              </p>
            </div>
            {view !== "Notes" && (
              <button
                className="primary add-action"
                onClick={() => quickRef.current?.focus()}
              >
                + Add task
              </button>
            )}
            {view === "Notes" && (
              <button className="primary" onClick={() => addNote(projectId)}>
                + Add note
              </button>
            )}
          </header>
          {!w.tasks.length && !w.projects.length && !w.notes.length && (
            <section className="welcome">
              <span className="eyebrow">YOUR NEXT CHAPTER</span>
              <h2>Plan your first task.</h2>
              <p>
                Start small. Capture a task below, or explore a sample research
                week.
              </p>
              <button
                onClick={() => {
                  commit(() => demoWorkspace());
                  setToast({
                    text: "Demo loaded. All sample content is fictional.",
                  });
                }}
              >
                Load demo workspace
              </button>
            </section>
          )}
          {view !== "Notes" && (
            <form className="quick-add" onSubmit={addTask}>
              <span aria-hidden="true">+</span>
              <input
                ref={quickRef}
                aria-label="Quick add task"
                placeholder={
                  view === "Today"
                    ? "What would you like to move forward today?"
                    : "Capture your next task…"
                }
                maxLength={300}
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
              />
              <button type="submit" disabled={!quickTitle.trim()}>
                Add <span aria-hidden="true">↵</span>
              </button>
            </form>
          )}
          {view !== "Notes" && (
            <div className="view-tools">
              <span>
                {visible.filter((t) => t.status !== "done").length} open{" "}
                {projectId ? "in this project" : "in your workspace"}
              </span>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={showCompleted}
                  onChange={(e) => setShowCompleted(e.target.checked)}
                />
                Show completed
              </label>
            </div>
          )}
          {view === "Today" && (
            <>
              {groups.attention.length > 0 &&
                section(
                  "Needs attention",
                  groups.attention,
                  "Past plans and overdue deadlines stay here until you move them forward.",
                )}
              {section("On your page today", groups.planned)}
              {groups.deadlines.length > 0 &&
                section("Due today", groups.deadlines)}
              {groups.blocked.length > 0 &&
                section("Waiting on something", groups.blocked)}
              {showCompleted &&
                section(
                  "Completed today",
                  visible.filter((t) => completedOn(t, today)),
                )}
              <div className="page-footnote">
                <span aria-hidden="true">↳</span> A plan is a starting point.
                You can always change the day.
              </div>
            </>
          )}
          {view === "Inbox" && (
            <>
              {section(
                "Unscheduled",
                visible.filter((t) => !t.plannedDate),
                "Open a task to choose a planned day, set a deadline, or link a project.",
              )}
              <p className="page-footnote">
                Tasks with only a due date stay in Inbox until you plan a day
                for them.
              </p>
            </>
          )}
          {view === "Week" && (
            <>
              <div className="week-navigation">
                <button
                  aria-label="Previous week"
                  onClick={() => setWeek(addDays(days[0], -7))}
                >
                  ←
                </button>
                <h2>
                  {formatDay(days[0])} —{" "}
                  {formatDay(days[6], {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h2>
                <button
                  aria-label="Next week"
                  onClick={() => setWeek(addDays(days[0], 7))}
                >
                  →
                </button>
                <button onClick={() => setWeek(today)}>This week</button>
              </div>
              <div className="week-grid">
                {days.map((day) => (
                  <section
                    className={`day-card ${day === today ? "current-day" : ""}`}
                    key={day}
                  >
                    <header>
                      <span>{formatDay(day, { weekday: "short" })}</span>
                      <strong>{formatDay(day, { day: "numeric" })}</strong>
                    </header>
                    {rows(
                      visible.filter((t) => t.plannedDate === day),
                      "Unplanned space.",
                    )}
                  </section>
                ))}
              </div>
              {section(
                "Past plans & overdue deadlines",
                visible.filter((t) => carried(t, today) || overdue(t, today)),
              )}
              {section(
                "Ready to schedule",
                visible.filter((t) => !t.plannedDate),
              )}
              <p className="page-footnote">
                Use any task’s Planned day field to schedule with the keyboard.
              </p>
            </>
          )}
          {view === "Projects" &&
            (selectedProject ? (
              <>
                <div className="project-toolbar">
                  <span>
                    {
                      w.tasks.filter(
                        (t) => t.projectId === projectId && t.status === "done",
                      ).length
                    }{" "}
                    / {w.tasks.filter((t) => t.projectId === projectId).length}{" "}
                    tasks complete
                    {selectedProject.archivedAt ? " · Archived project" : ""}
                  </span>
                  <button onClick={() => openProject(selectedProject)}>
                    Edit project
                  </button>
                  <button onClick={() => addNote(projectId)}>
                    + Project note
                  </button>
                </div>
                {section("Next steps", visible)}
                <div className="section-heading">
                  <h2>Project notes</h2>
                  <span>{notes.length}</span>
                </div>
                {notes.length ? (
                  notes.map((n) => (
                    <button
                      className="note-preview"
                      key={n.id}
                      onClick={() => {
                        setView("Notes");
                        setNoteId(n.id);
                      }}
                    >
                      <strong>{n.title}</strong>
                      <span>{n.body.slice(0, 150) || "An open page."}</span>
                    </button>
                  ))
                ) : (
                  <p className="empty-line">
                    Keep a thought beside this project.
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="project-toolbar">
                  <button onClick={() => openProject()}>+ New project</button>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={showArchived}
                      onChange={(e) => setShowArchived(e.target.checked)}
                    />
                    Show archived
                  </label>
                </div>
                <div className="project-grid">
                  {w.projects
                    .filter((p) => showArchived || !p.archivedAt)
                    .map((p) => {
                      const tasks = w.tasks.filter((t) => t.projectId === p.id);
                      const done = tasks.filter(
                        (t) => t.status === "done",
                      ).length;
                      return (
                        <button
                          className="project-card"
                          key={p.id}
                          onClick={() => setProjectId(p.id)}
                        >
                          <span className="eyebrow">
                            {p.archivedAt
                              ? "ARCHIVED PROJECT"
                              : "RESEARCH PROJECT"}{" "}
                            <span>↗</span>
                          </span>
                          <h2>{p.name}</h2>
                          <p>{p.description || "Room for your next idea."}</p>
                          <progress
                            value={done}
                            max={tasks.length || 1}
                            aria-label={`${p.name} completion`}
                          />
                          <small>
                            {done} of {tasks.length} tasks complete ·{" "}
                            {w.notes.filter((n) => n.projectId === p.id).length}{" "}
                            notes
                          </small>
                        </button>
                      );
                    })}
                </div>
                {!w.projects.length && (
                  <p className="empty-line">
                    Create a project to give related tasks and notes a home.
                  </p>
                )}
              </>
            ))}
          {view === "Notes" && (
            <>
              <div className="note-filter">
                <label>
                  Project filter
                  <select
                    value={projectId ?? ""}
                    onChange={(e) => {
                      setProjectId(e.target.value || null);
                      setNoteId(null);
                    }}
                  >
                    <option value="">All projects</option>
                    {w.projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.archivedAt ? " (archived)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="notes-layout">
                <div className="note-index" aria-label="Notes">
                  {notes.map((n) => (
                    <button
                      className={n.id === activeNote?.id ? "selected" : ""}
                      key={n.id}
                      onClick={() => setNoteId(n.id)}
                    >
                      <strong>{n.title}</strong>
                      <small>
                        {formatDay(localDate(new Date(n.updatedAt)))}
                      </small>
                    </button>
                  ))}
                </div>
                {activeNote ? (
                  <NoteEditor
                    key={activeNote.id}
                    note={activeNote}
                    projects={w.projects}
                    tasks={w.tasks}
                    onPatch={(patch) => patchNote(activeNote.id, patch)}
                    onDelete={() => {
                      const note = activeNote;
                      commit((current) => ({
                        ...current,
                        notes: current.notes.filter((n) => n.id !== note.id),
                      }));
                      setNoteId(null);
                      setToast({
                        text: "Note deleted.",
                        undo: () => {
                          commit((current) => ({
                            ...current,
                            notes: [note, ...current.notes],
                          }));
                          setToast(null);
                        },
                      });
                    }}
                  />
                ) : (
                  <div className="empty-notes">
                    <h2>A blank page can be useful.</h2>
                    <p>
                      Add a note to collect a thought, question, or next step.
                    </p>
                    <button onClick={() => addNote(projectId)}>
                      Create your first note
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <footer className="main-footer">
          <span>TF2Do / A little structure for your research.</span>
          <span>v0.1.0</span>
        </footer>
      </main>
      {task && (
        <TaskEditor
          key={task.id}
          task={task}
          projects={w.projects}
          onClose={() => setTaskId(null)}
          onSave={(next) => {
            changeTask(task.id, next);
            setTaskId(null);
          }}
          onDelete={() => deleteTask(task)}
          onNote={() => addNote(task.projectId, task.id)}
        />
      )}
      {projectDraft && (
        <Modal
          title={
            w.projects.some((p) => p.id === projectDraft.id)
              ? "Edit project"
              : "New project"
          }
          onClose={closeProject}
        >
          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault();
              if (!projectDraft.name.trim()) return;
              const next = {
                ...projectDraft,
                name: projectDraft.name.trim(),
                updatedAt: new Date().toISOString(),
              };
              commit((current) => ({
                ...current,
                projects: current.projects.some((p) => p.id === next.id)
                  ? current.projects.map((p) => (p.id === next.id ? next : p))
                  : [...current.projects, next],
              }));
              setProjectDraft(null);
              navigate("Projects", next.id);
            }}
          >
            <label>
              Project name
              <input
                autoFocus
                data-autofocus
                required
                maxLength={200}
                value={projectDraft.name}
                onChange={(e) => {
                  setProjectDraft({ ...projectDraft, name: e.target.value });
                  setProjectDirty(true);
                  setDiscardProject(false);
                }}
              />
            </label>
            <label>
              Description
              <textarea
                value={projectDraft.description}
                maxLength={100000}
                rows={4}
                onChange={(e) => {
                  setProjectDraft({
                    ...projectDraft,
                    description: e.target.value,
                  });
                  setProjectDirty(true);
                  setDiscardProject(false);
                }}
              />
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={!!projectDraft.archivedAt}
                onChange={(e) => {
                  setProjectDraft({
                    ...projectDraft,
                    archivedAt: e.target.checked
                      ? new Date().toISOString()
                      : null,
                  });
                  setProjectDirty(true);
                  setDiscardProject(false);
                }}
              />
              Archive this project
            </label>
            <p className="field-help">
              Archived projects leave the sidebar. Their tasks and notes remain
              available.
            </p>
            {discardProject && (
              <p role="alert" className="notice">
                Unsaved changes. Close again to discard, or save the project.
              </p>
            )}
            <div className="button-row">
              <button type="submit" className="primary">
                Save project
              </button>
              <button type="button" onClick={closeProject}>
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
      {dataOpen && (
        <DataDialog
          workspace={w}
          disabled={saving || !!saveError}
          recovery={() => repository.recovery()}
          onClose={() => setDataOpen(false)}
          onReplace={(next) => {
            commit(
              () => ({
                schemaVersion: 1,
                projects: next.projects,
                tasks: next.tasks,
                notes: next.notes,
              }),
              true,
            );
            setDataOpen(false);
            setProjectId(null);
            setTaskId(null);
            setNoteId(null);
            setToast(null);
            setView("Today");
          }}
        />
      )}
      {aboutOpen && (
        <Modal
          title="A little structure for your research."
          onClose={() => setAboutOpen(false)}
        >
          <div className="about-copy">
            <p className="eyebrow">TF2Do · VERSION 0.1.0</p>
            <p>
              TF2Do connects the idea of transcription factor TFII with the
              everyday to-do list: a small amount of structure that helps the
              next step happen.
            </p>
            <h3>Developed by Robert Waite</h3>
            <p>
              Robert Waite is a graduate student in biotechnology at the
              University of South Florida and the sole developer of TF2Do. He is
              building a practical place to organize research tasks, plan a
              week, and keep project notes close to the work.
            </p>
            <h3>A personal workspace</h3>
            <p>
              This version saves to your current browser. Export backups to move
              or protect your work. Accounts, cloud sync, and collaboration are
              future milestones.
            </p>
            <a
              href="https://github.com/fishhrbio"
              target="_blank"
              rel="noreferrer"
            >
              Robert on GitHub ↗
            </a>
          </div>
        </Modal>
      )}
      {searchOpen && (
        <Modal
          title="Find your next step"
          wide
          onClose={() => {
            setSearchOpen(false);
            setQuery("");
          }}
        >
          <label className="search-field">
            Search tasks and notes
            <input
              autoFocus
              data-autofocus
              ref={searchRef}
              placeholder="A title, a phrase, a thought…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="search-results">
            {!matches ? (
              <p className="empty-line">
                Search task titles, descriptions, and note text across all
                projects, including archived work.
              </p>
            ) : (
              <>
                {searchTasks.length > 0 && <h3>Tasks</h3>}
                {searchTasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSearchOpen(false);
                      setQuery("");
                      setTaskId(t.id);
                    }}
                  >
                    <span>{t.title}</span>
                    <small>{statusLabels[t.status]}</small>
                  </button>
                ))}
                {searchNotes.length > 0 && <h3>Notes</h3>}
                {searchNotes.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      setSearchOpen(false);
                      setQuery("");
                      setView("Notes");
                      setProjectId(null);
                      setNoteId(n.id);
                    }}
                  >
                    <span>{n.title}</span>
                    <small>Note</small>
                  </button>
                ))}
                {!searchTasks.length && !searchNotes.length && (
                  <p className="empty-line">
                    No matches yet. Try a different word.
                  </p>
                )}
              </>
            )}
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <span>{toast.text}</span>
          {toast.undo && <button onClick={toast.undo}>Undo</button>}
          <button
            aria-label="Dismiss notification"
            className="icon-button"
            onClick={() => setToast(null)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
function NoteEditor({
  note,
  projects,
  tasks,
  onPatch,
  onDelete,
}: {
  note: Note;
  projects: Project[];
  tasks: Task[];
  onPatch: (patch: Partial<Note>) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(note.title);
  return (
    <section className="note-editor">
      <label>
        Note title
        <input
          value={title}
          maxLength={300}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            if (title.trim()) {
              onPatch({ title: title.trim() });
              setTitle(title.trim());
            } else setTitle(note.title);
          }}
        />
      </label>
      <div className="form-grid">
        <label>
          Project
          <select
            value={note.projectId ?? ""}
            onChange={(e) => onPatch({ projectId: e.target.value || null })}
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Linked task
          <select
            value={note.taskId ?? ""}
            onChange={(e) => onPatch({ taskId: e.target.value || null })}
          >
            <option value="">No linked task</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="note-body-label">
        Your notes
        <textarea
          rows={15}
          maxLength={100000}
          value={note.body}
          onChange={(e) => onPatch({ body: e.target.value })}
          placeholder="A question to come back to. A connection worth keeping. A next step."
        />
      </label>
      <div className="note-editor-footer">
        <small>Text autosaves · Title saves when you leave the field</small>
        <button className="danger" onClick={onDelete}>
          Delete note
        </button>
      </div>
    </section>
  );
}
