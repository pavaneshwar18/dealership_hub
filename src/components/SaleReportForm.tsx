"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { VEHICLE_MODELS } from "@/lib/models";
import { formatDateToISTString } from "@/lib/format";

type SaleReportFormProps = {
  reportId?: string;
  redirectUrl?: string;
  initialValues?: {
    customerName?: string;
    customerFatherName?: string;
    customerAddress?: string;
    modelName?: string;
    modelVariant?: string | null;
    totalAmount?: number;
    downPayment?: number;
    financeAmount?: number;
    financer?: string;
    aadhaarImagePath?: string | null;
    createdAt?: Date | string | null;
    paymentType?: string;
    paymentMode?: string;
    cashAmount?: number;
    bankAmount?: number;
  };
};

export function SaleReportForm({ reportId, redirectUrl, initialValues }: SaleReportFormProps) {
  const router = useRouter();
  
  const defaultDateStr = formatDateToISTString(new Date());
  const initialDateStr = initialValues?.createdAt
    ? typeof initialValues.createdAt === "string"
      ? initialValues.createdAt.slice(0, 10)
      : formatDateToISTString(new Date(initialValues.createdAt))
    : defaultDateStr;

  const [date, setDate] = useState(initialDateStr);
  const [customerName, setCustomerName] = useState(initialValues?.customerName ?? "");
  const [customerFatherName, setCustomerFatherName] = useState(
    initialValues?.customerFatherName ?? "",
  );
  const [customerAddress, setCustomerAddress] = useState(initialValues?.customerAddress ?? "");
  const [modelName, setModelName] = useState(initialValues?.modelName ?? "");
  const [modelVariant, setModelVariant] = useState(initialValues?.modelVariant ?? "");
  const [totalAmount, setTotalAmount] = useState(initialValues?.totalAmount ?? 0);
  const [downPayment, setDownPayment] = useState(initialValues?.downPayment ?? 0);
  const [financeAmount, setFinanceAmount] = useState(initialValues?.financeAmount ?? 0);
  const [financer, setFinancer] = useState(initialValues?.financer ?? "");
  const [paymentType, setPaymentType] = useState(initialValues?.paymentType ?? "Finance");
  const [paymentMode, setPaymentMode] = useState(initialValues?.paymentMode ?? "Cash");
  const [cashAmount, setCashAmount] = useState(initialValues?.cashAmount ?? 0);
  const [bankAmount, setBankAmount] = useState(initialValues?.bankAmount ?? 0);

  function handleCashAmountChange(val: number) {
    setCashAmount(val);
    setDownPayment(val + bankAmount);
  }

  function handleBankAmountChange(val: number) {
    setBankAmount(val);
    setDownPayment(cashAmount + val);
  }

  function handlePaymentModeChange(mode: string) {
    setPaymentMode(mode);
    if (mode === "Cash") {
      setCashAmount(downPayment);
      setBankAmount(0);
    } else if (mode === "Bank Transfer") {
      setCashAmount(0);
      setBankAmount(downPayment);
    } else if (mode === "Both") {
      if (cashAmount + bankAmount !== downPayment) {
        const half = Math.round((downPayment / 2) * 100) / 100;
        setCashAmount(half);
        setBankAmount(downPayment - half);
      }
    }
  }
  useEffect(() => {
    setTotalAmount(paymentType === "Self" ? downPayment : downPayment + financeAmount);
  }, [downPayment, financeAmount, paymentType]);

  const [aadhaarFile, setAadhaarFile] = useState<File | null>(null);
  const [aadhaarPreview, setAadhaarPreview] = useState<string | null>(
    initialValues?.aadhaarImagePath
      ? `/api/uploads/${initialValues.aadhaarImagePath}`
      : null,
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedModel = VEHICLE_MODELS.find((m) => m.name === modelName);
  const hasVariants = selectedModel?.variants && selectedModel.variants.length > 0;

  function handleModelChange(value: string) {
    setModelName(value);
    setModelVariant("");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Aadhaar image must be under 5 MB");
      return;
    }

    setAadhaarFile(file);
    setAadhaarPreview(URL.createObjectURL(file));
    setError("");
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Aadhaar image must be JPEG, PNG, or WebP");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Aadhaar image must be under 5 MB");
      return;
    }

    setAadhaarFile(file);
    setAadhaarPreview(URL.createObjectURL(file));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!customerName || !customerFatherName || !customerAddress || !modelName || (paymentType !== "Self" && !financer)) {
      setError("Please fill all required fields");
      setLoading(false);
      return;
    }

    if (hasVariants && !modelVariant) {
      setError(`Please select a ${selectedModel?.variantLabel?.toLowerCase() ?? "variant"}`);
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.set("customerName", customerName);
    formData.set("customerFatherName", customerFatherName);
    formData.set("customerAddress", customerAddress);
    formData.set("modelName", modelName);
    formData.set("modelVariant", modelVariant);
    formData.set("totalAmount", String(totalAmount));
    formData.set("downPayment", String(downPayment));
    formData.set("financeAmount", paymentType === "Self" ? "0" : String(financeAmount));
    formData.set("financer", paymentType === "Self" ? "Self" : financer);
    formData.set("paymentType", paymentType);
    formData.set("paymentMode", paymentMode);
    formData.set("cashAmount", paymentMode === "Cash" ? String(downPayment) : paymentMode === "Bank Transfer" ? "0" : String(cashAmount));
    formData.set("bankAmount", paymentMode === "Bank Transfer" ? String(downPayment) : paymentMode === "Cash" ? "0" : String(bankAmount));
    formData.set("date", date);

    if (aadhaarFile) {
      formData.set("aadhaarImage", aadhaarFile);
    }

    const url = reportId ? `/api/sales/${reportId}` : "/api/sales";
    const res = await fetch(url, {
      method: reportId ? "PUT" : "POST",
      body: formData,
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Unable to save sale report");
      return;
    }

    if (redirectUrl) {
      router.push(redirectUrl);
    } else {
      router.push("/dashboard/sales?saved=1");
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Customer Information */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-semibold text-slate-900">Customer &amp; Report Details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Report Date <span className="text-rose-500">*</span>
            </span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Customer Name <span className="text-rose-500">*</span>
            </span>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
              placeholder="Full name"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Father&apos;s Name <span className="text-rose-500">*</span>
            </span>
            <input
              type="text"
              value={customerFatherName}
              onChange={(e) => setCustomerFatherName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
              placeholder="Father's full name"
              required
            />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Address <span className="text-rose-500">*</span>
            </span>
            <textarea
              rows={3}
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
              placeholder="Full address"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Payment Type <span className="text-rose-500">*</span>
            </span>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2 bg-white"
              required
            >
              <option value="Finance">Finance</option>
              <option value="Self">Self (Full Payment)</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Payment Mode <span className="text-rose-500">*</span>
            </span>
            <select
              value={paymentMode}
              onChange={(e) => handlePaymentModeChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2 bg-white"
              required
            >
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Both">Both (Cash &amp; Bank Transfer)</option>
            </select>
          </label>
        </div>
      </section>

      {/* Vehicle Model */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-semibold text-slate-900">Vehicle Model</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Model <span className="text-rose-500">*</span>
            </span>
            <select
              value={modelName}
              onChange={(e) => handleModelChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
              required
            >
              <option value="">Select model</option>
              {VEHICLE_MODELS.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>

          {hasVariants && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                {selectedModel?.variantLabel} <span className="text-rose-500">*</span>
              </span>
              <select
                value={modelVariant}
                onChange={(e) => setModelVariant(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
                required
              >
                <option value="">Select {selectedModel?.variantLabel?.toLowerCase()}</option>
                {selectedModel?.variants?.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </section>

      {/* Financial Details */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-semibold text-slate-900">Financial Details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Total Amount (₹) <span className="text-rose-500">*</span>
            </span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={totalAmount}
              readOnly
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-500 outline-none ring-blue-500 focus:ring-2 bg-slate-50 cursor-not-allowed"
            />
            <span className="mt-1 block text-xs text-slate-500">
              Calculated automatically as Down Payment + Finance Amount
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Amount Paid (Down Payment) (₹) <span className="text-rose-500">*</span>
            </span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={downPayment}
              onChange={(e) => {
                if (paymentMode !== "Both") {
                  setDownPayment(Number(e.target.value));
                  if (paymentMode === "Cash") {
                    setCashAmount(Number(e.target.value));
                  } else {
                    setBankAmount(Number(e.target.value));
                  }
                }
              }}
              readOnly={paymentMode === "Both"}
              className={`w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2 ${
                paymentMode === "Both" ? "bg-slate-50 text-slate-500 cursor-not-allowed" : ""
              }`}
            />
            {paymentMode === "Both" && (
              <span className="mt-1 block text-xs text-slate-500">
                Calculated automatically from Cash + Bank portions
              </span>
            )}
          </label>

          {paymentMode === "Both" && (
            <>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Cash Portion (₹) <span className="text-rose-500">*</span>
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={cashAmount}
                  onChange={(e) => handleCashAmountChange(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Bank Transfer Portion (₹) <span className="text-rose-500">*</span>
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={bankAmount}
                  onChange={(e) => handleBankAmountChange(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
                  required
                />
              </label>
            </>
          )}
          {paymentType === "Finance" && (
            <>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Finance Amount (₹) <span className="text-rose-500">*</span>
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={financeAmount}
                  onChange={(e) => setFinanceAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Financer <span className="text-rose-500">*</span>
                </span>
                <input
                  type="text"
                  value={financer}
                  onChange={(e) => setFinancer(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
                  placeholder="Name of financing institution"
                  required
                />
              </label>
            </>
          )}
        </div>
      </section>

      {/* Aadhaar Upload */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-semibold text-slate-900">Aadhaar Card</h2>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="relative flex min-h-[160px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition hover:border-blue-400 hover:bg-blue-50/50"
        >
          {aadhaarPreview ? (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={aadhaarPreview}
                alt="Aadhaar card preview"
                className="mx-auto max-h-48 rounded-lg border border-slate-200 object-contain shadow-sm"
              />
              <p className="text-sm text-slate-500">
                {aadhaarFile?.name ?? "Existing upload"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <svg
                className="mx-auto h-10 w-10 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
                />
              </svg>
              <p className="text-sm font-medium text-slate-600">
                Drag &amp; drop Aadhaar card image here
              </p>
              <p className="text-xs text-slate-400">JPEG, PNG, or WebP · Max 5 MB</p>
            </div>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
        >
          {loading ? "Saving..." : reportId ? "Update sale report" : "Submit sale report"}
        </button>
      </div>
    </form>
  );
}
