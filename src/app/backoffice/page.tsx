import { redirect } from "next/navigation";
import { requireBackOffice } from "@/lib/auth";

export default async function BackOfficeIndex() {
  await requireBackOffice();
  // Default landing page for back office is operations
  redirect("/backoffice/operations");
}
