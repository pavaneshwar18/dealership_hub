type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "blue" | "green" | "amber" | "rose";
};

const accentClasses = {
  blue: "border-blue-100 bg-blue-50 text-blue-700",
  green: "border-green-100 bg-green-50 text-green-700",
  amber: "border-amber-100 bg-amber-50 text-amber-700",
  rose: "border-rose-100 bg-rose-50 text-rose-700",
};

export function StatCard({
  label,
  value,
  hint,
  accent = "blue",
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
      {hint ? (
        <p
          className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${accentClasses[accent]}`}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
