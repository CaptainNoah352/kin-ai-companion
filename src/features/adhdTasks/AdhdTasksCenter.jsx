import {
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  FileCheck2,
  Filter,
  Flag,
  GripVertical,
  ListPlus,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Sparkles,
  TimerReset,
  Trash2,
  Undo2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { buildKinApiUrl, shouldUseKinApiBackend } from "../../lib/runtimeMode.js";
import { createGoal } from "../goals/goalService.js";
import {
  addSubtask,
  addTask,
  addTaskTab,
  bulkUpdateTasks,
  createDefaultAdhdTasks,
  deleteTaskTab,
  exportTasksAsCsv,
  exportTasksAsIcs,
  exportTasksAsMarkdown,
  getVisibleTasks,
  moveTask,
  removeTask,
  renameTaskTab,
  setActiveTaskTab,
  setTaskCompleted,
  summarizeAdhdTasks,
  taskCategories,
  taskPriorities,
  updateTask,
} from "./adhdTaskService.js";
import { createBrowserTaskBreakdown } from "./taskBreakdownClient.js";

const emptyDraft = { title: "", category: "other", priority: "normal", estimateMinutes: "" };

export function AdhdTasksCenter({
  taskState,
  setTaskState,
  setGoals,
  onOpenStart,
  userOpenRouter,
  apiMode = "demo",
}) {
  const state = useMemo(() => createDefaultAdhdTasks(taskState), [taskState]);
  const [draft, setDraft] = useState(emptyDraft);
  const [spiciness, setSpiciness] = useState(3);
  const [filterCategory, setFilterCategory] = useState("all");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [openMenuTaskId, setOpenMenuTaskId] = useState("");
  const [editDrafts, setEditDrafts] = useState({});
  const [newTabName, setNewTabName] = useState("");
  const [history, setHistory] = useState({ undo: [], redo: [] });
  const [isBreakingDown, setIsBreakingDown] = useState(false);
  const [notice, setNotice] = useState("");
  const summary = useMemo(() => summarizeAdhdTasks(state), [state]);
  const visibleTasks = useMemo(
    () => getVisibleTasks(state, { category: filterCategory, hideCompleted }),
    [state, filterCategory, hideCompleted],
  );
  const activeTab = state.tabs.find((tab) => tab.id === state.activeTabId) || state.tabs[0];
  const realAiAvailable =
    (shouldUseKinApiBackend() && (apiMode === "openrouter" || apiMode === "openai")) ||
    (!shouldUseKinApiBackend() && Boolean(userOpenRouter?.apiKey));

  function applyChange(updater) {
    setTaskState((current) => {
      const normalized = createDefaultAdhdTasks(current);
      const next = updater(normalized);
      setHistory((existing) => ({
        undo: [normalized, ...existing.undo].slice(0, 20),
        redo: [],
      }));
      return next;
    });
  }

  function addManualTask() {
    if (!draft.title.trim()) return;
    applyChange((current) => addTask(current, draft));
    setDraft(emptyDraft);
    setNotice("");
  }

  async function breakDownTask() {
    const title = draft.title.trim();
    if (!title || !realAiAvailable || isBreakingDown) return;
    setIsBreakingDown(true);
    setNotice("");
    try {
      const task = shouldUseKinApiBackend()
        ? await fetchServerTaskBreakdown({ task: title, spiciness })
        : await createBrowserTaskBreakdown({ task: title, spiciness, userOpenRouter });
      applyChange((current) => addTask(current, task));
      setDraft(emptyDraft);
    } catch (error) {
      setNotice(error.message || "Task breakdown could not be created.");
    } finally {
      setIsBreakingDown(false);
    }
  }

  function undo() {
    if (!history.undo.length) return;
    const [previous, ...rest] = history.undo;
    setTaskState(previous);
    setHistory({ undo: rest, redo: [state, ...history.redo].slice(0, 20) });
  }

  function redo() {
    if (!history.redo.length) return;
    const [next, ...rest] = history.redo;
    setTaskState(next);
    setHistory({ undo: [state, ...history.undo].slice(0, 20), redo: rest });
  }

  function exportList(format) {
    const base = slugify(activeTab.name || "kin-tasks");
    if (format === "markdown") downloadText(`${base}.md`, exportTasksAsMarkdown(state), "text/markdown");
    if (format === "todoist") downloadText(`${base}-todoist.csv`, exportTasksAsCsv(state, { target: "todoist" }), "text/csv");
    if (format === "csv") downloadText(`${base}.csv`, exportTasksAsCsv(state), "text/csv");
    if (format === "ical-tasks") downloadText(`${base}-tasks.ics`, exportTasksAsIcs(state), "text/calendar");
    if (format === "ical-events") downloadText(`${base}-schedule.ics`, exportTasksAsIcs(state, { asEvents: true }), "text/calendar");
  }

  function makeGoal(task) {
    const firstOpenChild = task.childIds.map((id) => state.tasks[id]).find((child) => child && !child.completed);
    setGoals((current) => [
      createGoal({
        title: task.title,
        nextStep: firstOpenChild?.title || task.title,
        mode: "task_breakdown",
      }),
      ...(Array.isArray(current) ? current : []),
    ]);
    setNotice("Added to Goals.");
  }

  return (
    <section className="surface-section tasks-section">
      <div className="section-heading">
        <h2>Tasks</h2>
        <p>Break down tasks, keep tiny steps visible, and move straight into Start or Goals.</p>
      </div>

      <section className="task-capture-panel" aria-label="Create task">
        <label className="field-block task-capture-field">
          <span>What needs doing?</span>
          <input
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            placeholder="Example: clean the kitchen, file taxes, reply to Sam"
          />
        </label>
        <div className="task-capture-grid">
          <label>
            <span>Spiciness</span>
            <input
              type="range"
              min="1"
              max="5"
              value={spiciness}
              onChange={(event) => setSpiciness(Number(event.target.value))}
            />
            <strong>{spiciness}</strong>
          </label>
          <label>
            <span>Category</span>
            <select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}>
              {taskCategories.map((category) => (
                <option value={category} key={category}>{category}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Priority</span>
            <select value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value }))}>
              {taskPriorities.map((priority) => (
                <option value={priority} key={priority}>{priority}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="button-row">
          <button className="primary-button primary-button--auto" type="button" onClick={breakDownTask} disabled={!draft.title.trim() || !realAiAvailable || isBreakingDown}>
            <Sparkles size={16} />
            {isBreakingDown ? "Breaking down..." : "Magic breakdown"}
          </button>
          <button className="secondary-button secondary-button--auto" type="button" onClick={addManualTask} disabled={!draft.title.trim()}>
            <Plus size={16} />
            Add task
          </button>
        </div>
        {!realAiAvailable && <div className="notice-strip">Connect OpenRouter or configure the local AI provider to use Magic breakdown.</div>}
        {notice && <div className="notice-strip">{notice}</div>}
      </section>

      <section className="task-toolbar" aria-label="Task controls">
        <div className="task-tabs" role="tablist" aria-label="Task lists">
          {state.tabs.map((tab) => (
            <button
              className={state.activeTabId === tab.id ? "task-tab active" : "task-tab"}
              type="button"
              role="tab"
              aria-selected={state.activeTabId === tab.id}
              key={tab.id}
              onClick={() => applyChange((current) => setActiveTaskTab(current, tab.id))}
            >
              {tab.name}
            </button>
          ))}
        </div>
        <div className="task-tab-edit">
          <input value={newTabName} onChange={(event) => setNewTabName(event.target.value)} placeholder="New list" />
          <button className="secondary-button secondary-button--auto" type="button" onClick={() => {
            applyChange((current) => addTaskTab(current, newTabName || "New list"));
            setNewTabName("");
          }}>
            <ListPlus size={16} />
            Add list
          </button>
          <button className="ghost-button" type="button" onClick={() => {
            const nextName = newTabName.trim();
            if (!nextName) return;
            applyChange((current) => renameTaskTab(current, activeTab.id, nextName));
            setNewTabName("");
          }}>
            Rename
          </button>
          <button className="ghost-button" type="button" onClick={() => applyChange((current) => deleteTaskTab(current, activeTab.id))}>
            Delete list
          </button>
        </div>
        <div className="task-filter-row">
          <Filter size={16} />
          <select value={filterCategory} onChange={(event) => setFilterCategory(event.target.value)} aria-label="Filter category">
            <option value="all">all</option>
            {taskCategories.map((category) => (
              <option value={category} key={category}>{category}</option>
            ))}
          </select>
          <label className="checkbox-row">
            <input type="checkbox" checked={hideCompleted} onChange={(event) => setHideCompleted(event.target.checked)} />
            Hide done
          </label>
        </div>
      </section>

      <div className="task-stats-row">
        <StatPill label="Open" value={summary.open} />
        <StatPill label="Done" value={summary.completed} />
        <StatPill label="Minutes" value={summary.estimatedMinutes} />
      </div>

      <section className="task-list-panel" aria-label="ADHD tasks">
        {!visibleTasks.length && (
          <div className="empty-state">
            <FileCheck2 size={26} />
            <p>No tasks in this view.</p>
          </div>
        )}
        {visibleTasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            tasks={state.tasks}
            depth={0}
            openMenuTaskId={openMenuTaskId}
            setOpenMenuTaskId={setOpenMenuTaskId}
            editDrafts={editDrafts}
            setEditDrafts={setEditDrafts}
            onChange={applyChange}
            onOpenStart={onOpenStart}
            onMakeGoal={makeGoal}
          />
        ))}
      </section>

      <section className="task-bottom-actions" aria-label="Task actions">
        <button type="button" onClick={undo} disabled={!history.undo.length} title="Undo">
          <Undo2 size={17} />
          Undo
        </button>
        <button type="button" onClick={redo} disabled={!history.redo.length} title="Redo">
          <RotateCcw size={17} />
          Redo
        </button>
        <button type="button" onClick={() => applyChange((current) => bulkUpdateTasks(current, "mark-incomplete"))}>
          <Check size={17} />
          Mark open
        </button>
        <button type="button" onClick={() => applyChange((current) => bulkUpdateTasks(current, "clear-estimates"))}>
          <CalendarClock size={17} />
          Clear time
        </button>
        <button type="button" onClick={() => applyChange((current) => bulkUpdateTasks(current, "clear-completed"))}>
          <Trash2 size={17} />
          Clear done
        </button>
        <button type="button" onClick={() => exportList("markdown")}>
          <Download size={17} />
          Markdown
        </button>
        <button type="button" onClick={() => exportList("todoist")}>
          <Download size={17} />
          Todoist
        </button>
        <button type="button" onClick={() => exportList("csv")}>
          <Download size={17} />
          CSV
        </button>
        <button type="button" onClick={() => exportList("ical-tasks")}>
          <Download size={17} />
          iCal tasks
        </button>
        <button type="button" onClick={() => exportList("ical-events")}>
          <Download size={17} />
          iCal events
        </button>
      </section>
    </section>
  );
}

function TaskRow({
  task,
  tasks,
  depth,
  openMenuTaskId,
  setOpenMenuTaskId,
  editDrafts,
  setEditDrafts,
  onChange,
  onOpenStart,
  onMakeGoal,
}) {
  const isMenuOpen = openMenuTaskId === task.id;
  const editDraft = editDrafts[task.id] || {};
  const children = task.childIds.map((id) => tasks[id]).filter(Boolean);
  const visibleChildren = task.collapsed ? [] : children;

  function setDraft(updates) {
    setEditDrafts((current) => ({
      ...current,
      [task.id]: { ...current[task.id], ...updates },
    }));
  }

  return (
    <article className={`task-row task-row--depth-${Math.min(depth, 3)} ${task.completed ? "task-row--done" : ""}`}>
      <div className="task-row-main">
        <button className="task-icon-button" type="button" onClick={() => onChange((current) => moveTask(current, task.id, "up"))} title="Move up">
          <GripVertical size={16} />
        </button>
        <input
          className="task-check"
          type="checkbox"
          checked={task.completed}
          onChange={(event) => onChange((current) => setTaskCompleted(current, task.id, event.target.checked))}
          aria-label={`Complete ${task.title}`}
        />
        <button className="task-icon-button" type="button" onClick={() => onChange((current) => updateTask(current, task.id, { collapsed: !task.collapsed }))} disabled={!children.length} aria-label={task.collapsed ? "Expand task" : "Collapse task"}>
          {task.collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </button>
        <div className="task-row-copy">
          <strong>{task.title}</strong>
          <small>
            {task.category} · {task.priority}{task.estimateMinutes ? ` · ${task.estimateMinutes}m` : ""}
          </small>
        </div>
        <button className="task-icon-button" type="button" onClick={() => setOpenMenuTaskId(isMenuOpen ? "" : task.id)} aria-label="Task menu">
          <MoreHorizontal size={18} />
        </button>
      </div>

      {isMenuOpen && (
        <div className="task-menu-panel">
          <div className="task-menu-grid">
            <input value={editDraft.title ?? task.title} onChange={(event) => setDraft({ title: event.target.value })} aria-label="Task title" />
            <select value={editDraft.category ?? task.category} onChange={(event) => setDraft({ category: event.target.value })}>
              {taskCategories.map((category) => (
                <option value={category} key={category}>{category}</option>
              ))}
            </select>
            <select value={editDraft.priority ?? task.priority} onChange={(event) => setDraft({ priority: event.target.value })}>
              {taskPriorities.map((priority) => (
                <option value={priority} key={priority}>{priority}</option>
              ))}
            </select>
            <input type="number" min="1" max="1440" value={editDraft.estimateMinutes ?? task.estimateMinutes ?? ""} onChange={(event) => setDraft({ estimateMinutes: event.target.value })} placeholder="Minutes" />
          </div>
          <div className="button-row">
            <button className="secondary-button secondary-button--auto" type="button" onClick={() => {
              onChange((current) => updateTask(current, task.id, editDraft));
              setOpenMenuTaskId("");
            }}>
              Save
            </button>
            <button className="secondary-button secondary-button--auto" type="button" onClick={() => onOpenStart?.(children.find((child) => !child.completed)?.title || task.title)}>
              <TimerReset size={16} />
              Start
            </button>
            <button className="secondary-button secondary-button--auto" type="button" onClick={() => onMakeGoal(task)}>
              <Flag size={16} />
              Make Goal
            </button>
            <button className="ghost-button" type="button" onClick={() => onChange((current) => addSubtask(current, task.id, { title: editDraft.newSubtask || "New tiny step" }))}>
              Add subtask
            </button>
            <button className="ghost-button" type="button" onClick={() => onChange((current) => moveTask(current, task.id, "up"))}>Up</button>
            <button className="ghost-button" type="button" onClick={() => onChange((current) => moveTask(current, task.id, "down"))}>Down</button>
            <button className="ghost-button ghost-button--danger" type="button" onClick={() => onChange((current) => removeTask(current, task.id))}>
              Delete
            </button>
          </div>
          <input className="task-subtask-input" value={editDraft.newSubtask || ""} onChange={(event) => setDraft({ newSubtask: event.target.value })} placeholder="Subtask title" />
        </div>
      )}

      {!!visibleChildren.length && (
        <div className="task-child-list">
          {visibleChildren.map((child) => (
            <TaskRow
              key={child.id}
              task={child}
              tasks={tasks}
              depth={depth + 1}
              openMenuTaskId={openMenuTaskId}
              setOpenMenuTaskId={setOpenMenuTaskId}
              editDrafts={editDrafts}
              setEditDrafts={setEditDrafts}
              onChange={onChange}
              onOpenStart={onOpenStart}
              onMakeGoal={onMakeGoal}
            />
          ))}
        </div>
      )}
    </article>
  );
}

function StatPill({ label, value }) {
  return (
    <div className="stat-pill">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

async function fetchServerTaskBreakdown({ task, spiciness }) {
  if (!shouldUseKinApiBackend()) {
    throw new Error("Add a user-owned OpenRouter key in Privacy / Sync to use Magic breakdown without a Kin API backend.");
  }
  const response = await fetch(buildKinApiUrl("/api/adhd/tasks/breakdown"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, spiciness }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Task breakdown could not be created.");
  return data;
}

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function slugify(value) {
  return String(value || "kin-tasks").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
