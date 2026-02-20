export type UserRole = "admin" | "dispatcher" | "supervisor" | "finance";

export interface AuthUser {
  id: string | number;
  email: string;
  name: string;
  role: UserRole;
}
