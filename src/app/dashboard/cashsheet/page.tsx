import { Navbar } from "@/components/Navbar";
import { requireBranchManager } from "@/lib/auth";
import { CashSheetClient } from "@/components/CashSheetClient";

export default async function CashSheetPage() {
  const session = await requireBranchManager();

  return (
    <div className="min-h-screen bg-slate-100">
      <Navbar user={session} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <CashSheetClient user={session} />
      </main>
    </div>
  );
}
