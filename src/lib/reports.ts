export type StockEntryInput = {
  modelName: string;
  modelVariant: string | null;
  stockOnHand: number;
  newStockReceived: number;
};

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
  stockEntries?: StockEntryInput[];
};

export function parseReportBody(body: Record<string, unknown>): DailyReportInput {
  const rawEntries = Array.isArray(body.stockEntries) ? body.stockEntries : [];
  const stockEntries: StockEntryInput[] = rawEntries
    .map((e: Record<string, unknown>) => ({
      modelName: String(e.modelName ?? ""),
      modelVariant: e.modelVariant ? String(e.modelVariant) : null,
      stockOnHand: Number(e.stockOnHand) || 0,
      newStockReceived: Number(e.newStockReceived) || 0,
    }))
    .filter(
      (e: StockEntryInput) =>
        e.modelName && (e.stockOnHand > 0 || e.newStockReceived > 0),
    );

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
    stockEntries,
  };
}
