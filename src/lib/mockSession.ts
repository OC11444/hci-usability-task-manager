import { AUTH_USER_KEY } from "@/services/authService";

export type MockRole = "staff" | "student";

const USERS = {
  staff: {
    username: "apatel",
    displayName: "Dr. Amina Patel",
    role: "staff" as const,
    roleDisplay: "Lecturer",
  },
  student: {
    username: "smwangi",
    displayName: "Sarah Mwangi",
    role: "student" as const,
    roleDisplay: "Student",
  },
};

export function persistMockSession(role: MockRole, email?: string) {
  const user = { ...USERS[role], email: email?.trim() || undefined };
  localStorage.setItem("access_token", "mock-local-token");
  localStorage.setItem("refresh_token", "mock-local-refresh");
  localStorage.setItem("user_role", role);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}
