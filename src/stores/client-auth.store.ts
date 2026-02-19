"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type ClientUser = {
  id?: string | number;
  name?: string;
  email?: string;
  company_name?: string;
};

type ClientAuthState = {
  token: string | null;
  user: ClientUser | null;
  setSession: (token: string, user?: ClientUser | null) => void;
  clearSession: () => void;
  isAuthenticated: () => boolean;
};

export const useClientAuthStore = create<ClientAuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setSession: (token, user = null) => set({ token, user }),
      clearSession: () => set({ token: null, user: null }),
      isAuthenticated: () => Boolean(get().token),
    }),
    { name: "consmas-client-auth" }
  )
);
