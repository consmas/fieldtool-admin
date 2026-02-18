"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createUser } from "@/lib/api/users";

const emptyForm = {
  email: "",
  name: "",
  role: "dispatcher",
  phone_number: "",
  password: "",
  password_confirmation: "",
};

export default function CreateUserPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      router.push("/users");
    },
    onError: () => setMessage("Unable to create user."),
  });

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Users</p>
          <h2 className="text-lg font-semibold md:text-xl">Create User</h2>
        </div>
        <Link href="/users" className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">
          Back to Users
        </Link>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setMessage(null);
          createMutation.mutate({
            email: form.email,
            name: form.name,
            role: form.role,
            phone_number: form.phone_number || undefined,
            password: form.password || undefined,
            password_confirmation: form.password_confirmation || undefined,
          });
        }}
        className="ops-card p-4 sm:p-6"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Name</label>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Phone Number</label>
            <input
              value={form.phone_number}
              onChange={(event) => setForm((prev) => ({ ...prev, phone_number: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Role</label>
            <select
              value={form.role}
              onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            >
              <option value="admin">admin</option>
              <option value="dispatcher">dispatcher</option>
              <option value="supervisor">supervisor</option>
              <option value="driver">driver</option>
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Confirm Password</label>
            <input
              type="password"
              value={form.password_confirmation}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, password_confirmation: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
        </div>

        {message ? (
          <p className="mt-4 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          className="mt-4 w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground sm:w-auto"
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? "Creating..." : "Create User"}
        </button>
      </form>
    </div>
  );
}
