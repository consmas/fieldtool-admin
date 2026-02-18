"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchChatInbox } from "@/lib/api/chat";
import { formatDate } from "@/lib/utils/format";

export default function TripChatsPage() {
  const { data: threads = [], isLoading, isError } = useQuery({
    queryKey: ["chat", "inbox"],
    queryFn: fetchChatInbox,
    refetchInterval: 15_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Communications
        </p>
        <h2 className="text-xl font-semibold">Trip Chats</h2>
        <p className="text-sm text-muted-foreground">
          Dispatcher inbox across all trip conversations.
        </p>
      </div>

      {isLoading ? (
        <div className="ops-card p-6 text-sm text-muted-foreground">
          Loading chat inbox...
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">
          Unable to load chat inbox.
        </div>
      ) : threads.length === 0 ? (
        <div className="ops-card p-6 text-sm text-muted-foreground">
          No trip chats yet.
        </div>
      ) : (
        <div className="ops-card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-5 py-4">Trip</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Unread</th>
                <th className="px-5 py-4">Last Message</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {threads.map((thread) => (
                <tr
                  key={thread.trip_id}
                  className="border-t border-border transition hover:bg-muted/40"
                >
                  <td className="px-5 py-4 font-semibold">
                    {thread.trip_reference ?? `Trip ${thread.trip_id}`}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {thread.trip_status ?? "-"}
                  </td>
                  <td className="px-5 py-4">
                    {thread.unread_count > 0 ? (
                      <span className="rounded-full bg-rose-500/20 px-2 py-1 text-xs font-semibold text-rose-300">
                        {thread.unread_count}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">0</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {formatDate(thread.last_message_at ?? undefined)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/trip-chats/${thread.trip_id}`}
                      className="rounded-lg border border-border px-3 py-1 text-xs"
                    >
                      Open Chat
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
