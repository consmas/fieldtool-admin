import { apiClient } from "@/lib/api/client";
import type { ChatInboxThread, ChatMessage, ChatThread } from "@/types/api";

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function toChatMessage(input: Record<string, unknown>): ChatMessage {
  return {
    id: (input.id as number | string | undefined) ?? `${Date.now()}`,
    trip_id: (input.trip_id as number | null | undefined) ?? null,
    body: String(input.body ?? ""),
    created_at: (input.created_at as string | null | undefined) ?? null,
    updated_at: (input.updated_at as string | null | undefined) ?? null,
    read_at: (input.read_at as string | null | undefined) ?? null,
    read: (input.read as boolean | null | undefined) ?? null,
    sender_id:
      (input.sender_id as number | null | undefined) ??
      (input.user_id as number | null | undefined) ??
      null,
    user_id: (input.user_id as number | null | undefined) ?? null,
    sender_role: (input.sender_role as string | null | undefined) ?? null,
    sender_name:
      (input.sender_name as string | null | undefined) ??
      (input.user_name as string | null | undefined) ??
      null,
    sender_type: (input.sender_type as string | null | undefined) ?? null,
  };
}

function toInboxThread(input: Record<string, unknown>): ChatInboxThread | null {
  const tripId = Number(input.trip_id ?? input.tripId ?? input.id);
  if (!Number.isFinite(tripId)) return null;
  return {
    trip_id: tripId,
    trip_reference:
      (input.trip_reference as string | null | undefined) ??
      (input.reference_code as string | null | undefined) ??
      (input.waybill_number as string | null | undefined) ??
      null,
    trip_status:
      (input.trip_status as string | null | undefined) ??
      (input.status as string | null | undefined) ??
      null,
    unread_count: Number(input.unread_count ?? input.unread ?? 0) || 0,
    last_message_at:
      (input.last_message_at as string | null | undefined) ??
      (input.updated_at as string | null | undefined) ??
      null,
    last_message_body:
      (input.last_message_body as string | null | undefined) ??
      (input.last_message as string | null | undefined) ??
      null,
  };
}

export async function fetchChatInbox(): Promise<ChatInboxThread[]> {
  const { data } = await apiClient.get("/chat/inbox");
  const root = (data ?? {}) as Record<string, unknown>;
  const rows = Array.isArray(data)
    ? data
    : Array.isArray(root.inbox)
    ? root.inbox
    : Array.isArray(root.data)
    ? root.data
    : [];
  return asArray<Record<string, unknown>>(rows)
    .map(toInboxThread)
    .filter((row): row is ChatInboxThread => Boolean(row));
}

export async function fetchTripChat(tripId: number | string): Promise<ChatThread> {
  const { data } = await apiClient.get(`/trips/${tripId}/chat`);
  const root = (data ?? {}) as Record<string, unknown>;
  const nestedChat = (root.chat as Record<string, unknown> | undefined) ?? {};
  const messagesRaw = Array.isArray(root.messages)
    ? root.messages
    : Array.isArray(nestedChat.messages)
    ? nestedChat.messages
    : Array.isArray(root.data)
    ? root.data
    : [];

  const messages = asArray<Record<string, unknown>>(messagesRaw).map(toChatMessage);

  return {
    trip_id:
      Number(root.trip_id ?? (root.trip as Record<string, unknown>)?.id ?? tripId) ||
      Number(tripId),
    trip_reference:
      (root.trip_reference as string | null | undefined) ??
      ((root.trip as Record<string, unknown>)?.reference_code as string | null | undefined) ??
      ((root.trip as Record<string, unknown>)?.waybill_number as string | null | undefined) ??
      null,
    trip_status:
      (root.trip_status as string | null | undefined) ??
      ((root.trip as Record<string, unknown>)?.status as string | null | undefined) ??
      null,
    unread_count: Number(root.unread_count ?? 0) || 0,
    last_message_at:
      (root.last_message_at as string | null | undefined) ??
      messages[messages.length - 1]?.created_at ??
      null,
    messages,
  };
}

export async function sendTripMessage(
  tripId: number | string,
  body: string
): Promise<ChatMessage> {
  const { data } = await apiClient.post(`/trips/${tripId}/chat/messages`, {
    message: { body },
  });
  const payload =
    (data as Record<string, unknown>)?.message ??
    (data as Record<string, unknown>)?.data ??
    data;
  return toChatMessage(payload as Record<string, unknown>);
}

export async function markTripMessageRead(
  tripId: number | string,
  messageId: number | string
) {
  const { data } = await apiClient.patch(
    `/trips/${tripId}/chat/messages/${messageId}`
  );
  return data;
}
