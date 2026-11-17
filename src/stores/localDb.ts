import type { Comment, Notification, Priority, Task, TaskStatus } from "../types/academic";
import { buildSeed, type MockDatabase } from "./mockData";

const STORAGE_KEY = "atm.mock.v1";

const listeners = new Set<() => void>();

function canUseStorage() {
  return typeof localStorage !== "undefined";
}

function normalizeStoredDb(value: unknown): MockDatabase | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const stored = value as Partial<MockDatabase>;
  const seed = buildSeed();
  return {
    ...seed,
    ...stored,
    seq: typeof stored.seq === "number" && Number.isFinite(stored.seq) ? stored.seq : seed.seq,
    schools: Array.isArray(stored.schools) ? stored.schools : seed.schools,
    departments: Array.isArray(stored.departments) ? stored.departments : seed.departments,
    courses: Array.isArray(stored.courses) ? stored.courses : seed.courses,
    units: Array.isArray(stored.units) ? stored.units : seed.units,
    tasks: Array.isArray(stored.tasks) ? stored.tasks : seed.tasks,
    submissions: Array.isArray(stored.submissions) ? stored.submissions : seed.submissions,
    notifications: Array.isArray(stored.notifications) ? stored.notifications : seed.notifications,
    members: Array.isArray(stored.members) ? stored.members : seed.members,
  };
}

export function readDb(): MockDatabase {
  if (!canUseStorage()) return buildSeed();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = buildSeed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const normalized = normalizeStoredDb(JSON.parse(raw) as unknown);
    if (!normalized) throw new Error("Invalid mock database");
    const serialized = JSON.stringify(normalized);
    if (raw !== serialized) localStorage.setItem(STORAGE_KEY, serialized);
    return normalized;
  } catch {
    return buildSeed();
  }
}

export function writeDb(db: MockDatabase) {
  if (canUseStorage()) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }
  listeners.forEach((listener) => listener());
}

export function updateDb(mutator: (db: MockDatabase) => void): MockDatabase {
  const db = readDb();
  mutator(db);
  writeDb(db);
  return db;
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function nextNumericId(db: MockDatabase): string {
  db.seq += 1;
  return String(db.seq);
}

export function normalizeStatus(value: unknown): TaskStatus {
  const raw = String(value ?? "todo").toLowerCase().trim().replace(/\s+/g, "_");
  if (raw === "to_do" || raw === "todo") return "todo";
  if (raw === "in_progress" || raw === "inprogress") return "in_progress";
  if (raw === "review") return "review";
  if (raw === "done" || raw === "graded" || raw === "completed") return "done";
  return "todo";
}

export function normalizePriority(value: unknown): Priority {
  const raw = String(value ?? "medium").toLowerCase();
  if (raw === "high" || raw === "low" || raw === "medium") return raw;
  return "medium";
}

export function taskDue(task: Task): string {
  return task.dueDate || task.due_date || "";
}

export function tasksForUnit(db: MockDatabase, unitId: string | null | undefined): Task[] {
  if (!unitId || unitId === "undefined") return db.tasks;
  return db.tasks.filter((task) => String(task.unitId) === String(unitId));
}

export function deriveReport(db: MockDatabase, unitId?: string | null) {
  const allUnits = !unitId || unitId === "global" || unitId === "undefined";
  const scoped = allUnits
    ? db.tasks
    : db.tasks.filter((task) => String(task.unitId) === String(unitId));
  const ids = new Set(scoped.map((task) => String(task.id)));
  const submissions = allUnits
    ? db.submissions
    : db.submissions.filter((submission) => ids.has(String(submission.task)));

  const now = Date.now();
  const overdue = scoped.filter((task) => {
    if (normalizeStatus(task.status) === "done") return false;
    const due = new Date(taskDue(task)).getTime();
    return !Number.isNaN(due) && due < now;
  }).length;

  const pending = submissions.filter((submission) => normalizeStatus(submission.status) !== "done").length;
  const onTime = submissions.filter((submission) => {
    if (normalizeStatus(submission.status) !== "done" || !submission.submitted_at) return false;
    const task = db.tasks.find((item) => String(item.id) === String(submission.task));
    if (!task) return false;
    return new Date(submission.submitted_at).getTime() <= new Date(taskDue(task)).getTime();
  }).length;

  const total = scoped.length || 1;
  const submissionRate = Math.min(100, Math.round((submissions.length / total) * 100));
  const onTimeRatio = submissions.length ? Math.round((onTime / submissions.length) * 100) : 0;

  return {
    submissionRate,
    submissionTrend: 4.2,
    onTimeRatio,
    onTimeTrend: 1.8,
    pendingReviews: pending,
    urgentReviews: Math.min(overdue, 3),
    overdueFeedback: overdue,
    overdueTrend: overdue > 0 ? -2 : 0,
  };
}

export function pushNotification(
  db: MockDatabase,
  input: Pick<Notification, "title" | "message" | "type">,
) {
  const item: Notification = {
    id: `n${nextNumericId(db)}`,
    title: input.title,
    message: input.message,
    type: input.type,
    read: false,
    createdAt: new Date().toISOString(),
  };
  db.notifications = [item, ...db.notifications];
  return item;
}

export function commentFromContent(db: MockDatabase, taskId: string, content: string): Comment {
  let author = "smwangi";
  let avatar = "SM";
  try {
    const raw = canUseStorage() ? localStorage.getItem("auth_user") : null;
    if (raw) {
      const user = JSON.parse(raw) as { username?: string; displayName?: string };
      if (user.username) author = user.username;
      const label = user.displayName || user.username || "You";
      avatar = label.slice(0, 2).toUpperCase();
    }
  } catch {
    author = "smwangi";
  }

  return {
    id: `c${nextNumericId(db)}`,
    taskId: String(taskId),
    author,
    avatar,
    content,
    createdAt: new Date().toISOString(),
  };
}

export function findTask(db: MockDatabase, taskId: string) {
  return db.tasks.find((task) => String(task.id) === String(taskId));
}

export function findSubmission(db: MockDatabase, submissionId: string | number) {
  return db.submissions.find((submission) => String(submission.id) === String(submissionId));
}
