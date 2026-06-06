import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UsersListClient } from "@/components/UsersListClient";

export default async function AdminUsersPage() {
  const session = await requireAdmin();

  // Fetch all users sorted by role (ADMIN first) and name
  const users = await prisma.user.findMany({
    orderBy: [
      { role: "asc" },
      { name: "asc" },
    ],
    include: {
      branch: true,
    },
  });

  // Map users to a safe schema for the client component
  const safeUsers = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    branchName: user.branch?.name ?? "N/A",
  }));

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">User Credentials</h1>
        <p className="mt-2 text-slate-500">
          Manage system passwords for all branch managers and administrator accounts.
        </p>
      </div>

      <UsersListClient initialUsers={safeUsers} currentUserId={session.id} />
    </>
  );
}
