"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/auth";

type NavbarProps = {
  user: SessionUser;
};

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();

  const links =
    user.role === "ADMIN"
      ? [] // Navigation links moved to the left sidebar for admin layout
      : [
          { href: "/dashboard", label: "Today" },
          { href: "/dashboard/history", label: "History" },
          { href: "/dashboard/sales", label: "Sales" },
        ];

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div>
          <Link href={user.role === "ADMIN" ? "/admin" : "/dashboard"} className="block">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
              Bajaj 3-Wheeler
            </p>
            <h1 className="text-lg font-bold text-slate-900">Dealership Hub</h1>
          </Link>
          <p className="text-sm text-slate-500">
            {user.role === "ADMIN"
              ? "Central admin dashboard"
              : `${user.branchName} branch`}
          </p>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                pathname === link.href || pathname.startsWith(link.href + "/")
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

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
