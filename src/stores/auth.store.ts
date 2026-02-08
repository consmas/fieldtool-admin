"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isTokenExpired, decodeTokenPayload } from "@/lib/auth/token";
import type { AuthUser } from "@/types/domain";

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setSession: (token: string, user?: Partial<AuthUser> | null) => void;
  clearSession: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setSession: (token: string, userOverride?: Partial<AuthUser> | null) => {
        const payload = decodeTokenPayload(token);
        const user: AuthUser | null =
          userOverride && (userOverride.email || userOverride.name)
            ? {
                id: userOverride.id ?? payload?.sub ?? payload?.user_id ?? "",
                email: userOverride.email ?? payload?.email ?? "",
                role: (userOverride.role ??
                  payload?.role ??
                  "admin") as AuthUser["role"],
                name:
                  userOverride.name ??
                  payload?.name ??
                  payload?.email ??
                  "",
              }
            : payload
            ? {
                id: payload.sub ?? payload.user_id ?? "",
                email: payload.email ?? "",
                role: (payload.role ?? "admin") as AuthUser["role"],
                name: payload.name ?? payload.email ?? "",
              }
            : null;

        set({ token, user });
      },
      clearSession: () => set({ token: null, user: null }),
      isAuthenticated: () => {
        const token = get().token;
        return Boolean(token && !isTokenExpired(token));
      },
    }),
    {
      name: "consmas-auth",
    }
  )
);
