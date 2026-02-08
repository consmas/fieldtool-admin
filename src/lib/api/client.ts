import axios from "axios";
import { useAuthStore } from "@/stores/auth.store";

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  let token = useAuthStore.getState().token;
  if (!token && typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem("consmas-auth");
      const parsed = raw ? (JSON.parse(raw) as { state?: { token?: string } }) : null;
      token = parsed?.state?.token ?? null;
    } catch {
      token = null;
    }
  }
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url: string = error?.config?.url ?? "";
    const authHeader = error?.response?.headers?.["www-authenticate"] as
      | string
      | undefined;
    const shouldClear =
      status === 401 &&
      url !== "/auth/login" &&
      Boolean(
        authHeader?.toLowerCase().includes("invalid_token") ||
          authHeader?.toLowerCase().includes("expired")
      );

    if (shouldClear) {
      useAuthStore.getState().clearSession();
    }
    return Promise.reject(error);
  }
);
