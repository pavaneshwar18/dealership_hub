import { requireBackOffice } from "@/lib/auth";
import { BackOfficeOperationsClient } from "@/components/BackOfficeOperationsClient";

export default async function BackOfficeOperationsPage() {
  await requireBackOffice();

  return <BackOfficeOperationsClient />;
}
