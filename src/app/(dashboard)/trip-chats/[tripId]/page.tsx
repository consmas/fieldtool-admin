"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTripChat, markTripMessageRead, sendTripMessage } from "@/lib/api/chat";
import { formatDate } from "@/lib/utils/format";
import { useAuthStore } from "@/stores/auth.store";
import type { ChatMessage } from "@/types/api";

type LocalPendingMessage = {
  id: string;
  body: string;
  status: "pending" | "failed";
  created_at: string;
};

function getSenderId(message: ChatMessage): number | null {
  return message.sender_id ?? message.user_id ?? null;
}

function isUnread(message: ChatMessage): boolean {
  if (message.read === false) return true;
  return !message.read_at;
}

export default function TripChatThreadPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const userIdRaw = useAuthStore((state) => state.user?.id ?? null);
  const userId = typeof userIdRaw === "number" ? userIdRaw : null;
  const tripId = Number(params?.tripId ?? 0);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState<LocalPendingMessage[]>([]);
  const listRef = useRef<HTMLDivElement | null>(null);

  const { data: thread, isLoading, isError } = useQuery({
    queryKey: ["chat", "trip", tripId],
    queryFn: () => fetchTripChat(tripId),
    enabled: Boolean(tripId),
    refetchInterval: 12_000,
  });

  const sendMutation = useMutation({
    mutationFn: (payload: { localId: string; body: string }) =>
      sendTripMessage(tripId, payload.body),
    onSuccess: async (_message, variables) => {
      setPending((prev) => prev.filter((item) => item.id !== variables.localId));
      setBody("");
      await queryClient.invalidateQueries({ queryKey: ["chat", "trip", tripId] });
      await queryClient.invalidateQueries({ queryKey: ["chat", "inbox"] });
    },
    onError: (_error, variables) => {
      setPending((prev) =>
        prev.map((item) =>
          item.id === variables.localId ? { ...item, status: "failed" } : item
        )
      );
    },
  });

  const mergedMessages = useMemo(() => {
    const serverMessages = thread?.messages ?? [];
    const pendingMessages: ChatMessage[] = pending.map((item) => ({
      id: item.id,
      body: item.body,
      created_at: item.created_at,
      read_at: null,
      sender_id: userId,
      sender_name: "You",
      read: item.status === "pending" ? null : false,
    }));
    return [...serverMessages, ...pendingMessages];
  }, [pending, thread?.messages, userId]);

  useEffect(() => {
    if (!thread?.messages?.length || !userId) return;
    const unreadIncoming = thread.messages.filter((message) => {
      const senderId = getSenderId(message);
      return senderId !== userId && isUnread(message);
    });

    if (unreadIncoming.length === 0) return;

    unreadIncoming.forEach((message) => {
      markTripMessageRead(tripId, message.id).catch(() => null);
    });
    queryClient.invalidateQueries({ queryKey: ["chat", "inbox"] });
  }, [queryClient, thread?.messages, tripId, userId]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [mergedMessages.length]);

  const queueSend = (messageBody: string) => {
    const trimmed = messageBody.trim();
    if (!trimmed) return;
    const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setPending((prev) => [
      ...prev,
      {
        id: localId,
        body: trimmed,
        status: "pending",
        created_at: new Date().toISOString(),
      },
    ]);
    sendMutation.mutate({ localId, body: trimmed });
  };

  const retrySend = (localId: string) => {
    const failed = pending.find((item) => item.id === localId);
    if (!failed) return;
    setPending((prev) =>
      prev.map((item) =>
        item.id === localId ? { ...item, status: "pending" } : item
      )
    );
    sendMutation.mutate({ localId, body: failed.body });
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Trip Chats
          </p>
          <h2 className="text-lg font-semibold md:text-xl">
            {thread?.trip_reference ?? `Trip ${tripId}`}
          </h2>
          <p className="text-sm text-muted-foreground">
            Status: {thread?.trip_status ?? "-"}
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <Link
            href={`/trips/${tripId}`}
            className="rounded-xl border border-border px-3 py-2 text-center text-xs"
          >
            Trip Detail
          </Link>
          <Link
            href="/trip-chats"
            className="rounded-xl border border-border px-3 py-2 text-center text-xs"
          >
            Back to Inbox
          </Link>
        </div>
      </div>

      <div className="ops-card p-3 sm:p-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading conversation...</p>
        ) : isError ? (
          <p className="text-sm text-rose-500">Failed to load conversation.</p>
        ) : (
          <>
            <div
              ref={listRef}
              className="max-h-[60vh] space-y-3 overflow-y-auto rounded-xl border border-border bg-muted/20 p-3"
            >
              {mergedMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No messages yet.</p>
              ) : (
                mergedMessages.map((message) => {
                  const isMine = getSenderId(message) === userId;
                  const pendingItem = pending.find((item) => item.id === message.id);
                  return (
                    <div
                      key={String(message.id)}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[90%] rounded-xl px-3 py-2 text-sm sm:max-w-[80%] ${
                          isMine
                            ? "bg-primary/20 text-foreground"
                            : "bg-background border border-border"
                        }`}
                      >
                        <p>{message.body}</p>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{formatDate(message.created_at ?? undefined)}</span>
                          {pendingItem?.status === "pending" ? (
                            <span>sending...</span>
                          ) : null}
                          {pendingItem?.status === "failed" ? (
                            <button
                              type="button"
                              className="text-rose-400 underline"
                              onClick={() => retrySend(String(message.id))}
                            >
                              failed • retry
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form
              className="mt-3 flex flex-col gap-2 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                queueSend(body);
              }}
            >
              <input
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Type message"
                className="w-full rounded-xl border border-border px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={!body.trim()}
                className="w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 sm:w-auto"
              >
                Send
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
