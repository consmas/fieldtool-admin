"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createUser, deleteUser, fetchUsers, updateUser } from "@/lib/api/users";
import type { User } from "@/types/api";

const emptyForm = {
  email: "",
  name: "",
  role: "dispatcher",
  phone_number: "",
  password: "",
  password_confirmation: "",
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: async (created) => {
      queryClient.setQueryData<User[]>(["users"], (old) => {
        if (!old) return [created];
        const exists = old.some((u) => u.id === created.id);
        return exists ? old : [created, ...old];
      });
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      setMessage("User created.");
      setForm(emptyForm);
    },
    onError: () => setMessage("Unable to create user."),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: {
      id: number;
      data: Partial<User> & {
        password?: string;
        password_confirmation?: string;
      };
    }) => updateUser(payload.id, payload.data),
    onSuccess: async (updated) => {
      queryClient.setQueryData<User[]>(["users"], (old) => {
        if (!old) return [updated];
        return old.map((user) => (user.id === updated.id ? updated : user));
      });
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      setMessage("User updated.");
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: () => setMessage("Unable to update user."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      setMessage("User deleted.");
    },
    onError: () => setMessage("Delete not available on API."),
  });

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setForm({
      email: user.email,
      name: user.name ?? "",
      role: user.role ?? "dispatcher",
      phone_number: user.phone_number ?? "",
      password: "",
      password_confirmation: "",
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);

    const payload = {
      email: form.email,
      name: form.name,
      role: form.role,
      phone_number: form.phone_number || undefined,
      password: form.password || undefined,
      password_confirmation: form.password_confirmation || undefined,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Users
        </p>
        <h2 className="text-xl font-semibold">Team Directory</h2>
        <p className="text-sm text-muted-foreground">
          Add and update admin, dispatcher, and supervisor roles.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="ops-card p-6"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            {editingId ? "Edit User" : "Create User"}
          </h3>
          {editingId ? (
            <button
              type="button"
              className="text-xs text-muted-foreground"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              Cancel edit
            </button>
          ) : null}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Email
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, email: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Name
            </label>
            <input
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Phone Number
            </label>
            <input
              value={form.phone_number}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, phone_number: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Role
            </label>
            <select
              value={form.role}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, role: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            >
              <option value="admin">admin</option>
              <option value="dispatcher">dispatcher</option>
              <option value="supervisor">supervisor</option>
              <option value="driver">driver</option>
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Password {editingId ? "(optional)" : ""}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, password: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">
              Confirm Password
            </label>
            <input
              type="password"
              value={form.password_confirmation}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  password_confirmation: event.target.value,
                }))
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

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {editingId ? "Update User" : "Create User"}
          </button>
        </div>
      </form>

      {isLoading ? (
        <div className="ops-card p-6 text-sm text-muted-foreground">
          Loading users...
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">
          Unable to load users. Confirm API connectivity.
        </div>
      ) : (
        <div className="ops-card p-4">
          <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="py-2">Name</th>
                <th className="py-2">Email</th>
                <th className="py-2">Contact</th>
                <th className="py-2">Role</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-border">
                  <td className="py-3">{user.name ?? "-"}</td>
                  <td className="py-3 text-muted-foreground">{user.email}</td>
                  <td className="py-3 text-muted-foreground">
                    {user.phone_number ?? "-"}
                  </td>
                  <td className="py-3 text-muted-foreground">
                    {user.role ?? "-"}
                  </td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-border px-3 py-1 text-xs"
                        onClick={() => handleEdit(user)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-border px-3 py-1 text-xs text-rose-500"
                        onClick={() => {
                          if (
                            window.confirm(
                              "Delete is not implemented in the API. Try anyway?"
                            )
                          ) {
                            deleteMutation.mutate(user.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
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
