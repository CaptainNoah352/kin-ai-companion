export const taskCategories = ["life", "work", "home", "health", "money", "people", "errands", "learning", "other"];
export const taskPriorities = ["low", "normal", "high", "urgent"];
export const maxSpiciness = 5;

const defaultTabId = "tab-inbox";

export function createDefaultAdhdTasks(state) {
  const base = {
    version: 1,
    activeTabId: defaultTabId,
    tabs: [{ id: defaultTabId, name: "Inbox", taskIds: [] }],
    tasks: {},
  };
  if (!state || typeof state !== "object") return base;

  const tabs = Array.isArray(state.tabs) && state.tabs.length
    ? state.tabs.map(normalizeTab).filter(Boolean)
    : base.tabs;
  const tasks = Object.fromEntries(
    Object.entries(state.tasks || {})
      .map(([id, task]) => [id, normalizeTask({ ...task, id })])
      .filter(([, task]) => task),
  );
  const tabIds = new Set(tabs.map((tab) => tab.id));
  const activeTabId = tabIds.has(state.activeTabId) ? state.activeTabId : tabs[0].id;

  return {
    ...base,
    ...state,
    tabs: tabs.map((tab) => ({
      ...tab,
      taskIds: tab.taskIds.filter((id) => tasks[id] && !tasks[id].parentId),
    })),
    tasks,
    activeTabId,
  };
}

export function createTaskDraft({ title, category = "other", estimateMinutes = null, priority = "normal", subtasks = [] } = {}) {
  const task = normalizeTask({
    id: makeId("task"),
    title,
    category,
    estimateMinutes,
    priority,
    parentId: null,
    childIds: [],
    completed: false,
    collapsed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  if (!task) return null;
  return {
    ...task,
    subtasks: Array.isArray(subtasks)
      ? subtasks.map((subtask) => createTaskDraft(subtask)).filter(Boolean)
      : [],
  };
}

export function addTask(state, taskInput = {}, { tabId } = {}) {
  const current = createDefaultAdhdTasks(state);
  const targetTabId = tabId || current.activeTabId;
  const tabExists = current.tabs.some((tab) => tab.id === targetTabId);
  const nextTabId = tabExists ? targetTabId : current.tabs[0].id;
  const { root, taskMap } = buildTaskTree(taskInput);

  return {
    ...current,
    tasks: { ...current.tasks, ...taskMap },
    tabs: current.tabs.map((tab) =>
      tab.id === nextTabId ? { ...tab, taskIds: [...tab.taskIds, root.id] } : tab,
    ),
    activeTabId: nextTabId,
  };
}

export function addSubtask(state, parentId, taskInput = {}) {
  const current = createDefaultAdhdTasks(state);
  const parent = current.tasks[parentId];
  if (!parent) return current;
  const { root, taskMap } = buildTaskTree({ ...taskInput, parentId });
  return {
    ...current,
    tasks: {
      ...current.tasks,
      [parentId]: touch({ ...parent, collapsed: false, childIds: [...parent.childIds, root.id] }),
      ...taskMap,
    },
  };
}

export function updateTask(state, taskId, updates = {}) {
  const current = createDefaultAdhdTasks(state);
  const task = current.tasks[taskId];
  if (!task) return current;
  return {
    ...current,
    tasks: {
      ...current.tasks,
      [taskId]: touch(normalizeTask({ ...task, ...updates, id: taskId, childIds: task.childIds })),
    },
  };
}

export function removeTask(state, taskId) {
  const current = createDefaultAdhdTasks(state);
  if (!current.tasks[taskId]) return current;
  const removeIds = collectDescendantIds(current.tasks, taskId);
  const removeSet = new Set(removeIds);
  const tasks = Object.fromEntries(Object.entries(current.tasks).filter(([id]) => !removeSet.has(id)));
  const parentId = current.tasks[taskId].parentId;

  if (parentId && tasks[parentId]) {
    tasks[parentId] = touch({ ...tasks[parentId], childIds: tasks[parentId].childIds.filter((id) => id !== taskId) });
  }

  return {
    ...current,
    tasks,
    tabs: current.tabs.map((tab) => ({
      ...tab,
      taskIds: tab.taskIds.filter((id) => id !== taskId),
    })),
  };
}

export function setTaskCompleted(state, taskId, completed) {
  const current = createDefaultAdhdTasks(state);
  if (!current.tasks[taskId]) return current;
  const tasks = { ...current.tasks };
  for (const id of collectDescendantIds(tasks, taskId)) {
    tasks[id] = touch({ ...tasks[id], completed: Boolean(completed), completedAt: completed ? new Date().toISOString() : "" });
  }
  return { ...current, tasks };
}

export function moveTask(state, taskId, direction) {
  const current = createDefaultAdhdTasks(state);
  const task = current.tasks[taskId];
  if (!task) return current;
  const delta = direction === "up" ? -1 : 1;

  if (task.parentId && current.tasks[task.parentId]) {
    const parent = current.tasks[task.parentId];
    const childIds = moveInArray(parent.childIds, taskId, delta);
    return {
      ...current,
      tasks: {
        ...current.tasks,
        [parent.id]: touch({ ...parent, childIds }),
      },
    };
  }

  return {
    ...current,
    tabs: current.tabs.map((tab) =>
      tab.taskIds.includes(taskId) ? { ...tab, taskIds: moveInArray(tab.taskIds, taskId, delta) } : tab,
    ),
  };
}

export function addTaskTab(state, name = "New list") {
  const current = createDefaultAdhdTasks(state);
  const tab = { id: makeId("tab"), name: clean(name) || "New list", taskIds: [] };
  return { ...current, tabs: [...current.tabs, tab], activeTabId: tab.id };
}

export function renameTaskTab(state, tabId, name) {
  const current = createDefaultAdhdTasks(state);
  return {
    ...current,
    tabs: current.tabs.map((tab) => (tab.id === tabId ? { ...tab, name: clean(name) || tab.name } : tab)),
  };
}

export function deleteTaskTab(state, tabId) {
  const current = createDefaultAdhdTasks(state);
  if (current.tabs.length <= 1) return current;
  const tab = current.tabs.find((item) => item.id === tabId);
  if (!tab) return current;
  const removeSet = new Set(tab.taskIds.flatMap((id) => collectDescendantIds(current.tasks, id)));
  const tabs = current.tabs.filter((item) => item.id !== tabId);
  return {
    ...current,
    tabs,
    tasks: Object.fromEntries(Object.entries(current.tasks).filter(([id]) => !removeSet.has(id))),
    activeTabId: current.activeTabId === tabId ? tabs[0].id : current.activeTabId,
  };
}

export function setActiveTaskTab(state, tabId) {
  const current = createDefaultAdhdTasks(state);
  return current.tabs.some((tab) => tab.id === tabId) ? { ...current, activeTabId: tabId } : current;
}

export function bulkUpdateTasks(state, action, { tabId } = {}) {
  const current = createDefaultAdhdTasks(state);
  const targetTab = current.tabs.find((tab) => tab.id === (tabId || current.activeTabId)) || current.tabs[0];
  const targetIds = targetTab.taskIds.flatMap((id) => collectDescendantIds(current.tasks, id));
  const targetSet = new Set(targetIds);
  const tasks = { ...current.tasks };

  if (action === "clear-list") {
    for (const id of targetIds) delete tasks[id];
    return {
      ...current,
      tasks,
      tabs: current.tabs.map((tab) => (tab.id === targetTab.id ? { ...tab, taskIds: [] } : tab)),
    };
  }

  if (action === "clear-completed") {
    let next = current;
    for (const id of targetIds) {
      if (next.tasks[id]?.completed) next = removeTask(next, id);
    }
    return next;
  }

  for (const id of targetIds) {
    if (!tasks[id]) continue;
    if (action === "mark-incomplete") tasks[id] = touch({ ...tasks[id], completed: false, completedAt: "" });
    if (action === "clear-estimates") tasks[id] = touch({ ...tasks[id], estimateMinutes: null });
  }

  return {
    ...current,
    tasks: Object.fromEntries(Object.entries(tasks).map(([id, task]) => [id, targetSet.has(id) ? task : current.tasks[id]])),
  };
}

export function getVisibleTasks(state, { category = "all", hideCompleted = false, tabId } = {}) {
  const current = createDefaultAdhdTasks(state);
  const tab = current.tabs.find((item) => item.id === (tabId || current.activeTabId)) || current.tabs[0];
  return tab.taskIds
    .map((id) => current.tasks[id])
    .filter(Boolean)
    .filter((task) => category === "all" || task.category === category)
    .filter((task) => !hideCompleted || !task.completed);
}

export function summarizeAdhdTasks(state = {}) {
  const current = createDefaultAdhdTasks(state);
  const tasks = Object.values(current.tasks);
  const topLevel = tasks.filter((task) => !task.parentId);
  const completed = tasks.filter((task) => task.completed);
  const estimatedMinutes = tasks.reduce((total, task) => total + Number(task.estimateMinutes || 0), 0);
  const activeTab = current.tabs.find((tab) => tab.id === current.activeTabId) || current.tabs[0];
  return {
    total: tasks.length,
    topLevel: topLevel.length,
    completed: completed.length,
    open: tasks.length - completed.length,
    estimatedMinutes,
    activeTabName: activeTab?.name || "Inbox",
    recentOpenTasks: topLevel.filter((task) => !task.completed).slice(0, 3).map((task) => ({
      title: task.title,
      category: task.category,
      priority: task.priority,
      nextStep: task.childIds.map((id) => current.tasks[id]).find((child) => child && !child.completed)?.title || "",
    })),
  };
}

export function normalizeSpiciness(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 3;
  return Math.min(maxSpiciness, Math.max(1, Math.round(numeric)));
}

export function normalizeBreakdownResponse(value, fallbackTitle = "New task") {
  const parsed = typeof value === "string" ? parseJsonObject(value) : value;
  if (!parsed || typeof parsed !== "object") throw new Error("Task breakdown was not valid JSON.");
  return createTaskDraft({
    title: parsed.title || fallbackTitle,
    category: parsed.category,
    estimateMinutes: parsed.estimateMinutes ?? parsed.estimate,
    priority: parsed.priority,
    subtasks: Array.isArray(parsed.subtasks) ? parsed.subtasks : [],
  });
}

export function exportTasksAsMarkdown(state, { tabId } = {}) {
  const current = createDefaultAdhdTasks(state);
  const tab = current.tabs.find((item) => item.id === (tabId || current.activeTabId)) || current.tabs[0];
  const lines = [`# ${tab.name}`, ""];
  for (const id of tab.taskIds) appendMarkdownTask(lines, current.tasks, id, 0);
  return lines.join("\n").trimEnd();
}

export function exportTasksAsCsv(state, { tabId, target = "generic" } = {}) {
  const current = createDefaultAdhdTasks(state);
  const tab = current.tabs.find((item) => item.id === (tabId || current.activeTabId)) || current.tabs[0];
  const headers = target === "todoist"
    ? ["TYPE", "CONTENT", "DESCRIPTION", "PRIORITY", "INDENT"]
    : ["Title", "Parent", "Completed", "Category", "Priority", "Estimate minutes", "Notes"];
  const rows = [headers];
  for (const id of tab.taskIds) appendCsvTask(rows, current.tasks, id, "", 1, target);
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

export function exportTasksAsIcs(state, { tabId, asEvents = false } = {}) {
  const current = createDefaultAdhdTasks(state);
  const tab = current.tabs.find((item) => item.id === (tabId || current.activeTabId)) || current.tabs[0];
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0, 0);
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Kin//ADHD Tasks//EN"];
  let cursor = tomorrow.getTime();
  for (const id of tab.taskIds) {
    const task = current.tasks[id];
    if (!task) continue;
    const uid = `${task.id}@kin.local`;
    if (asEvents) {
      const start = new Date(cursor);
      const end = new Date(cursor + Math.max(15, Number(task.estimateMinutes || 15)) * 60000);
      lines.push("BEGIN:VEVENT", `UID:${uid}`, `DTSTAMP:${icsDate(now)}`, `DTSTART:${icsDate(start)}`, `DTEND:${icsDate(end)}`, `SUMMARY:${icsEscape(task.title)}`, `DESCRIPTION:${icsEscape(childSummary(current.tasks, task))}`, "END:VEVENT");
      cursor = end.getTime();
    } else {
      lines.push("BEGIN:VTODO", `UID:${uid}`, `DTSTAMP:${icsDate(now)}`, `SUMMARY:${icsEscape(task.title)}`, `DESCRIPTION:${icsEscape(childSummary(current.tasks, task))}`, `STATUS:${task.completed ? "COMPLETED" : "NEEDS-ACTION"}`, "END:VTODO");
    }
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function buildTaskTree(input = {}, parentId = input.parentId || null) {
  const root = normalizeTask({ ...input, id: input.id || makeId("task"), parentId, childIds: [] });
  const taskMap = { [root.id]: root };
  const childIds = [];
  for (const childInput of Array.isArray(input.subtasks) ? input.subtasks : []) {
    const childTree = buildTaskTree(childInput, root.id);
    childIds.push(childTree.root.id);
    Object.assign(taskMap, childTree.taskMap);
  }
  taskMap[root.id] = { ...root, childIds };
  return { root: taskMap[root.id], taskMap };
}

function normalizeTask(task = {}) {
  const now = new Date().toISOString();
  const title = clean(task.title);
  if (!title) return null;
  return {
    id: clean(task.id) || makeId("task"),
    title,
    notes: clean(task.notes),
    completed: Boolean(task.completed),
    category: taskCategories.includes(task.category) ? task.category : "other",
    estimateMinutes: normalizeEstimate(task.estimateMinutes),
    priority: taskPriorities.includes(task.priority) ? task.priority : "normal",
    parentId: task.parentId || null,
    childIds: Array.isArray(task.childIds) ? task.childIds.filter(Boolean) : [],
    collapsed: Boolean(task.collapsed),
    createdAt: task.createdAt || now,
    updatedAt: task.updatedAt || now,
    completedAt: task.completed ? task.completedAt || now : "",
  };
}

function normalizeTab(tab) {
  if (!tab || typeof tab !== "object") return null;
  return {
    id: clean(tab.id) || makeId("tab"),
    name: clean(tab.name) || "List",
    taskIds: Array.isArray(tab.taskIds) ? tab.taskIds.filter(Boolean) : [],
  };
}

function normalizeEstimate(value) {
  if (value === "" || value === null || value === undefined) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.min(1440, Math.round(numeric));
}

function moveInArray(ids, id, delta) {
  const next = [...ids];
  const index = next.indexOf(id);
  if (index < 0) return next;
  const target = index + delta;
  if (target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function collectDescendantIds(tasks, taskId) {
  const task = tasks[taskId];
  if (!task) return [];
  return [taskId, ...task.childIds.flatMap((id) => collectDescendantIds(tasks, id))];
}

function appendMarkdownTask(lines, tasks, taskId, depth) {
  const task = tasks[taskId];
  if (!task) return;
  const meta = [
    task.estimateMinutes ? `${task.estimateMinutes}m` : "",
    task.priority !== "normal" ? task.priority : "",
    task.category !== "other" ? task.category : "",
  ].filter(Boolean);
  lines.push(`${"  ".repeat(depth)}- [${task.completed ? "x" : " "}] ${task.title}${meta.length ? ` (${meta.join(", ")})` : ""}`);
  for (const childId of task.childIds) appendMarkdownTask(lines, tasks, childId, depth + 1);
}

function appendCsvTask(rows, tasks, taskId, parentTitle, depth, target) {
  const task = tasks[taskId];
  if (!task) return;
  if (target === "todoist") {
    rows.push(["task", task.title, childSummary(tasks, task), task.priority === "urgent" ? "4" : task.priority === "high" ? "3" : task.priority === "low" ? "1" : "2", String(depth)]);
  } else {
    rows.push([task.title, parentTitle, task.completed ? "true" : "false", task.category, task.priority, task.estimateMinutes || "", task.notes]);
  }
  for (const childId of task.childIds) appendCsvTask(rows, tasks, childId, task.title, depth + 1, target);
}

function childSummary(tasks, task) {
  return task.childIds.map((id) => tasks[id]?.title).filter(Boolean).join("; ");
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function icsDate(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function icsEscape(value) {
  return String(value || "").replace(/[\\;,]/g, "\\$&").replace(/\n/g, "\\n");
}

function parseJsonObject(value) {
  const text = String(value || "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Task breakdown was not valid JSON.");
  return JSON.parse(text.slice(start, end + 1));
}

function touch(task) {
  return { ...task, updatedAt: new Date().toISOString() };
}

function clean(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function makeId(prefix) {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
