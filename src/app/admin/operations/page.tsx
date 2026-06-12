import { requireAdmin } from "@/lib/auth";
import { BackOfficeOperationsClient } from "@/components/BackOfficeOperationsClient";

export default async function AdminOperationsPage() {
  await requireAdmin();

  return <BackOfficeOperationsClient />;
}
