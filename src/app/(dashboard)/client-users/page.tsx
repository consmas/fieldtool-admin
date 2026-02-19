"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClientUser, fetchClientUsers, updateClientUser } from "@/lib/api/client_users";

type FormState = {
  id: string;
  name: string;
  email: string;
  phone_number: string;
  role: string;
  company_id: string;
  password: string;
  password_confirmation: string;
  active: boolean;
};

const emptyForm: FormState = {
  id: "",
  name: "",
  email: "",
  phone_number: "",
  role: "client_user",
  company_id: "",
  password: "",
  password_confirmation: "",
  active: true,
};

function asText(value: unknown) {
  return String(value ?? "");
}

export default function ClientUsersPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [message, setMessage] = useState<string | null>(null);

  const usersQuery = useQuery({
    queryKey: ["client-users"],
    queryFn: fetchClientUsers,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        email: form.email,
        phone_number: form.phone_number || undefined,
        role: form.role || "client_user",
        company_id: form.company_id ? Number(form.company_id) : undefined,
        active: form.active,
        password: form.password || undefined,
        password_confirmation: form.password_confirmation || undefined,
      };
      if (form.id) return updateClientUser(form.id, payload);
      return createClientUser(payload);
    },
    onSuccess: async () => {
      setMessage(form.id ? "Client user updated." : "Client user created.");
      setForm(emptyForm);
      await queryClient.invalidateQueries({ queryKey: ["client-users"] });
    },
    onError: (error) => {
      const maybeError = error as { response?: { data?: { message?: string } } };
      setMessage(maybeError.response?.data?.message ?? "Unable to save client user.");
    },
  });

  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Clients</p>
        <h2 className="text-lg font-semibold md:text-xl">Client Users</h2>
        <p className="text-sm text-muted-foreground">Create and manage users who can access the client portal.</p>
      </div>

      <section className="ops-card p-4 sm:p-6">
        <h3 className="text-sm font-semibold text-foreground">{form.id ? "Edit Client User" : "Create Client User"}</h3>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <input
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Name"
            className="rounded-xl border border-border px-3 py-2 text-sm"
          />
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="Email"
            className="rounded-xl border border-border px-3 py-2 text-sm"
          />
          <input
            value={form.phone_number}
            onChange={(e) => setForm((prev) => ({ ...prev, phone_number: e.target.value }))}
            placeholder="Phone number"
            className="rounded-xl border border-border px-3 py-2 text-sm"
          />
          <input
            value={form.company_id}
            onChange={(e) => setForm((prev) => ({ ...prev, company_id: e.target.value }))}
            placeholder="Company ID"
            className="rounded-xl border border-border px-3 py-2 text-sm"
          />
          <select
            value={form.role}
            onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
            className="rounded-xl border border-border px-3 py-2 text-sm"
          >
            <option value="client_user">client_user</option>
            <option value="client_admin">client_admin</option>
            <option value="client_viewer">client_viewer</option>
          </select>
          <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
            />
            Active
          </label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            placeholder="Password"
            className="rounded-xl border border-border px-3 py-2 text-sm"
          />
          <input
            type="password"
            value={form.password_confirmation}
            onChange={(e) => setForm((prev) => ({ ...prev, password_confirmation: e.target.value }))}
            placeholder="Confirm password"
            className="rounded-xl border border-border px-3 py-2 text-sm"
          />
        </div>
        {message ? (
          <p className="mt-3 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{message}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            disabled={saveMutation.isPending || !form.email}
          >
            {saveMutation.isPending ? "Saving..." : form.id ? "Update Client User" : "Create Client User"}
          </button>
          {form.id ? (
            <button
              type="button"
              onClick={() => {
                setForm(emptyForm);
                setMessage(null);
              }}
              className="rounded-xl border border-border px-4 py-2 text-sm"
            >
              Cancel Edit
            </button>
          ) : null}
        </div>
      </section>

      <section className="ops-card p-4">
        <h3 className="text-sm font-semibold text-foreground">Existing Client Users</h3>
        {usersQuery.isLoading ? <p className="mt-2 text-sm text-muted-foreground">Loading client users...</p> : null}
        {usersQuery.isError ? <p className="mt-2 text-sm text-rose-300">Unable to load client users.</p> : null}
        {!usersQuery.isLoading && !usersQuery.isError && users.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No client users found.</p>
        ) : null}
        {users.length > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="py-2">Name</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Role</th>
                  <th className="py-2">Company</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => {
                  const id = user.id ?? user.user_id ?? index;
                  return (
                    <tr key={String(id)} className="border-t border-border">
                      <td className="py-3">{asText(user.name || "-")}</td>
                      <td className="py-3 text-muted-foreground">{asText(user.email || "-")}</td>
                      <td className="py-3 text-muted-foreground">{asText(user.role || "-")}</td>
                      <td className="py-3 text-muted-foreground">{asText(user.company_id || user.company_name || "-")}</td>
                      <td className="py-3 text-muted-foreground">{String(user.active ?? true) === "true" ? "Active" : "Inactive"}</td>
                      <td className="py-3">
                        <button
                          type="button"
                          className="rounded-lg border border-border px-3 py-1 text-xs"
                          onClick={() =>
                            setForm({
                              id: String(id),
                              name: asText(user.name),
                              email: asText(user.email),
                              phone_number: asText(user.phone_number),
                              role: asText(user.role || "client_user"),
                              company_id: asText(user.company_id),
                              password: "",
                              password_confirmation: "",
                              active: String(user.active ?? true) === "true",
                            })
                          }
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
