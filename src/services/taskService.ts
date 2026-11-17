import api from "../lib/api";
import { USE_MOCK_DATA } from "../lib/mockConfig";
import { Task, TaskStatus, TaskSubmission } from "../types/academic";

export const taskService = {
  getTasks: async (unitId: string): Promise<Task[]> => {
    if ((!unitId || unitId === "undefined") && !USE_MOCK_DATA) {
      console.warn("getTasks called without a valid unitId");
      return [];
    }
    const response = await api.get(`tasks/?unit=${unitId}`);
    return response.data;
  },

  createTask: async (task: Omit<Task, "id">): Promise<Task> => {
    const response = await api.post("tasks/", task);
    return response.data;
  },

  updateTask: async (taskId: string, task: Partial<Omit<Task, "id">>): Promise<Task> => {
    const response = await api.patch(`tasks/${taskId}/`, task);
    return response.data;
  },

  deleteTask: async (taskId: string): Promise<void> => {
    await api.delete(`tasks/${taskId}/`);
  },

  updateTaskStatus: async (taskId: string, status: TaskStatus): Promise<Task> => {
    // Hits: PATCH /api/tasks/{taskId}/
    // Backend TaskSerializer will intercept this status and update TaskSubmission
    const response = await api.patch(`tasks/${taskId}/`, { status });
    return response.data;
  },

  getSubmissions: async (): Promise<TaskSubmission[]> => {
    // Hits: GET /api/tasks/submissions/
    const response = await api.get("tasks/submissions/");
    return response.data;
  },

  createSubmission: async (submission: { task: number; submission_link: string; notes?: string }): Promise<TaskSubmission> => {
    const response = await api.post("tasks/submissions/", submission);
    return response.data;
  },

  updateSubmissionStatus: async (submissionId: string | number, status: TaskStatus): Promise<TaskSubmission> => {
    // Hits: PATCH /api/tasks/submissions/{submissionId}/
    const response = await api.patch(`tasks/submissions/${submissionId}/`, { status });
    return response.data;
  }
};