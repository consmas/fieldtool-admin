"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteUser, fetchUsers } from "@/lib/api/users";

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Users</p>
          <h2 className="text-lg font-semibold md:text-xl">Team Directory</h2>
          <p className="text-sm text-muted-foreground">
            View admins, dispatchers, supervisors, and drivers.
          </p>
        </div>
        <Link
          href="/users/new"
          className="w-full rounded-xl bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground sm:w-auto"
        >
          Create User
        </Link>
      </div>

      {isLoading ? (
        <div className="ops-card p-6 text-sm text-muted-foreground">Loading users...</div>
      ) : isError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-600">
          Unable to load users. Confirm API connectivity.
        </div>
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {users.map((user) => (
              <div key={user.id} className="ops-card p-3">
                <p className="font-semibold text-foreground">{user.name ?? "-"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <p>Contact: {user.phone_number ?? "-"}</p>
                  <p>Role: {user.role ?? "-"}</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link
                    href={`/users/${user.id}/edit`}
                    className="rounded-lg border border-border px-3 py-2 text-center text-xs"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    className="rounded-lg border border-border px-3 py-2 text-xs text-rose-500"
                    onClick={() => {
                      if (window.confirm("Delete is not implemented in the API. Try anyway?")) {
                        deleteMutation.mutate(user.id);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="ops-card hidden p-4 md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
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
                      <td className="py-3 text-muted-foreground">{user.phone_number ?? "-"}</td>
                      <td className="py-3 text-muted-foreground">{user.role ?? "-"}</td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <Link
                            href={`/users/${user.id}/edit`}
                            className="rounded-lg border border-border px-3 py-1 text-xs"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            className="rounded-lg border border-border px-3 py-1 text-xs text-rose-500"
                            onClick={() => {
                              if (window.confirm("Delete is not implemented in the API. Try anyway?")) {
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
        </>
      )}
    </div>
  );
}
