import { jwtDecode } from "jwt-decode";
import type { JwtPayload } from "@/types/api";

export function decodeTokenPayload(token: string): JwtPayload | null {
  try {
    return jwtDecode<JwtPayload>(token);
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string, skewSeconds = 30): boolean {
  if (!token) return true;

  const payload = decodeTokenPayload(token);
  if (!payload?.exp) return false;

  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now + skewSeconds;
}
