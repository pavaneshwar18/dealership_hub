export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(value);
}

export function todayIST(): Date {
  const now = new Date();
  const ist = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  );
  ist.setHours(0, 0, 0, 0);
  return ist;
}

export function startOfDayIST(date: Date): Date {
  const ist = new Date(
    date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  );
  ist.setHours(0, 0, 0, 0);
  return ist;
}
