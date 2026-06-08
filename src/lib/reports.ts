export type DailyReportInput = {
  date: string;
  vehiclesSold: number;
  salesValue: number;
  bookings: number;
  pendingDeliveries: number;
  testDrives: number;
  serviceJobs: number;
  serviceRevenue: number;
  cashCollected: number;
  pendingPayments: number;
  staffPresent: number;
  customerComplaints: number;
  highlights?: string;
  issues?: string;
  notes?: string;
};

export function parseReportBody(body: Record<string, unknown>): DailyReportInput {
  return {
    date: String(body.date ?? ""),
    vehiclesSold: Number(body.vehiclesSold) || 0,
    salesValue: Number(body.salesValue) || 0,
    bookings: Number(body.bookings) || 0,
    pendingDeliveries: Number(body.pendingDeliveries) || 0,
    testDrives: Number(body.testDrives) || 0,
    serviceJobs: Number(body.serviceJobs) || 0,
    serviceRevenue: Number(body.serviceRevenue) || 0,
    cashCollected: Number(body.cashCollected) || 0,
    pendingPayments: Number(body.pendingPayments) || 0,
    staffPresent: Number(body.staffPresent) || 0,
    customerComplaints: Number(body.customerComplaints) || 0,
    highlights: body.highlights ? String(body.highlights) : undefined,
    issues: body.issues ? String(body.issues) : undefined,
    notes: body.notes ? String(body.notes) : undefined,
  };
}
