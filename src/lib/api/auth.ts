import { apiClient } from "@/lib/api/client";
import type { LoginPayload, LoginResponse } from "@/types/api";

export async function login(payload: LoginPayload) {
  const res = await apiClient.post<LoginResponse>(
    "/auth/login",
    { user: payload },
    {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );

  const authHeader = res.headers["authorization"] as string | undefined;
  const token = authHeader?.replace("Bearer ", "") ?? null;

  return { data: res.data, token };
}

export function extractToken(
  response:
    | LoginResponse
    | { data: LoginResponse; token: string | null }
): string | null {
  if ("token" in response && response.token) return response.token;

  const data = ("data" in response ? response.data : response) ?? {};

  return (
    (data as LoginResponse).token ||
    (data as LoginResponse).jwt ||
    (data as LoginResponse).access_token ||
    (data as LoginResponse).data?.token ||
    null
  );
}
