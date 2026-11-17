import {
  School,
  Department,
  Course,
  Unit,
  type Task,
  type TaskStatus,
  type Notification,
  type NotificationType,
  type AcademicReport,
  type TaskSubmission,
} from "../types/academic";
import { academicService } from "../services/academicService";
import { useState, useCallback, useEffect, useRef } from "react";
import api from "../lib/api";
import { USE_MOCK_DATA } from "../lib/mockConfig";
import { taskService } from "../services/taskService";
import { socialService } from "../services/socialService";
import { reportService } from "../services/reportService";
import {
  deriveReport,
  pushNotification,
  readDb,
  subscribe,
  tasksForUnit,
  updateDb,
} from "./localDb";

import { type TeamMember } from "./mockData";

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const loaded = useRef({ tasks: false, submissions: false, unitId: "" });

  useEffect(() => {
    if (!USE_MOCK_DATA) return;
    return subscribe(() => {
      const db = readDb();
      if (loaded.current.tasks) {
        setTasks(tasksForUnit(db, loaded.current.unitId));
      }
      if (loaded.current.submissions) {
        setSubmissions(db.submissions);
      }
    });
  }, []);

  const fetchSubmissions = useCallback(async () => {
    try {
      const data = await taskService.getSubmissions();
      loaded.current.submissions = true;
      setSubmissions(data);
    } catch (error) {
      console.error(" FRONTEND: Failed to fetch submissions:", error);
    }
  }, []);

  const fetchTasks = useCallback(async (unitId: string) => {
    try {
      const data = await taskService.getTasks(unitId);
      loaded.current.tasks = true;
      loaded.current.unitId = unitId;

      if (USE_MOCK_DATA) {
        setTasks(data);
        return;
      }

      setTasks((prev) => {
        return data.map((newTask: Task) => {
          const existingTask = prev.find(t => String(t.id) === String(newTask.id));
          return {
            ...newTask,
            comments: (newTask.comments && newTask.comments.length > 0)
              ? newTask.comments
              : (existingTask?.comments || [])
          };
        });
      });
    } catch (error) {
      console.error("❌ FRONTEND: Network call failed:", error);
    }
  }, []);

  const createTask = useCallback(async (task: Omit<Task, "id">) => {
    setIsCreating(true);
    try {
      const newTask = await taskService.createTask(task);
      if (!USE_MOCK_DATA) {
        setTasks((prev) => [newTask, ...prev]);
      }
      return newTask;
    } finally {
      setIsCreating(false);
    }
  }, []);

  const updateTask = useCallback(async (taskId: string, task: Partial<Omit<Task, "id">>) => {
    const updatedTask = await taskService.updateTask(taskId, task);
    if (!USE_MOCK_DATA) {
      setTasks((prev) => prev.map((item) => String(item.id) === String(taskId) ? updatedTask : item));
    }
    return updatedTask;
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    await taskService.deleteTask(taskId);
    if (!USE_MOCK_DATA) {
      setTasks((prev) => prev.filter((item) => String(item.id) !== String(taskId)));
      setSubmissions((prev) => prev.filter((item) => String(item.task) !== String(taskId)));
    }
  }, []);

  const moveTask = useCallback(async (taskId: string, status: TaskStatus) => {
    try {
      const updatedTask = await taskService.updateTaskStatus(taskId, status);
      if (!USE_MOCK_DATA) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? updatedTask : t))
        );
      }
    } catch (error) {
      console.error("Failed to move task:", error);
    }
  }, []);

  const moveSubmission = useCallback(async (submissionId: string | number, status: TaskStatus) => {
    try {
      const updatedSub = await taskService.updateSubmissionStatus(submissionId, status);
      if (!USE_MOCK_DATA) {
        setSubmissions((prev) =>
          prev.map((s) => (String(s.id) === String(submissionId) ? updatedSub : s))
        );
      }
    } catch (error) {
      console.error("Failed to move submission:", error);
    }
  }, []);

  const createSubmission = useCallback(async (input: { taskId: string; submissionLink: string; notes?: string }) => {
    const submission = await taskService.createSubmission({
      task: Number(input.taskId),
      submission_link: input.submissionLink,
      notes: input.notes,
    });
    if (!USE_MOCK_DATA) setSubmissions((prev) => [submission, ...prev]);
    return submission;
  }, []);

  const addComment = useCallback(async (taskId: string, content: string, parent?: string) => {
    try {
      const newComment = await socialService.addComment({
        taskId,
        content,
        parent
      });

      if (!USE_MOCK_DATA) {
        setTasks((prev) =>
          prev.map((t) =>
            String(t.id) === String(taskId)
              ? { ...t, comments: [...(t.comments || []), newComment] }
              : t
          )
        );
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  }, []);

  return {
    tasks,
    submissions,
    fetchTasks,
    fetchSubmissions,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    moveSubmission,
    createSubmission,
    addComment,
    isCreating
  };
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    if (!USE_MOCK_DATA) return;
    return subscribe(() => {
      if (loaded.current) setNotifications(readDb().notifications);
    });
  }, []);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await socialService.getNotifications();
      loaded.current = true;
      setNotifications(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await socialService.markAsRead(id);
      if (!USE_MOCK_DATA) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const unreadIds = (USE_MOCK_DATA ? readDb().notifications : notifications)
      .filter((n) => !n.read)
      .map((n) => n.id);
    if (unreadIds.length === 0) return;
    try {
      await Promise.all(unreadIds.map((id) => socialService.markAsRead(id)));
      if (!USE_MOCK_DATA) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch (error) {
      console.error("Failed to mark all notifications read:", error);
    }
  }, [notifications]);

  const addNotification = useCallback(
    (input: { title: string; message: string; type: NotificationType }) => {
      if (USE_MOCK_DATA) {
        loaded.current = true;
        updateDb((db) => {
          pushNotification(db, input);
        });
        return;
      }
      const item: Notification = {
        id: crypto.randomUUID(),
        title: input.title,
        message: input.message,
        type: input.type,
        read: false,
        createdAt: new Date().toISOString(),
      };
      setNotifications((prev) => [item, ...prev]);
    },
    []
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllRead,
    addNotification,
    isLoading,
  };
}

export function useTeamPresence() {
  const [members, setMembers] = useState<TeamMember[]>(() =>
    USE_MOCK_DATA ? readDb().members : []
  );

  useEffect(() => {
    if (!USE_MOCK_DATA) return;
    return subscribe(() => setMembers(readDb().members));
  }, []);

  useEffect(() => {
    const fetchPresence = async () => {
      try {
        const response = await api.get("users/presence/");
        setMembers(response.data);
      } catch (error) {
        console.error("Failed to fetch team presence:", error);
      }
    };

    fetchPresence();
    const heartbeat = setInterval(fetchPresence, 30000);
    return () => clearInterval(heartbeat);
  }, []);

  const onlineMembers = members.filter((m) => m.isOnline);
  return { members, onlineMembers };
}

export function useAcademic() {
  const [schools, setSchools] = useState<School[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const selection = useRef({ schools: false, schoolId: "", deptId: "", courseId: "" });

  useEffect(() => {
    if (!USE_MOCK_DATA) return;
    return subscribe(() => {
      const db = readDb();
      if (selection.current.schools) setSchools(db.schools);
      if (selection.current.schoolId) {
        setDepartments(db.departments.filter((row) => row.schoolId === selection.current.schoolId));
      }
      if (selection.current.deptId) {
        setCourses(db.courses.filter((row) => row.departmentId === selection.current.deptId));
      }
      if (selection.current.courseId) {
        setUnits(db.units.filter((row) => row.courseId === selection.current.courseId));
      }
    });
  }, []);

  const fetchSchools = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await academicService.getSchools();
      selection.current.schools = true;
      setSchools(data);
    } catch (error) {
      console.error("Error fetching schools:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchDepartments = useCallback(async (schoolId: string) => {
    setIsLoading(true);
    try {
      const data = await academicService.getDepartments(schoolId);
      selection.current.schoolId = schoolId;
      setDepartments(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCourses = useCallback(async (deptId: string) => {
    setIsLoading(true);
    try {
      const data = await academicService.getCourses(deptId);
      selection.current.deptId = deptId;
      setCourses(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchUnits = useCallback(async (courseId: string) => {
    setIsLoading(true);
    try {
      const data = await academicService.getUnits(courseId);
      selection.current.courseId = courseId;
      setUnits(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    schools,
    departments,
    courses,
    units,
    isLoading,
    fetchSchools,
    fetchDepartments,
    fetchCourses,
    fetchUnits,
  };
}

export function useReports() {
  const [report, setReport] = useState<AcademicReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const unitRef = useRef<string | null>(null);

  useEffect(() => {
    if (!USE_MOCK_DATA) return;
    return subscribe(() => {
      if (!unitRef.current) return;
      setReport(deriveReport(readDb(), unitRef.current));
    });
  }, []);

  const fetchUnitReport = useCallback(async (unitId: string) => {
    setIsLoading(true);
    unitRef.current = unitId;
    try {
      const data = await reportService.getUnitReport(unitId);
      setReport(data);
    } catch (error) {
      console.error("Failed to fetch report:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { report, fetchUnitReport, isLoading };
}
