"use client";

import { useState } from "react";

type SafeUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  branchName: string;
};

type UsersListClientProps = {
  initialUsers: SafeUser[];
  currentUserId: string;
};

export function UsersListClient({ initialUsers, currentUserId }: UsersListClientProps) {
  const [users] = useState<SafeUser[]>(initialUsers);
  const [activeUser, setActiveUser] = useState<SafeUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleOpenResetModal(user: SafeUser) {
    setActiveUser(user);
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
  }

  function handleCloseModal() {
    setActiveUser(null);
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!activeUser) return;

    setError("");
    setSuccess("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/users/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: activeUser.id,
          newPassword,
        }),
      });

      const data = await response.json();
      setSubmitting(false);

      if (!response.ok) {
        setError(data.error ?? "Failed to reset password.");
        return;
      }

      setSuccess("Password updated successfully!");
      // Close modal after delay
      setTimeout(() => {
        handleCloseModal();
      }, 1500);
    } catch {
      setSubmitting(false);
      setError("An unexpected network error occurred.");
    }
  }

  return (
    <div className="relative">
      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Name</th>
              <th className="px-5 py-3.5 font-semibold">Email</th>
              <th className="px-5 py-3.5 font-semibold">Role</th>
              <th className="px-5 py-3.5 font-semibold">Branch</th>
              <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50/50 transition">
                <td className="px-5 py-4 font-medium text-slate-900">
                  {user.name}
                  {user.id === currentUserId && (
                    <span className="ml-2 rounded-md bg-blue-50 px-1.5 py-0.5 text-xs font-semibold text-blue-700">
                      You
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 text-slate-600">{user.email}</td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      user.role === "ADMIN"
                        ? "bg-purple-50 text-purple-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {user.role === "ADMIN" ? "Administrator" : "Branch Manager"}
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-600">{user.branchName}</td>
                <td className="px-5 py-4 text-right">
                  <button
                    onClick={() => handleOpenResetModal(user)}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950"
                  >
                    Reset Password
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Overlay */}
      {activeUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-lg font-bold text-slate-900">
              Reset Password
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Set a new password for <span className="font-semibold text-slate-800">{activeUser.name}</span> ({activeUser.email}).
            </p>

            <form onSubmit={handleResetPassword} className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  New Password
                </span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2"
                  placeholder="Minimum 6 characters"
                  required
                  disabled={submitting || !!success}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Confirm Password
                </span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2"
                  placeholder="Repeat new password"
                  required
                  disabled={submitting || !!success}
                />
              </label>

              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
                  {success}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                  disabled={submitting || !!success}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition disabled:opacity-60"
                  disabled={submitting || !!success}
                >
                  {submitting ? "Saving..." : "Save Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
