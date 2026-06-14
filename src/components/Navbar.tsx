"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/auth";

type NavbarProps = {
  user: SessionUser;
};

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();



  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div>
          <Link href={user.role === "ADMIN" ? "/admin" : user.role === "BACK_OFFICE" ? "/backoffice" : "/dashboard"} className="block">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
              Vishnu Priya
            </p>
            <h1 className="text-lg font-bold text-slate-900">Automotives</h1>
          </Link>
          <p className="text-sm text-slate-500">
            {user.role === "ADMIN"
              ? "Central admin dashboard"
              : user.role === "BACK_OFFICE"
              ? "Back office dashboard"
              : `${user.branchName} branch`}
          </p>
        </div>


        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-900">{user.name}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
