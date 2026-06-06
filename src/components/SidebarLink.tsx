"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SidebarLinkProps = {
  href: string;
  label: string;
  children: React.ReactNode;
};

export function SidebarLink({ href, label, children }: SidebarLinkProps) {
  const pathname = usePathname();
  
  // Highlighting active link: matches exact path or subpaths (e.g. /admin/reports/123 matches /admin/reports)
  const isActive =
    pathname === href || (href !== "/admin" && pathname.startsWith(href + "/"));

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
        isActive
          ? "bg-blue-50 text-blue-700"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {children}
      <span>{label}</span>
    </Link>
  );
}
