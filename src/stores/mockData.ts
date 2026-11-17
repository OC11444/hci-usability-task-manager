// Centralized academic seed for the offline HCI session.
// Shapes match src/types/academic.ts, plus the fields the drawers already read.

import type {
  AcademicReport,
  Comment,
  Course,
  Department,
  Notification,
  School,
  Task,
  TaskSubmission,
  Unit,
} from "../types/academic";

export type { Priority, TaskStatus } from "../types/academic";

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  color: string;
  isOnline: boolean;
  cursorX?: number;
  cursorY?: number;
}

export interface MockCourse extends Course {
  course_code: string;
  name: string;
}

export interface MockUnit extends Unit {
  name: string;
}

export interface MockDatabase {
  seq: number;
  schools: School[];
  departments: Department[];
  courses: MockCourse[];
  units: MockUnit[];
  tasks: Task[];
  submissions: TaskSubmission[];
  notifications: Notification[];
  members: TeamMember[];
}

export interface MockGroup {
  id: string;
  name: string;
  members: string[];
}

/** Unit the dashboards open when no env override is present. */
export const DEFAULT_UNIT_ID = "2";

export const defaultHierarchy = {
  schoolId: "1",
  departmentId: "1",
  courseId: "1",
  unitId: DEFAULT_UNIT_ID,
};

const hoursFrom = (now: number, h: number) => new Date(now + h * 3_600_000).toISOString();

export const mockTeamMembers: TeamMember[] = [
  { id: "u1", name: "Amara Osei", initials: "AO", color: "hsl(245, 45%, 55%)", isOnline: true },
  { id: "u2", name: "Kenji Tanaka", initials: "KT", color: "hsl(160, 50%, 40%)", isOnline: true },
  { id: "u3", name: "Sofia Martinez", initials: "SM", color: "hsl(30, 60%, 50%)", isOnline: false },
  { id: "u4", name: "Liam Chen", initials: "LC", color: "hsl(200, 55%, 45%)", isOnline: true },
  { id: "u5", name: "Fatima Al-Rashid", initials: "FA", color: "hsl(85, 50%, 40%)", isOnline: false },
  { id: "u6", name: "Dr. Amina Patel", initials: "AP", color: "hsl(265, 40%, 42%)", isOnline: true },
  { id: "u7", name: "Sarah Mwangi", initials: "SW", color: "hsl(340, 55%, 48%)", isOnline: true },
];

export const mockGroups: MockGroup[] = [
  { id: "g1", name: "Team Alpha", members: ["u1", "u2"] },
  { id: "g2", name: "Team Beta", members: ["u3", "u4"] },
  { id: "g3", name: "Team Gamma", members: ["u1", "u5", "u7"] },
];

export function buildSeed(now = Date.now()): MockDatabase {
  const at = (h: number) => hoursFrom(now, h);

  const comment = (
    id: string,
    taskId: string,
    author: string,
    avatar: string,
    content: string,
    hoursAgo: number,
  ): Comment => ({
    id,
    taskId,
    author,
    avatar,
    content,
    createdAt: at(hoursAgo),
  });

  const task = (input: Task): Task => ({
    ...input,
    due_date: input.dueDate,
  });

  const tasks: Task[] = [
    task({
      id: "101",
      unitId: "2",
      unit_code: "CS 601",
      title: "Research Proposal Draft",
      description: "Write the initial draft covering methodology, research questions, and the literature review.",
      status: "in_progress",
      priority: "high",
      dueDate: at(4),
      assignedTo: ["u1", "u2", "u7"],
      comments: [
        comment("c1", "101", "Dr. Amina Patel", "AP", "Please include the updated dataset references from last week's seminar.", -12),
        comment("c2", "101", "Amara Osei", "AO", "Will do — uploading the revised version tonight.", -6),
      ],
    }),
    task({
      id: "102",
      unitId: "2",
      unit_code: "CS 601",
      title: "Literature Review Ch.2",
      description: "Complete Chapter 2 with at least 15 peer-reviewed sources on collaborative learning.",
      status: "todo",
      priority: "medium",
      dueDate: at(24),
      assignedTo: ["u2", "u3"],
      comments: [],
    }),
    task({
      id: "103",
      unitId: "2",
      unit_code: "CS 601",
      title: "Data Analysis Report",
      description: "Run the survey analysis and prepare the visualization charts for the results section.",
      status: "done",
      priority: "low",
      dueDate: at(72),
      assignedTo: ["u1", "u4"],
      comments: [
        comment("c3", "103", "Sofia Martinez", "SM", "Charts look great. Minor fix on the axis labels still needed.", -24),
      ],
    }),
    task({
      id: "104",
      unitId: "2",
      unit_code: "CS 601",
      title: "Methodology Section",
      description: "Draft the methodology section with a justification of the research design.",
      status: "todo",
      priority: "high",
      dueDate: at(6),
      assignedTo: ["u5", "u7"],
      comments: [],
    }),
    task({
      id: "105",
      unitId: "2",
      unit_code: "CS 601",
      title: "Peer Review Feedback",
      description: "Provide constructive feedback on two teammates' proposal drafts.",
      status: "in_progress",
      priority: "medium",
      dueDate: at(48),
      assignedTo: ["u1", "u2", "u3"],
      comments: [],
    }),
    task({
      id: "106",
      unitId: "2",
      unit_code: "CS 601",
      title: "Ethics Approval Form",
      description: "Submit the departmental ethics checklist before any participant interviews.",
      status: "todo",
      priority: "high",
      dueDate: at(-6),
      assignedTo: ["u2", "u7"],
      comments: [
        comment("c4", "106", "Dr. Amina Patel", "AP", "This is now overdue. Please upload the signed form today.", -2),
      ],
    }),
    task({
      id: "107",
      unitId: "2",
      unit_code: "CS 601",
      title: "Lab Notebook Upload",
      description: "Export this week's lab notebook and share a view-only Drive link.",
      status: "in_progress",
      priority: "medium",
      dueDate: at(10),
      assignedTo: ["u4", "u5"],
      comments: [],
    }),
    task({
      id: "108",
      unitId: "2",
      unit_code: "CS 601",
      title: "Final Slide Deck",
      description: "Twelve slides covering problem, method, findings, and next steps.",
      status: "todo",
      priority: "low",
      dueDate: at(120),
      assignedTo: ["u3"],
      comments: [],
    }),
    task({
      id: "109",
      unitId: "2",
      unit_code: "CS 601",
      title: "Annotated Bibliography",
      description: "Annotate eight sources you will actually cite in the proposal.",
      status: "done",
      priority: "medium",
      dueDate: at(-48),
      assignedTo: ["u1", "u7"],
      comments: [],
    }),
    task({
      id: "110",
      unitId: "2",
      unit_code: "CS 601",
      title: "Survey Instrument",
      description: "Finalize the questionnaire and pilot it with two classmates.",
      status: "todo",
      priority: "high",
      dueDate: at(-30),
      assignedTo: ["u5", "u2"],
      comments: [],
    }),
    task({
      id: "111",
      unitId: "3",
      unit_code: "CS 550",
      title: "Feature Engineering Notes",
      description: "Document the features used in the classification baseline.",
      status: "in_progress",
      priority: "high",
      dueDate: at(36),
      assignedTo: ["u4", "u1"],
      comments: [],
    }),
    task({
      id: "112",
      unitId: "4",
      unit_code: "ENG 520",
      title: "Thesis Abstract",
      description: "A 250-word abstract suitable for the faculty research day booklet.",
      status: "todo",
      priority: "medium",
      dueDate: at(8),
      assignedTo: ["u7", "u3"],
      comments: [],
    }),
  ];

  const submissions: TaskSubmission[] = [
    {
      id: "501",
      task: 103,
      student: 3,
      student_name: "Sofia Martinez",
      status: "done",
      submission_link: "https://drive.google.com/file/d/data-analysis-report",
      grade: 86,
      feedback: "Clear charts. Tighten the discussion of limitations.",
      submitted_at: at(-20),
    },
    {
      id: "502",
      task: 109,
      student: 1,
      student_name: "Amara Osei",
      status: "done",
      submission_link: "https://docs.google.com/document/d/annotated-bibliography",
      grade: 91,
      feedback: "Excellent source selection.",
      submitted_at: at(-50),
    },
    {
      id: "503",
      task: 101,
      student: 2,
      student_name: "Kenji Tanaka",
      status: "in_progress",
      submission_link: "https://drive.google.com/file/d/research-proposal-draft",
      grade: null,
      feedback: null,
      submitted_at: at(-5),
    },
    {
      id: "504",
      task: 105,
      student: 4,
      student_name: "Liam Chen",
      status: "todo",
      submission_link: "https://drive.google.com/file/d/peer-review-notes",
      grade: null,
      feedback: null,
      submitted_at: at(-1),
    },
    {
      id: "505",
      task: 107,
      student: 5,
      student_name: "Fatima Al-Rashid",
      status: "in_progress",
      submission_link: "https://drive.google.com/file/d/lab-notebook-week6",
      grade: null,
      feedback: null,
      submitted_at: at(-3),
    },
    {
      id: "506",
      task: 106,
      student: 7,
      student_name: "Sarah Mwangi",
      status: "todo",
      submission_link: "https://drive.google.com/file/d/ethics-checklist",
      grade: null,
      feedback: null,
      submitted_at: at(-1),
    },
  ];

  const notifications: Notification[] = [
    {
      id: "n1",
      userId: "u7",
      title: "New task assigned",
      message: "Dr. Patel assigned 'Research Proposal Draft' to your group.",
      type: "task",
      read: false,
      createdAt: at(-1),
    },
    {
      id: "n2",
      userId: "u7",
      title: "Lecturer replied",
      message: "Dr. Patel commented on 'Research Proposal Draft'.",
      type: "comment",
      read: false,
      createdAt: at(-3),
    },
    {
      id: "n3",
      userId: "u7",
      title: "Deadline approaching",
      message: "'Methodology Section' is due in 6 hours.",
      type: "deadline",
      read: false,
      createdAt: at(-2),
    },
    {
      id: "n4",
      userId: "u6",
      title: "Submission graded",
      message: "'Annotated Bibliography' received 91%.",
      type: "grade",
      read: true,
      createdAt: at(-12),
    },
    {
      id: "n5",
      userId: "u6",
      title: "Overdue work",
      message: "'Ethics Approval Form' is past the deadline.",
      type: "deadline",
      read: false,
      createdAt: at(-4),
    },
    {
      id: "n6",
      userId: "u7",
      title: "Status updated",
      message: "'Data Analysis Report' was marked done.",
      type: "task",
      read: true,
      createdAt: at(-18),
    },
  ];

  return {
    seq: 700,
    schools: [
      { id: "1", name: "School of Computing" },
      { id: "2", name: "School of Engineering" },
    ],
    departments: [
      { id: "1", schoolId: "1", name: "Computer Science" },
      { id: "2", schoolId: "1", name: "Information Systems" },
      { id: "3", schoolId: "2", name: "Electrical Engineering" },
    ],
    courses: [
      {
        id: "1",
        departmentId: "1",
        title: "BSc Computer Science",
        courseCode: "BSC-CS",
        course_code: "BSC-CS",
        name: "BSc Computer Science",
      },
      {
        id: "2",
        departmentId: "1",
        title: "MSc Data Science",
        courseCode: "MSC-DS",
        course_code: "MSC-DS",
        name: "MSc Data Science",
      },
      {
        id: "3",
        departmentId: "2",
        title: "BSc Information Systems",
        courseCode: "BSC-IS",
        course_code: "BSC-IS",
        name: "BSc Information Systems",
      },
      {
        id: "4",
        departmentId: "3",
        title: "BSc Electrical Engineering",
        courseCode: "BSC-EE",
        course_code: "BSC-EE",
        name: "BSc Electrical Engineering",
      },
    ],
    units: [
      { id: "2", courseId: "1", title: "CS 601 — Advanced Research Methods", name: "CS 601 — Advanced Research Methods", order: 1 },
      { id: "3", courseId: "1", title: "CS 550 — Machine Learning", name: "CS 550 — Machine Learning", order: 2 },
      { id: "4", courseId: "2", title: "ENG 520 — Academic Writing", name: "ENG 520 — Academic Writing", order: 1 },
      { id: "5", courseId: "2", title: "STAT 430 — Statistical Analysis", name: "STAT 430 — Statistical Analysis", order: 2 },
      { id: "6", courseId: "4", title: "EE 310 — Circuit Design", name: "EE 310 — Circuit Design", order: 1 },
    ],
    tasks,
    submissions,
    notifications,
    members: mockTeamMembers.map((member) => ({ ...member })),
  };
}

/** Placeholder used only for typing. Live tiles are derived from the database. */
export const emptyReport: AcademicReport = {
  submissionRate: 0,
  submissionTrend: 0,
  onTimeRatio: 0,
  onTimeTrend: 0,
  pendingReviews: 0,
  urgentReviews: 0,
  overdueFeedback: 0,
  overdueTrend: 0,
};
