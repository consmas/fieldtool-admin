"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  changeClientPassword,
  fetchClientProfile,
  updateClientPreferences,
} from "@/lib/api/client-portal";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export default function ClientProfilePage() {
  const queryClient = useQueryClient();
  const profileQuery = useQuery({
    queryKey: ["client", "profile"],
    queryFn: fetchClientProfile,
  });

  const [preferences, setPreferences] = useState({
    email_notifications: true,
    sms_notifications: false,
    timezone: "Africa/Accra",
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    new_password_confirmation: "",
  });

  useEffect(() => {
    const profile = asRecord(profileQuery.data);
    const prefs = asRecord(profile.preferences);
    if (Object.keys(prefs).length > 0) {
      setPreferences({
        email_notifications:
          typeof prefs.email_notifications === "boolean"
            ? prefs.email_notifications
            : true,
        sms_notifications:
          typeof prefs.sms_notifications === "boolean"
            ? prefs.sms_notifications
            : false,
        timezone: String(prefs.timezone ?? "Africa/Accra"),
      });
    }
  }, [profileQuery.data]);

  const preferencesMutation = useMutation({
    mutationFn: () => updateClientPreferences(preferences),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["client", "profile"] });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: () => changeClientPassword(passwordForm),
    onSuccess: () => {
      setPasswordForm({
        current_password: "",
        new_password: "",
        new_password_confirmation: "",
      });
    },
  });

  const profile = asRecord(profileQuery.data);
  const company = asRecord(profile.company);
  const user = asRecord(profile.user);

  return (
    <div className="space-y-4">
      <section className="ops-card p-4">
        <h2 className="text-base font-semibold text-foreground">Company & User Profile</h2>
        {profileQuery.isLoading ? <p className="mt-3 text-sm text-muted-foreground">Loading profile...</p> : null}
        {profileQuery.isError ? <p className="mt-3 text-sm text-rose-300">Unable to load profile.</p> : null}
        {!profileQuery.isLoading && !profileQuery.isError ? (
          <div className="mt-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
            <p>Company: <span className="text-muted-foreground">{String(company.name ?? profile.company_name ?? "-")}</span></p>
            <p>Company Email: <span className="text-muted-foreground">{String(company.email ?? "-")}</span></p>
            <p>User: <span className="text-muted-foreground">{String(user.name ?? profile.name ?? "-")}</span></p>
            <p>User Email: <span className="text-muted-foreground">{String(user.email ?? profile.email ?? "-")}</span></p>
          </div>
        ) : null}
      </section>

      <section className="ops-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Preferences</h3>
          <button
            type="button"
            className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            onClick={() => preferencesMutation.mutate()}
            disabled={preferencesMutation.isPending}
          >
            {preferencesMutation.isPending ? "Saving..." : "Save Preferences"}
          </button>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="inline-flex items-center gap-2 rounded-lg border border-border p-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={preferences.email_notifications}
              onChange={(e) =>
                setPreferences((prev) => ({ ...prev, email_notifications: e.target.checked }))
              }
            />
            Email notifications
          </label>
          <label className="inline-flex items-center gap-2 rounded-lg border border-border p-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={preferences.sms_notifications}
              onChange={(e) =>
                setPreferences((prev) => ({ ...prev, sms_notifications: e.target.checked }))
              }
            />
            SMS notifications
          </label>
          <input
            value={preferences.timezone}
            onChange={(e) => setPreferences((prev) => ({ ...prev, timezone: e.target.value }))}
            placeholder="Timezone"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
        </div>
      </section>

      <section className="ops-card p-4">
        <h3 className="text-sm font-semibold text-foreground">Change Password</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            type="password"
            value={passwordForm.current_password}
            onChange={(e) =>
              setPasswordForm((prev) => ({ ...prev, current_password: e.target.value }))
            }
            placeholder="Current password"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            type="password"
            value={passwordForm.new_password}
            onChange={(e) =>
              setPasswordForm((prev) => ({ ...prev, new_password: e.target.value }))
            }
            placeholder="New password"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
          <input
            type="password"
            value={passwordForm.new_password_confirmation}
            onChange={(e) =>
              setPasswordForm((prev) => ({ ...prev, new_password_confirmation: e.target.value }))
            }
            placeholder="Confirm new password"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          className="mt-3 rounded-lg border border-primary/40 bg-primary/15 px-3 py-2 text-sm font-semibold text-foreground disabled:opacity-60"
          onClick={() => passwordMutation.mutate()}
          disabled={passwordMutation.isPending}
        >
          {passwordMutation.isPending ? "Updating..." : "Update Password"}
        </button>
        {passwordMutation.isSuccess ? <p className="mt-2 text-xs text-emerald-300">Password updated.</p> : null}
        {passwordMutation.isError ? <p className="mt-2 text-xs text-rose-300">Failed to update password.</p> : null}
      </section>
    </div>
  );
}
