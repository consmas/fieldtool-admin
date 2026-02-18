"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUser, updateUser } from "@/lib/api/users";

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = Number(params?.id ?? 0);
  const [message, setMessage] = useState<string | null>(null);

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ["users", "detail", userId],
    queryFn: () => fetchUser(userId),
    enabled: Number.isFinite(userId) && userId > 0,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: {
      email: string;
      name: string;
      role: string;
      phone_number?: string;
      password?: string;
      password_confirmation?: string;
    }) => updateUser(userId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      await queryClient.invalidateQueries({ queryKey: ["users", "detail", userId] });
      router.push("/users");
    },
    onError: () => setMessage("Unable to update user."),
  });

  if (isLoading) return <div className="ops-card p-6 text-sm text-muted-foreground">Loading user...</div>;
  if (isError || !user) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">Unable to load user.</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Users</p>
          <h2 className="text-lg font-semibold md:text-xl">Edit User</h2>
        </div>
        <Link href="/users" className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">
          Back to Users
        </Link>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setMessage(null);
          const fd = new FormData(event.currentTarget);
          updateMutation.mutate({
            email: String(fd.get("email") ?? ""),
            name: String(fd.get("name") ?? ""),
            role: String(fd.get("role") ?? "dispatcher"),
            phone_number: String(fd.get("phone_number") ?? "") || undefined,
            password: String(fd.get("password") ?? "") || undefined,
            password_confirmation: String(fd.get("password_confirmation") ?? "") || undefined,
          });
        }}
        className="ops-card p-4 sm:p-6"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Email</label>
            <input name="email" type="email" required defaultValue={user.email} className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Name</label>
            <input name="name" defaultValue={user.name ?? ""} className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Phone Number</label>
            <input name="phone_number" defaultValue={user.phone_number ?? ""} className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Role</label>
            <select name="role" defaultValue={user.role ?? "dispatcher"} className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm">
              <option value="admin">admin</option>
              <option value="dispatcher">dispatcher</option>
              <option value="supervisor">supervisor</option>
              <option value="driver">driver</option>
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Password (optional)</label>
            <input name="password" type="password" className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Confirm Password</label>
            <input name="password_confirmation" type="password" className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm" />
          </div>
        </div>

        {message ? <p className="mt-4 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{message}</p> : null}

        <button type="submit" className="mt-4 w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground sm:w-auto" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Updating..." : "Update User"}
        </button>
      </form>
    </div>
  );
}
