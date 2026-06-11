import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect(session.role === "ADMIN" ? "/admin" : "/dashboard");
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10 sm:px-6">
        <div className="grid w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-2">
          <section className="bg-gradient-to-br from-blue-800 to-blue-950 p-8 text-white sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-200">
              Vishnu Priya
            </p>
            <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Automotives</h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-blue-100">
              Centralised daily reporting for Miryalaguda, Nalgonda, Suryapet,
              Bhongir, and Kodad. Branch managers submit numbers; admin stays
              updated in one place.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-blue-50">
              <li>Daily sales, service, stock, and finance summary</li>
              <li>Branch-wise submission tracking</li>
              <li>Designed to replace scattered Excel updates</li>
            </ul>
          </section>

          <section className="p-8 sm:p-10">
            <h2 className="text-2xl font-bold text-slate-900">Sign in</h2>
            <p className="mt-2 text-sm text-slate-500">
              Use your branch or admin account to continue.
            </p>
            <div className="mt-8">
              <LoginForm />
            </div>

          </section>
        </div>
      </div>
    </main>
  );
}
