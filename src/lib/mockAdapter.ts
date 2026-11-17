import {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import type { Task, TaskSubmission } from "../types/academic";
import {
  commentFromContent,
  deriveReport,
  findSubmission,
  findTask,
  nextNumericId,
  normalizePriority,
  normalizeStatus,
  pushNotification,
  readDb,
  tasksForUnit,
  updateDb,
} from "../stores/localDb";
import type { MockDatabase } from "../stores/mockData";

function resolveRequest(config: InternalAxiosRequestConfig) {
  const rawUrl = config.url ?? "";
  const base = config.baseURL ?? "http://localhost/api/";
  const withSlash = base.endsWith("/") ? base : `${base}/`;
  let url: URL;
  try {
    url = new URL(rawUrl, withSlash);
  } catch {
    url = new URL(rawUrl || "/", "http://localhost/api/");
  }

  let path = url.pathname.replace(/\/api(?=\/|$)/, "");
  path = path.replace(/^\/+/, "").replace(/\/+$/, "");

  if (config.params && typeof config.params === "object") {
    for (const [key, value] of Object.entries(config.params as Record<string, unknown>)) {
      if (value != null) url.searchParams.set(key, String(value));
    }
  }

  return { path, query: url.searchParams };
}

function readBody(config: InternalAxiosRequestConfig): Record<string, unknown> {
  const data = config.data;
  if (data == null || data === "") return {};
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof data === "object") return data as Record<string, unknown>;
  return {};
}

function finish(config: InternalAxiosRequestConfig, status: number, data: unknown): AxiosResponse {
  const response: AxiosResponse = {
    data,
    status,
    statusText: status >= 400 ? "Error" : "OK",
    headers: new AxiosHeaders(),
    config,
  };
  if (status >= 400) {
    throw new AxiosError(
      "Mock request failed",
      AxiosError.ERR_BAD_REQUEST,
      config,
      null,
      response,
    );
  }
  return response;
}

function sessionFor(role: unknown) {
  const isStaff = role === "staff" || role === "lecturer";
  if (isStaff) {
    return {
      access: "mock-local-token",
      refresh: "mock-local-refresh",
      role: "staff",
      username: "apatel",
      display_name: "Dr. Amina Patel",
      user: {
        username: "apatel",
        displayName: "Dr. Amina Patel",
        role: "staff",
        roleDisplay: "Lecturer",
      },
    };
  }
  return {
    access: "mock-local-token",
    refresh: "mock-local-refresh",
    role: "student",
    username: "smwangi",
    display_name: "Sarah Mwangi",
    user: {
      username: "smwangi",
      displayName: "Sarah Mwangi",
      role: "student",
      roleDisplay: "Student",
    },
  };
}

function unitCode(db: MockDatabase, unitId: string) {
  return db.units.find((unit) => String(unit.id) === String(unitId))?.name.split("—")[0]?.trim();
}

function createTask(db: MockDatabase, body: Record<string, unknown>): Task {
  const due = String(body.dueDate ?? body.due_date ?? new Date().toISOString());
  const unitId = String(body.unitId ?? body.unit ?? "");
  const assigned = body.assignedTo ?? body.assigned_to;
  const task: Task = {
    id: nextNumericId(db),
    unitId,
    unit_code: typeof body.unit_code === "string" ? body.unit_code : unitCode(db, unitId),
    title: String(body.title ?? "Untitled task"),
    description: String(body.description ?? ""),
    status: normalizeStatus(body.status),
    priority: normalizePriority(body.priority),
    dueDate: due,
    due_date: due,
    assignedTo: Array.isArray(assigned) ? assigned.map(String) : assigned ? [String(assigned)] : [],
    allow_late_submissions: body.allow_late_submissions === true,
    comments: [],
  };
  db.tasks = [task, ...db.tasks];
  pushNotification(db, {
    title: "New task assigned",
    message: `'${task.title}' was added to the board.`,
    type: "task",
  });
  return task;
}

function handle(config: InternalAxiosRequestConfig): AxiosResponse {
  const method = (config.method ?? "get").toLowerCase();
  const { path, query } = resolveRequest(config);
  const body = readBody(config);

  if (path === "users/login" && method === "post") {
    return finish(config, 200, sessionFor(body.role));
  }

  const verify = path.match(/^users\/verify\/([^/]+)$/);
  if (verify && method === "get") {
    return finish(config, 200, sessionFor("student"));
  }

  if (path === "users/presence" && method === "get") {
    return finish(config, 200, readDb().members);
  }

  if (path === "academic/schools" && method === "get") {
    return finish(config, 200, readDb().schools);
  }

  if (path === "academic/departments" && method === "get") {
    const schoolId = query.get("school");
    const rows = readDb().departments.filter((row) => !schoolId || row.schoolId === schoolId);
    return finish(config, 200, rows);
  }

  if (path === "academic/courses" && method === "get") {
    const deptId = query.get("department");
    const rows = readDb().courses.filter((row) => !deptId || row.departmentId === deptId);
    return finish(config, 200, rows);
  }

  if (path === "academic/units" && method === "get") {
    const courseId = query.get("course");
    const rows = readDb().units.filter((row) => !courseId || row.courseId === courseId);
    return finish(config, 200, rows);
  }

  if ((path === "reports/dashboard/lecturer" || path === "reports/unit/global") && method === "get") {
    return finish(config, 200, deriveReport(readDb(), query.get("unit") ?? "global"));
  }

  if (path === "notifications" && method === "get") {
    return finish(config, 200, readDb().notifications);
  }

  const notificationPatch = path.match(/^notifications\/([^/]+)$/);
  if (notificationPatch && method === "patch") {
    const id = notificationPatch[1];
    let updated: unknown = null;
    updateDb((db) => {
      db.notifications = db.notifications.map((item) => {
        if (item.id !== id) return item;
        updated = { ...item, read: body.read !== false };
        return updated as typeof item;
      });
    });
    if (!updated) return finish(config, 404, { detail: "Notification not found" });
    return finish(config, 200, updated);
  }

  if (path === "tasks" && method === "get") {
    return finish(config, 200, tasksForUnit(readDb(), query.get("unit")));
  }

  if (path === "tasks" && method === "post") {
    let created: Task | null = null;
    updateDb((db) => {
      created = createTask(db, body);
    });
    return finish(config, 201, created);
  }

  if (path === "tasks/submissions" && method === "get") {
    return finish(config, 200, readDb().submissions);
  }

  if (path === "tasks/submissions" && method === "post") {
    let created: TaskSubmission | null = null;
    updateDb((db) => {
      const task = findTask(db, String(body.task ?? ""));
      if (task && normalizeStatus(task.status) === "todo") {
        task.status = "in_progress";
      }
      let studentName = "Sarah Mwangi";
      try {
        const raw = localStorage.getItem("auth_user");
        if (raw) {
          const user = JSON.parse(raw) as { displayName?: string };
          if (user.displayName) studentName = user.displayName;
        }
      } catch {
        studentName = "Sarah Mwangi";
      }
      created = {
        id: nextNumericId(db),
        task: Number(body.task),
        student: 7,
        student_name: studentName,
        status: "in_progress",
        submission_link: String(body.submission_link ?? ""),
        notes: String(body.notes ?? ""),
        grade: null,
        feedback: null,
        submitted_at: new Date().toISOString(),
      };
      db.submissions = [created, ...db.submissions];
      pushNotification(db, {
        title: "Work submitted",
        message: task
          ? `${studentName} submitted '${task.title}'.`
          : "A new submission is ready for review.",
        type: "task",
      });
    });
    return finish(config, 201, created);
  }

  const submissionPatch = path.match(/^tasks\/submissions\/([^/]+)$/);
  if (submissionPatch && (method === "patch" || method === "put")) {
    const id = submissionPatch[1];
    let updated: TaskSubmission | null = null;
    updateDb((db) => {
      const current = findSubmission(db, id);
      if (!current) return;
      updated = { ...current, status: body.status ? normalizeStatus(body.status) : current.status };
      db.submissions = db.submissions.map((item) => (String(item.id) === id ? updated! : item));
      const task = findTask(db, String(current.task));
      pushNotification(db, {
        title: "Submission updated",
        message: `'${task?.title ?? "Submission"}' moved to ${updated.status.replace("_", " ")}.`,
        type: "task",
      });
    });
    if (!updated) return finish(config, 404, { detail: "Submission not found" });
    return finish(config, 200, updated);
  }

  const comments = path.match(/^tasks\/([^/]+)\/comments$/);
  if (comments && method === "get") {
    const task = findTask(readDb(), comments[1]);
    if (!task) return finish(config, 404, { detail: "Task not found" });
    return finish(config, 200, task.comments ?? []);
  }

  if (comments && method === "post") {
    const taskId = comments[1];
    let created = null as ReturnType<typeof commentFromContent> | null;
    updateDb((db) => {
      const task = findTask(db, taskId);
      if (!task) return;
      created = commentFromContent(db, taskId, String(body.content ?? ""));
      task.comments = [...(task.comments ?? []), created];
      pushNotification(db, {
        title: "New comment",
        message: `A comment was added on '${task.title}'.`,
        type: "comment",
      });
    });
    if (!created) return finish(config, 404, { detail: "Task not found" });
    return finish(config, 201, created);
  }

  const taskItem = path.match(/^tasks\/([^/]+)$/);
  if (taskItem && method === "get") {
    const task = findTask(readDb(), taskItem[1]);
    if (!task) return finish(config, 404, { detail: "Task not found" });
    return finish(config, 200, task);
  }

  if (taskItem && (method === "patch" || method === "put")) {
    const id = taskItem[1];
    let updated: Task | null = null;
    updateDb((db) => {
      const current = findTask(db, id);
      if (!current) return;
      updated = {
        ...current,
        ...body,
        id: current.id,
        unitId: String(body.unitId ?? body.unit ?? current.unitId),
        unit_code: typeof body.unit_code === "string" ? body.unit_code : unitCode(db, String(body.unitId ?? body.unit ?? current.unitId)) ?? current.unit_code,
        status: body.status ? normalizeStatus(body.status) : current.status,
        priority: body.priority ? normalizePriority(body.priority) : current.priority,
        dueDate: String(body.dueDate ?? body.due_date ?? current.dueDate),
        due_date: String(body.dueDate ?? body.due_date ?? current.due_date ?? current.dueDate),
      } as Task;
      db.tasks = db.tasks.map((item) => (String(item.id) === id ? updated! : item));
      if (body.status) {
        pushNotification(db, {
          title: "Status updated",
          message: `'${updated.title}' moved to ${updated.status.replace("_", " ")}.`,
          type: "task",
        });
      }
    });
    if (!updated) return finish(config, 404, { detail: "Task not found" });
    return finish(config, 200, updated);
  }

  if (taskItem && method === "delete") {
    const id = taskItem[1];
    let removed = false;
    updateDb((db) => {
      const current = findTask(db, id);
      if (!current) return;
      removed = true;
      db.tasks = db.tasks.filter((item) => String(item.id) !== id);
      db.submissions = db.submissions.filter((item) => String(item.task) !== id);
      pushNotification(db, {
        title: "Task deleted",
        message: `'${current.title}' was removed.`,
        type: "task",
      });
    });
    if (!removed) return finish(config, 404, { detail: "Task not found" });
    return finish(config, 204, null);
  }

  return finish(config, 404, { detail: `No mock handler for ${method.toUpperCase()} ${path}` });
}

export const mockAdapter = (config: InternalAxiosRequestConfig) => {
  try {
    return Promise.resolve(handle(config));
  } catch (error) {
    return Promise.reject(error);
  }
};
