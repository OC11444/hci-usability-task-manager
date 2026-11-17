import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { authService } from "@/services/authService";
import { socialService } from "@/services/socialService";
import { taskService } from "@/services/taskService";
import { readDb } from "@/stores/localDb";

const DB_KEY = "atm.mock.v1";

describe("offline mock data", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("seeds academic tasks across statuses and overdue deadlines", () => {
    const db = readDb();
    const statuses = new Set(db.tasks.map((task) => task.status));
    const overdue = db.tasks.filter((task) =>
      task.status !== "done" && new Date(task.dueDate).getTime() < Date.now(),
    );

    expect(db.schools.length).toBeGreaterThan(0);
    expect(db.members.length).toBeGreaterThan(0);
    expect([...statuses]).toEqual(expect.arrayContaining(["todo", "in_progress", "done"]));
    expect(overdue.length).toBeGreaterThan(0);
  });

  it("fills missing persisted collections without discarding valid task data", () => {
    localStorage.setItem(DB_KEY, JSON.stringify({ tasks: [] }));

    const db = readDb();

    expect(db.tasks).toEqual([]);
    expect(db.schools.length).toBeGreaterThan(0);
    expect(JSON.parse(localStorage.getItem(DB_KEY) || "{}").members.length).toBeGreaterThan(0);
  });

  it("persists mock login credentials in the protected-route session keys", async () => {
    const response = await authService.login({ email: "test@example.edu", password: "anything", role: "staff" });

    expect(response.data.role).toBe("staff");
    expect(localStorage.getItem("access_token")).toBe("mock-local-token");
    expect(JSON.parse(localStorage.getItem("auth_user") || "{}")).toMatchObject({
      username: "apatel",
      role: "staff",
    });
  });

  it("creates, edits, and deletes tasks through the API service", async () => {
    const created = await taskService.createTask({
      unitId: "2",
      title: "Offline CRUD check",
      description: "Verify local persistence",
      status: "todo",
      priority: "high",
      dueDate: new Date(Date.now() + 86_400_000).toISOString(),
      assignedTo: ["u1"],
    });

    const updated = await taskService.updateTask(created.id, { title: "Updated offline task", status: "done" });
    expect(updated.title).toBe("Updated offline task");
    expect(readDb().tasks.some((task) => task.id === created.id && task.status === "done")).toBe(true);

    await taskService.deleteTask(created.id);
    expect(readDb().tasks.some((task) => task.id === created.id)).toBe(false);
  });

  it("persists submissions, comments, and notification read state", async () => {
    const submission = await taskService.createSubmission({
      task: 102,
      submission_link: "https://drive.google.com/file/d/offline-submission",
      notes: "Draft for review",
    });
    expect(readDb().submissions.find((item) => String(item.id) === String(submission.id))?.notes).toBe("Draft for review");
    expect(readDb().tasks.find((task) => task.id === "102")?.status).toBe("in_progress");

    await socialService.addComment({ taskId: "101", content: "Offline comment" });
    expect(readDb().tasks.find((task) => task.id === "101")?.comments?.some((comment) => comment.content === "Offline comment")).toBe(true);

    const notification = readDb().notifications[0];
    await socialService.markAsRead(notification.id);
    expect(readDb().notifications.find((item) => item.id === notification.id)?.read).toBe(true);

    expect(readDb().submissions.some((item) => String(item.id) === String(submission.id))).toBe(true);
  });
});
