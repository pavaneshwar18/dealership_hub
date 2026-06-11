"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { VEHICLE_MODELS } from "@/lib/models";
import { formatDateToISTString } from "@/lib/format";

type SaleReportFormProps = {
  reportId?: string;
  redirectUrl?: string;
  branchId?: string;
  staff?: { id: string; name: string }[];
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
    vehicleStockId?: string;
    vehicleStock?: {
      id: string;
      chassisNumber: string;
      engineNumber: string;
      modelName: string;
      modelVariant: string | null;
    };
    hasExchange?: boolean;
    exchangeAmount?: number;
    exchangeModel?: string | null;
    exchangeYear?: string | null;
    hasHandLoan?: boolean;
    handLoanAmount?: number;
    salesExecutiveId?: string | null;
    additionalDocs?: string[] | null;
  };
};

export function SaleReportForm({ reportId, redirectUrl, branchId, staff, initialValues }: SaleReportFormProps) {
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

  const [hasExchange, setHasExchange] = useState<boolean>(initialValues?.hasExchange ?? false);
  const [exchangeAmount, setExchangeAmount] = useState<number>(initialValues?.exchangeAmount ?? 0);
  const [exchangeModel, setExchangeModel] = useState<string>(initialValues?.exchangeModel ?? "");
  const [exchangeYear, setExchangeYear] = useState<string>(initialValues?.exchangeYear ?? "");
  const [hasHandLoan, setHasHandLoan] = useState<boolean>(initialValues?.hasHandLoan ?? false);
  const [handLoanAmount, setHandLoanAmount] = useState<number>(initialValues?.handLoanAmount ?? 0);
  const [salesExecutiveId, setSalesExecutiveId] = useState<string>(initialValues?.salesExecutiveId ?? "");

  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [existingDocs, setExistingDocs] = useState<string[]>(
    initialValues?.additionalDocs ?? []
  );

  function handleAdditionalFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    addAdditionalFiles(Array.from(files));
  }

  function addAdditionalFiles(files: File[]) {
    const validFiles: File[] = [];
    let err = "";

    files.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        err = "Each additional document must be under 5 MB";
        return;
      }
      const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      if (!allowed.includes(file.type)) {
        err = "Documents must be PDF, JPEG, PNG, or WebP";
        return;
      }
      validFiles.push(file);
    });

    if (err) {
      setError(err);
    }
    setAdditionalFiles((prev) => [...prev, ...validFiles]);
  }

  function removeAdditionalFile(index: number) {
    setAdditionalFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function removeExistingDoc(index: number) {
    setExistingDocs((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAdditionalDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files) return;
    addAdditionalFiles(Array.from(files));
  }

  const staffList = staff || [];

  const [availableStock, setAvailableStock] = useState<any[]>([]);
  const [vehicleStockId, setVehicleStockId] = useState(
    initialValues?.vehicleStockId ?? initialValues?.vehicleStock?.id ?? ""
  );

  useEffect(() => {
    async function fetchStock() {
      try {
        const url = `/api/inventory?branchId=${branchId || ""}&status=AVAILABLE`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          // If editing and has initial linked stock, prepend/append it if not already present in data
          if (initialValues?.vehicleStock) {
            const exists = data.some((item: any) => item.id === initialValues.vehicleStock?.id);
            if (!exists) {
              data.unshift({
                ...initialValues.vehicleStock,
                status: "AVAILABLE",
              });
            }
          }
          setAvailableStock(data);
        }
      } catch (err) {
        console.error("Failed to fetch stock", err);
      }
    }
    fetchStock();
  }, [branchId, initialValues?.vehicleStock]);

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
    const base = paymentType === "Self" ? downPayment : downPayment + financeAmount;
    const exAmt = hasExchange ? exchangeAmount : 0;
    const hlAmt = hasHandLoan ? handLoanAmount : 0;
    setTotalAmount(base + exAmt + hlAmt);
  }, [downPayment, financeAmount, paymentType, hasExchange, exchangeAmount, hasHandLoan, handLoanAmount]);

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

  function handleChassisChange(stockId: string) {
    setVehicleStockId(stockId);
    if (!stockId) {
      setModelName("");
      setModelVariant("");
      return;
    }
    const matched = availableStock.find((item) => item.id === stockId);
    if (matched) {
      setModelName(matched.modelName);
      setModelVariant(matched.modelVariant ?? "");
    }
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

    if (!customerName || !customerFatherName || !customerAddress || !modelName || (paymentType !== "Self" && !financer) || !vehicleStockId || !salesExecutiveId) {
      setError("Please fill all required fields, including Vehicle Stock and Sales Executive");
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
    formData.set("hasExchange", String(hasExchange));
    formData.set("exchangeAmount", String(hasExchange ? exchangeAmount : 0));
    formData.set("exchangeModel", hasExchange ? exchangeModel : "");
    formData.set("exchangeYear", hasExchange ? exchangeYear : "");
    formData.set("hasHandLoan", String(hasHandLoan));
    formData.set("handLoanAmount", String(hasHandLoan ? handLoanAmount : 0));
    formData.set("vehicleStockId", vehicleStockId);
    formData.set("salesExecutiveId", salesExecutiveId);

    if (aadhaarFile) {
      formData.set("aadhaarImage", aadhaarFile);
    }

    additionalFiles.forEach((file) => {
      formData.append("additionalDocs", file);
    });
    formData.set("existingDocs", JSON.stringify(existingDocs));

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
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Sales Executive <span className="text-rose-500">*</span>
            </span>
            <select
              value={salesExecutiveId}
              onChange={(e) => setSalesExecutiveId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2 bg-white"
              required
            >
              <option value="">Select Sales Executive</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* Vehicle Model */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-semibold text-slate-900">Vehicle Model</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Vehicle Chassis / Engine Number <span className="text-rose-500">*</span>
            </span>
            <select
              value={vehicleStockId}
              onChange={(e) => handleChassisChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2 bg-white"
              required
            >
              <option value="">Select Available Vehicle</option>
              {availableStock.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.chassisNumber} / {item.engineNumber} ({item.modelName}{item.modelVariant ? ` - ${item.modelVariant}` : ""})
                </option>
              ))}
            </select>
            {availableStock.length === 0 && (
              <span className="mt-1.5 block text-xs text-rose-500 font-medium">
                No vehicles available in branch inventory. Please contact admin to transfer stock.
              </span>
            )}
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Model <span className="text-rose-500">*</span>
            </span>
            <select
              value={modelName}
              onChange={(e) => handleModelChange(e.target.value)}
              disabled={!!vehicleStockId}
              className={`w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2 bg-white ${
                vehicleStockId ? "bg-slate-50 text-slate-500 cursor-not-allowed" : ""
              }`}
              required
            >
              <option value="">Select model</option>
              {VEHICLE_MODELS.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
            {vehicleStockId && (
              <span className="mt-1 block text-xs text-slate-500">
                Model is determined by the selected vehicle stock.
              </span>
            )}
          </label>

          {hasVariants && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                {selectedModel?.variantLabel} <span className="text-rose-500">*</span>
              </span>
              <select
                value={modelVariant}
                onChange={(e) => setModelVariant(e.target.value)}
                disabled={!!vehicleStockId}
                className={`w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2 bg-white ${
                  vehicleStockId ? "bg-slate-50 text-slate-500 cursor-not-allowed" : ""
                }`}
                required
              >
                <option value="">Select {selectedModel?.variantLabel?.toLowerCase()}</option>
                {selectedModel?.variants?.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
              {vehicleStockId && (
                <span className="mt-1 block text-xs text-slate-500">
                  Variant is determined by the selected vehicle stock.
                </span>
              )}
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

          {/* Exchange Vehicle Section */}
          <div className="block md:col-span-2 border-t border-slate-100 pt-4 mt-2">
            <h3 className="text-sm font-semibold text-slate-950 mb-4">Vehicle Exchange Details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Vehicle Exchange?</span>
                <select
                  value={hasExchange ? "true" : "false"}
                  onChange={(e) => {
                    const isYes = e.target.value === "true";
                    setHasExchange(isYes);
                    if (!isYes) {
                      setExchangeAmount(0);
                      setExchangeModel("");
                      setExchangeYear("");
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2 bg-white"
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </label>

              {hasExchange && (
                <>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Exchange Model *</span>
                    <input
                      type="text"
                      placeholder="e.g. Pulsar 150, Activa 5G"
                      value={exchangeModel}
                      onChange={(e) => setExchangeModel(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
                      required={hasExchange}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Exchange Year Model *</span>
                    <input
                      type="text"
                      placeholder="e.g. 2018, 2020"
                      value={exchangeYear}
                      onChange={(e) => setExchangeYear(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
                      required={hasExchange}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Exchange Valuation Amount (₹) *</span>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={exchangeAmount || ""}
                      onChange={(e) => setExchangeAmount(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
                      required={hasExchange}
                    />
                  </label>
                </>
              )}
            </div>
          </div>

          {/* Hand Loan Section */}
          <div className="block md:col-span-2 border-t border-slate-100 pt-4 mt-2">
            <h3 className="text-sm font-semibold text-slate-905 mb-4">Hand Loan Details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Hand Loan?</span>
                <select
                  value={hasHandLoan ? "true" : "false"}
                  onChange={(e) => {
                    const isYes = e.target.value === "true";
                    setHasHandLoan(isYes);
                    if (!isYes) {
                      setHandLoanAmount(0);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2 bg-white"
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </label>

              {hasHandLoan && (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Hand Loan Amount (₹) *</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={handLoanAmount || ""}
                    onChange={(e) => setHandLoanAmount(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
                    required={hasHandLoan}
                  />
                </label>
              )}
            </div>
          </div>
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

      {/* Additional Documents Upload */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-semibold text-slate-900">Additional Sales Documents</h2>
        
        {/* Existing Docs */}
        {existingDocs.length > 0 && (
          <div className="mb-4 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Uploaded Documents</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {existingDocs.map((doc, idx) => {
                const parts = doc.split("/");
                const name = parts[parts.length - 1];
                return (
                  <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                    <a href={`/api/uploads/${doc}`} target="_blank" rel="noreferrer" className="truncate hover:underline text-blue-600">
                      {name}
                    </a>
                    <button
                      type="button"
                      onClick={() => removeExistingDoc(idx)}
                      className="text-rose-500 hover:text-rose-700 text-xs font-medium"
                    >
                      Delete
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleAdditionalDrop}
          className="relative flex min-h-[140px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition hover:border-blue-400 hover:bg-blue-50/50"
        >
          <div className="space-y-2">
            <svg
              className="mx-auto h-8 w-8 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
            <p className="text-sm font-medium text-slate-600">
              Drag &amp; drop other files here, or click to upload
            </p>
            <p className="text-xs text-slate-400">PDF, JPEG, PNG, or WebP · Max 5 MB each</p>
          </div>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleAdditionalFilesChange}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </div>

        {/* Selected Files List */}
        {additionalFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Selected Files</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {additionalFiles.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm">
                  <span className="truncate pr-2">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                  <button
                    type="button"
                    onClick={() => removeAdditionalFile(idx)}
                    className="text-rose-500 hover:text-rose-700 text-xs font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
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
