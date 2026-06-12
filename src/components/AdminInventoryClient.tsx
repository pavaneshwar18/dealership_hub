"use client";

import { useState, useMemo, useEffect } from "react";
import { VEHICLE_MODELS, getAllStockRows, getPricingConfigRows } from "@/lib/models";

type StockItem = {
  id: string;
  chassisNumber: string;
  engineNumber: string;
  modelName: string;
  modelVariant: string | null;
  color: string | null;
  status: string;
  receivedDate: string; // YYYY-MM-DD
  invoiceBillAmount: number;
  mrpAmount: number;
  branchId: string;
  branchName: string;
  saleReportId: string | null;
  soldTo: string | null;
};

type BranchItem = {
  id: string;
  name: string;
};

type ExchangeItem = {
  id: string;
  modelName: string;
  yearModel: string;
  valuation: number;
  status: string;
  receivedDate: string; // YYYY-MM-DD
  branchId: string;
  branchName: string;
  saleReportId: string;
  tradedInFrom: string;
};

type PriceConfigItem = {
  id: string;
  modelName: string;
  modelVariant: string;
  invoiceAmount: number;
  mrpAmount: number;
};

type AdminInventoryClientProps = {
  initialStock: StockItem[];
  initialExchangeStock: ExchangeItem[];
  branches: BranchItem[];
  initialPriceConfigs: PriceConfigItem[];
};

export function AdminInventoryClient({ initialStock, initialExchangeStock, branches, initialPriceConfigs }: AdminInventoryClientProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [stock, setStock] = useState<StockItem[]>(initialStock);
  const [exchangeStock, setExchangeStock] = useState<ExchangeItem[]>(initialExchangeStock);
  const [priceConfigs, setPriceConfigs] = useState<PriceConfigItem[]>(initialPriceConfigs);
  const [activeTab, setActiveTab] = useState<"new" | "exchange" | "pricing">("new");
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState<string | null>(null); // tracks id of item currently updating

  // Custom Alert/Confirm Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "alert" | "confirm";
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "alert",
  });

  function triggerAlert(title: string, message: string) {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type: "alert",
    });
  }

  function triggerConfirm(title: string, message: string, onConfirm: () => void) {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type: "confirm",
      onConfirm,
    });
  }

  // Form State
  const [modelName, setModelName] = useState("");
  const [modelVariant, setModelVariant] = useState("");
  const [chassisNumber, setChassisNumber] = useState("");
  const [engineNumber, setEngineNumber] = useState("");
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10));
  const [invoiceBillAmount, setInvoiceBillAmount] = useState("0");
  const [mrpAmount, setMrpAmount] = useState("0");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // AI Ingestion State
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadBranchId, setUploadBranchId] = useState(branches[0]?.id || "");
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [bulkSuccess, setBulkSuccess] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  
  type ParsedVehicle = {
    tempId: string;
    chassisNumber: string;
    engineNumber: string;
    modelName: string;
    modelVariant: string | null;
  };
  const [parsedVehicles, setParsedVehicles] = useState<ParsedVehicle[]>([]);

  async function handleScanInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) {
      setScanError("Please select a file to upload.");
      return;
    }
    setIsScanning(true);
    setScanError("");
    setBulkSuccess("");
    setParsedVehicles([]);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/inventory/upload-invoice", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setScanError(data.error ?? "Failed to parse the invoice.");
        return;
      }

      if (!data.vehicles || data.vehicles.length === 0) {
        setScanError("No vehicles could be extracted from this invoice. Please check the layout or upload manually.");
        return;
      }

      const tempVehicles = data.vehicles.map((v: any, index: number) => ({
        tempId: `${Date.now()}-${index}`,
        chassisNumber: (v.chassisNumber || "").toUpperCase(),
        engineNumber: (v.engineNumber || "").toUpperCase(),
        modelName: v.modelName || "",
        modelVariant: v.modelVariant || "",
      }));

      setParsedVehicles(tempVehicles);
    } catch {
      setScanError("Connection error. Could not connect to the scan server.");
    } finally {
      setIsScanning(false);
    }
  }

  async function handleBulkRegister() {
    setBulkLoading(true);
    setScanError("");
    setBulkSuccess("");

    for (const v of parsedVehicles) {
      if (!v.chassisNumber.trim() || !v.engineNumber.trim() || !v.modelName.trim()) {
        setScanError("Chassis number, engine number, and model name are required for all vehicles.");
        setBulkLoading(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/inventory/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicles: parsedVehicles,
          branchId: uploadBranchId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setScanError(data.error ?? "Failed to register stock in bulk.");
        return;
      }

      const targetBranch = branches.find((b) => b.id === uploadBranchId);
      const formattedItems = data.items.map((item: any) => ({
        ...item,
        receivedDate: item.receivedDate.slice(0, 10),
        branchName: targetBranch ? targetBranch.name : "Unknown",
      }));

      setStock((prev) => [...formattedItems, ...prev]);
      setBulkSuccess(`Successfully registered ${data.count} vehicles at ${targetBranch?.name || "depot"}!`);
      setParsedVehicles([]);
      setSelectedFile(null);
    } catch {
      setScanError("A connection error occurred while submitting stock in bulk.");
    } finally {
      setBulkLoading(false);
    }
  }

  function updateParsedVehicleField(tempId: string, field: keyof ParsedVehicle, value: string) {
    setParsedVehicles((prev) =>
      prev.map((v) => (v.tempId === tempId ? { ...v, [field]: value } : v))
    );
  }

  // Use a different name to avoid collision with standard single item delete
  function removeParsedVehicleRow(tempId: string) {
    setParsedVehicles((prev) => prev.filter((v) => v.tempId !== tempId));
  }

  // Table Filters State
  const [filterBranchId, setFilterBranchId] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("AVAILABLE");
  const [filterModel, setFilterModel] = useState("ALL");
  const [filterAging, setFilterAging] = useState("ALL"); // ALL, 0-30, 30-60, 60-90, 90+
  const [searchQuery, setSearchQuery] = useState("");

  const selectedModelInfo = VEHICLE_MODELS.find((m) => m.name === modelName);
  const hasVariants = selectedModelInfo?.variants && selectedModelInfo.variants.length > 0;

  function calculateDaysOld(receivedDateStr: string): number {
    const diffTime = Math.abs(new Date().getTime() - new Date(receivedDateStr).getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }



  // Filtered Stock List for Display
  const filteredStock = useMemo(() => {
    return stock.filter((item) => {
      if (filterBranchId !== "ALL" && item.branchId !== filterBranchId) {
        return false;
      }
      if (filterStatus !== "ALL" && item.status !== filterStatus) {
        return false;
      }
      if (filterModel !== "ALL" && item.modelName !== filterModel) {
        return false;
      }
      
      if (filterAging !== "ALL") {
        const days = calculateDaysOld(item.receivedDate);
        if (filterAging === "0-30" && days > 30) return false;
        if (filterAging === "30-60" && (days <= 30 || days > 60)) return false;
        if (filterAging === "60-90" && (days <= 60 || days > 90)) return false;
        if (filterAging === "90+" && days <= 90) return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const chassisMatch = item.chassisNumber.toLowerCase().includes(query);
        const engineMatch = item.engineNumber.toLowerCase().includes(query);
        if (!chassisMatch && !engineMatch) {
          return false;
        }
      }

      return true;
    });
  }, [stock, filterBranchId, filterStatus, filterModel, filterAging, searchQuery]);

  async function handleAddStock(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");
    setFormSuccess("");

    if (!modelName || !chassisNumber || !engineNumber || !invoiceBillAmount || !mrpAmount) {
      setFormError("Please fill in all required fields");
      setFormLoading(false);
      return;
    }

    if (isNaN(Number(invoiceBillAmount)) || parseFloat(invoiceBillAmount) < 0) {
      setFormError("Please enter a valid positive invoice bill amount");
      setFormLoading(false);
      return;
    }

    if (isNaN(Number(mrpAmount)) || parseFloat(mrpAmount) < 0) {
      setFormError("Please enter a valid positive MRP amount");
      setFormLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelName,
          modelVariant: hasVariants ? modelVariant : null,
          chassisNumber,
          engineNumber,
          color: null,
          receivedDate,
          invoiceBillAmount: parseFloat(invoiceBillAmount),
          mrpAmount: parseFloat(mrpAmount),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Failed to save stock item");
        setFormLoading(false);
        return;
      }

      // Add newly created item to state (ensuring date is formatted correctly)
      const formattedItem = {
        ...data,
        receivedDate: data.receivedDate.slice(0, 10),
        branchName: "Miryalaguda",
      };
      setStock((prev) => [formattedItem, ...prev]);
      setFormSuccess(`Chassis ${chassisNumber} registered at Miryalaguda depot successfully!`);
      
      // Clear fields
      setChassisNumber("");
      setEngineNumber("");
      setInvoiceBillAmount("0");
      setMrpAmount("0");
    } catch {
      setFormError("An unexpected connection error occurred.");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleTransfer(itemId: string, destinationBranchId: string) {
    setLoading(itemId);
    try {
      const res = await fetch(`/api/inventory/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId: destinationBranchId }),
      });

      const data = await res.json();
      if (!res.ok) {
        triggerAlert("Transfer Failed", data.error ?? "Failed to transfer vehicle");
        return;
      }

      // Update state item with returned transfer info
      setStock((prev) =>
        prev.map((s) => (s.id === itemId ? { ...s, branchId: data.branchId, branchName: data.branch.name } : s))
      );
    } catch {
      triggerAlert("Transfer Failed", "Unable to process transfer at this time");
    } finally {
      setLoading(null);
    }
  }

  async function executeDelete(itemId: string) {
    setLoading(itemId);
    try {
      const res = await fetch(`/api/inventory/${itemId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        triggerAlert("Delete Failed", data.error ?? "Failed to delete item");
        return;
      }

      setStock((prev) => prev.filter((s) => s.id !== itemId));
    } catch {
      triggerAlert("Delete Failed", "Failed to delete vehicle due to a connection error.");
    } finally {
      setLoading(null);
    }
  }

  function handleDelete(itemId: string) {
    triggerConfirm(
      "Delete Vehicle",
      "Are you sure you want to delete this vehicle from stock inventory? This action cannot be undone.",
      () => executeDelete(itemId)
    );
  }

  async function handleExchangeTransfer(itemId: string, destinationBranchId: string) {
    setLoading(itemId);
    try {
      const res = await fetch(`/api/exchange-vehicles/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId: destinationBranchId }),
      });

      const data = await res.json();
      if (!res.ok) {
        triggerAlert("Transfer Failed", data.error ?? "Failed to transfer exchange vehicle");
        return;
      }

      setExchangeStock((prev) =>
        prev.map((s) => (s.id === itemId ? { ...s, branchId: data.branchId, branchName: data.branch.name } : s))
      );
    } catch {
      triggerAlert("Transfer Failed", "Unable to process transfer at this time");
    } finally {
      setLoading(null);
    }
  }

  async function executeExchangeDelete(itemId: string) {
    setLoading(itemId);
    try {
      const res = await fetch(`/api/exchange-vehicles/${itemId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        triggerAlert("Delete Failed", data.error ?? "Failed to delete item");
        return;
      }

      setExchangeStock((prev) => prev.filter((s) => s.id !== itemId));
    } catch {
      triggerAlert("Delete Failed", "Failed to delete exchange vehicle due to a connection error.");
    } finally {
      setLoading(null);
    }
  }

  function handleExchangeDelete(itemId: string) {
    triggerConfirm(
      "Delete Exchange Vehicle",
      "Are you sure you want to delete this exchange vehicle from stock inventory? This action cannot be undone.",
      () => executeExchangeDelete(itemId)
    );
  }

  // Filtered Exchange Stock List for Display
  const filteredExchangeStock = exchangeStock;

  // List of unique models dynamically from stock to feed model selector
  const modelOptions = useMemo(() => {
    const models = new Set<string>();
    if (activeTab === "new") {
      stock.forEach((s) => models.add(s.modelName));
    } else {
      exchangeStock.forEach((s) => models.add(s.modelName));
    }
    return Array.from(models).sort();
  }, [stock, exchangeStock, activeTab]);

  if (!mounted) {
    return (
      <div className="flex h-96 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="text-slate-500 font-medium animate-pulse">Loading stock inventory...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header section with Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Stock Inventory</h1>
          <p className="mt-2 text-slate-500">Track showroom available stock, arrival aging, and branch allocations</p>
        </div>
        {activeTab === "new" && (
          <div className="flex flex-col sm:flex-row gap-2.5 self-start">
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setShowUploadForm(false);
                setFormError("");
                setFormSuccess("");
              }}
              className="rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-250 px-4 py-2.5 text-sm font-semibold text-slate-800 transition shadow-sm"
            >
              {showAddForm ? "Hide Intake Form" : "Register Stock"}
            </button>
            <button
              onClick={() => {
                setShowUploadForm(!showUploadForm);
                setShowAddForm(false);
                setScanError("");
                setBulkSuccess("");
                setParsedVehicles([]);
                setSelectedFile(null);
              }}
              className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition shadow-sm"
            >
              {showUploadForm ? "Hide Upload Panel" : "Upload Stock Invoice"}
            </button>
          </div>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => {
            setActiveTab("new");
            setFilterStatus("AVAILABLE");
            setFilterModel("ALL");
            setSearchQuery("");
          }}
          className={`border-b-2 px-6 py-3 text-sm font-semibold transition ${
            activeTab === "new"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
          }`}
        >
          New Vehicles
        </button>
        <button
          onClick={() => {
            setActiveTab("exchange");
            setFilterStatus("AVAILABLE");
            setFilterModel("ALL");
            setSearchQuery("");
          }}
          className={`border-b-2 px-6 py-3 text-sm font-semibold transition ${
            activeTab === "exchange"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
          }`}
        >
          Exchange Vehicles
        </button>
        <button
          onClick={() => {
            setActiveTab("pricing");
          }}
          className={`border-b-2 px-6 py-3 text-sm font-semibold transition ${
            activeTab === "pricing"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
          }`}
        >
          Price Settings
        </button>
      </div>

      {/* Register Stock Form Panel */}
      {activeTab === "new" && showAddForm && (
        <form onSubmit={handleAddStock} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6 transition-all duration-300">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold text-slate-900">New Vehicle Intake (Miryalaguda Depot)</h2>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Default Depot Arrival</p>
          </div>

          {formError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
              {formSuccess}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Vehicle Model *</span>
              <select
                value={modelName}
                onChange={(e) => {
                  const selectedModel = e.target.value;
                  setModelName(selectedModel);
                  setModelVariant("");
                  const config = priceConfigs.find(
                    (c) => c.modelName === selectedModel && c.modelVariant === ""
                  );
                  if (config) {
                    setInvoiceBillAmount(String(config.invoiceAmount));
                    setMrpAmount(String(config.mrpAmount));
                  } else {
                    setInvoiceBillAmount("0");
                    setMrpAmount("0");
                  }
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2 bg-white"
                required
              >
                <option value="">Select Model</option>
                {VEHICLE_MODELS.map((m) => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))}
              </select>
            </label>

            {hasVariants && (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">{selectedModelInfo?.variantLabel} *</span>
                <select
                  value={modelVariant}
                  onChange={(e) => {
                    const selectedVariant = e.target.value;
                    setModelVariant(selectedVariant);
                    const config = priceConfigs.find(
                      (c) => c.modelName === modelName && c.modelVariant === selectedVariant
                    );
                    if (config) {
                      setInvoiceBillAmount(String(config.invoiceAmount));
                      setMrpAmount(String(config.mrpAmount));
                    } else {
                      const parentConfig = priceConfigs.find(
                        (c) => c.modelName === modelName && c.modelVariant === ""
                      );
                      if (parentConfig) {
                        setInvoiceBillAmount(String(parentConfig.invoiceAmount));
                        setMrpAmount(String(parentConfig.mrpAmount));
                      } else {
                        setInvoiceBillAmount("0");
                        setMrpAmount("0");
                      }
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2 bg-white"
                  required
                >
                  <option value="">Select Variant</option>
                  {selectedModelInfo?.variants?.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </label>
            )}

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Chassis Number *</span>
              <input
                type="text"
                placeholder="Unique chassis code"
                value={chassisNumber}
                onChange={(e) => setChassisNumber(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2 uppercase"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Engine Number *</span>
              <input
                type="text"
                placeholder="Unique engine code"
                value={engineNumber}
                onChange={(e) => setEngineNumber(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2 uppercase"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Intake/Arrival Date *</span>
              <input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2 bg-white"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Invoice Bill Amount (₹) *</span>
              <input
                type="number"
                step="any"
                placeholder="0"
                value={invoiceBillAmount}
                onChange={(e) => setInvoiceBillAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">MRP Amount (₹) *</span>
              <input
                type="number"
                step="any"
                placeholder="0"
                value={mrpAmount}
                onChange={(e) => setMrpAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
                required
              />
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={formLoading}
              className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition disabled:opacity-50"
            >
              {formLoading ? "Adding..." : "Register Vehicle"}
            </button>
          </div>
        </form>
      )}

      {/* AI Invoice Import Panel */}
      {activeTab === "new" && showUploadForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6 transition-all duration-300">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Invoice Intake
            </h2>
            <p className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider">Gemini OCR Scanner</p>
          </div>

          {scanError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
              {scanError}
            </div>
          )}
          {bulkSuccess && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
              {bulkSuccess}
            </div>
          )}

          <form onSubmit={handleScanInvoice} className="grid gap-6 sm:grid-cols-3 items-end">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Target Arrival Depot *</span>
              <select
                value={uploadBranchId}
                onChange={(e) => setUploadBranchId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2 bg-white"
                required
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Select Invoice File (PDF, Image) *</span>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                required
              />
            </label>

            <button
              type="submit"
              disabled={isScanning || !selectedFile}
              className="w-full rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isScanning ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Scanning Invoice...
                </>
              ) : (
                "Scan & Extract Stock"
              )}
            </button>
          </form>

          {/* Verification Table */}
          {parsedVehicles.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-md font-bold text-slate-900">Scan Results: Review Extracted Vehicles</h3>
                  <p className="text-xs text-slate-500">Correct any scanning errors or mismatching models below before registering them to the inventory.</p>
                </div>
                <span className="inline-flex self-start items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                  {parsedVehicles.length} Vehicles Detected
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2.5 font-semibold">Chassis Number</th>
                      <th className="px-3 py-2.5 font-semibold">Engine Number</th>
                      <th className="px-3 py-2.5 font-semibold">Model Name</th>
                      <th className="px-3 py-2.5 font-semibold">Variant (Optional)</th>
                      <th className="px-3 py-2.5 font-semibold text-center w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {parsedVehicles.map((v) => (
                      <tr key={v.tempId} className="hover:bg-slate-50/20">
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={v.chassisNumber}
                            onChange={(e) => updateParsedVehicleField(v.tempId, "chassisNumber", e.target.value.toUpperCase())}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none ring-blue-500 focus:ring-1 uppercase font-mono font-medium"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={v.engineNumber}
                            onChange={(e) => updateParsedVehicleField(v.tempId, "engineNumber", e.target.value.toUpperCase())}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none ring-blue-500 focus:ring-1 uppercase font-mono"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={v.modelName}
                            onChange={(e) => updateParsedVehicleField(v.tempId, "modelName", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none ring-blue-500 focus:ring-1 bg-white font-semibold"
                          >
                            <option value="">Select Model</option>
                            {VEHICLE_MODELS.map((m) => (
                              <option key={m.name} value={m.name}>{m.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            placeholder="None"
                            value={v.modelVariant || ""}
                            onChange={(e) => updateParsedVehicleField(v.tempId, "modelVariant", e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none ring-blue-500 focus:ring-1"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeParsedVehicleRow(v.tempId)}
                            className="text-rose-600 hover:text-rose-800 transition"
                            title="Remove this item"
                          >
                            <svg className="h-4 w-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setParsedVehicles([])}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Clear Results
                </button>
                <button
                  type="button"
                  disabled={bulkLoading}
                  onClick={handleBulkRegister}
                  className="rounded-xl bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {bulkLoading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Registering...
                    </>
                  ) : (
                    `Confirm & Register ${parsedVehicles.length} Vehicles`
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter Control Bar */}
      {activeTab === "new" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Branch Location</span>
            <select
              value={filterBranchId}
              onChange={(e) => setFilterBranchId(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2 bg-white"
            >
              <option value="ALL">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stock Status</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2 bg-white"
            >
              <option value="AVAILABLE">Available</option>
              <option value="SOLD">Sold</option>
              <option value="ALL">All Statuses</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vehicle Model</span>
            <select
              value={filterModel}
              onChange={(e) => setFilterModel(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2 bg-white"
            >
              <option value="ALL">All Models</option>
              {modelOptions.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Aging Bracket</span>
            <select
              value={filterAging}
              onChange={(e) => setFilterAging(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2 bg-white"
            >
              <option value="ALL">All Stock Ages</option>
              <option value="0-30">New Arrival (0-30 Days)</option>
              <option value="30-60">Moderate (30-60 Days)</option>
              <option value="60-90">Attention (60-90 Days)</option>
              <option value="90+">Aging Risk (90+ Days)</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Search Code</span>
            <input
              type="text"
              placeholder="Chassis / Engine"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2"
            />
          </label>
        </div>
      )}

      {activeTab === "new" && (
        /* Inventory Table List */
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3.5 font-semibold w-16">S.No.</th>
                <th className="px-4 py-3.5 font-semibold">Intake Date</th>
                <th className="px-4 py-3.5 font-semibold">Age (Days)</th>
                <th className="px-4 py-3.5 font-semibold">Model / Variant</th>
                <th className="px-4 py-3.5 font-semibold">Chassis Number</th>
                <th className="px-4 py-3.5 font-semibold">Engine Number</th>
                <th className="px-4 py-3.5 font-semibold">Current Branch / Allocation</th>
                <th className="px-4 py-3.5 font-semibold">Status</th>
                <th className="px-4 py-3.5 font-semibold text-right">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStock.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    No stock items match your criteria.
                  </td>
                </tr>
              ) : (
                filteredStock.map((item, index) => {
                  const ageDays = calculateDaysOld(item.receivedDate);
                  
                  // Color badges for aging stock
                  let ageBadgeClass = "bg-emerald-50 text-emerald-700 border-emerald-100";
                  if (ageDays > 90) {
                    ageBadgeClass = "bg-rose-50 text-rose-700 border-rose-100 animate-pulse";
                  } else if (ageDays > 60) {
                    ageBadgeClass = "bg-orange-50 text-orange-700 border-orange-100";
                  } else if (ageDays > 30) {
                    ageBadgeClass = "bg-amber-50 text-amber-700 border-amber-100";
                  }

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-4 text-slate-600 font-medium">{index + 1}</td>
                      <td className="px-4 py-4 text-slate-600">{item.receivedDate.slice(0, 10)}</td>
                      <td className="px-4 py-4">
                        {item.status === "AVAILABLE" ? (
                          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${ageBadgeClass}`}>
                            {ageDays} Days
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-900">{item.modelName}</div>
                        <div className="text-xs text-slate-500">{item.modelVariant || "Standard"}</div>
                      </td>
                      <td className="px-4 py-4 font-mono font-medium text-slate-800">{item.chassisNumber}</td>
                      <td className="px-4 py-4 font-mono text-slate-600">{item.engineNumber}</td>
                      <td className="px-4 py-4 text-slate-600">
                        {item.status === "AVAILABLE" ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={item.branchId}
                              disabled={loading === item.id}
                              onChange={(e) => handleTransfer(item.id, e.target.value)}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none ring-blue-500 focus:ring-1 cursor-pointer hover:bg-slate-50 transition"
                            >
                              {branches.map((b) => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                              ))}
                            </select>
                            {loading === item.id && (
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                            )}
                          </div>
                        ) : (
                          <span className="text-sm font-medium text-slate-900">{item.branchName}</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {item.status === "AVAILABLE" ? (
                          <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                            Available
                          </span>
                        ) : (
                          <div className="flex flex-col">
                            <span className="inline-flex self-start items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                              Sold
                            </span>
                            {item.soldTo && (
                              <span className="text-[10px] text-slate-500 mt-1 max-w-[120px] truncate">
                                To: {item.soldTo}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {item.status === "AVAILABLE" && (
                          <button
                            onClick={() => handleDelete(item.id)}
                            disabled={loading === item.id}
                            className="font-semibold text-rose-600 hover:text-rose-800 disabled:opacity-50 transition"
                            title="Delete from stock"
                          >
                            <svg className="h-5 w-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {activeTab === "exchange" && (
        /* Exchange Vehicles Table List */
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3.5 font-semibold w-16">S.No.</th>
                <th className="px-4 py-3.5 font-semibold">Traded Date</th>
                <th className="px-4 py-3.5 font-semibold">Model</th>
                <th className="px-4 py-3.5 font-semibold">Year Model</th>
                <th className="px-4 py-3.5 font-semibold">Valuation</th>
                <th className="px-4 py-3.5 font-semibold">Source Sale (Customer)</th>
                <th className="px-4 py-3.5 font-semibold">Current Branch / Allocation</th>
                <th className="px-4 py-3.5 font-semibold">Status</th>
                <th className="px-4 py-3.5 font-semibold text-right">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExchangeStock.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    No exchange stock items match your criteria.
                  </td>
                </tr>
              ) : (
                filteredExchangeStock.map((item, index) => {
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-4 text-slate-600 font-medium">{index + 1}</td>
                      <td className="px-4 py-4 text-slate-600">{item.receivedDate}</td>
                      <td className="px-4 py-4 font-semibold text-slate-900">{item.modelName}</td>
                      <td className="px-4 py-4 text-slate-600 font-medium">{item.yearModel}</td>
                      <td className="px-4 py-4 font-mono font-semibold text-emerald-600">
                        ₹{item.valuation.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        <a
                          href={`/admin/sales/${item.saleReportId}`}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {item.tradedInFrom}
                        </a>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {item.status === "AVAILABLE" ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={item.branchId}
                              disabled={loading === item.id}
                              onChange={(e) => handleExchangeTransfer(item.id, e.target.value)}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none ring-blue-500 focus:ring-1 cursor-pointer hover:bg-slate-50 transition"
                            >
                              {branches.map((b) => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                              ))}
                            </select>
                            {loading === item.id && (
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                            )}
                          </div>
                        ) : (
                          <span className="text-sm font-medium text-slate-900">{item.branchName}</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {item.status === "AVAILABLE" ? (
                          <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                            Available
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                            Sold
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {item.status === "AVAILABLE" && (
                          <button
                            onClick={() => handleExchangeDelete(item.id)}
                            disabled={loading === item.id}
                            className="font-semibold text-rose-600 hover:text-rose-800 disabled:opacity-50 transition"
                            title="Delete exchange vehicle"
                          >
                            <svg className="h-5 w-5 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {activeTab === "pricing" && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Model / Variant</th>
                  <th className="px-6 py-3.5 font-semibold">Default Invoice Price (₹)</th>
                  <th className="px-6 py-3.5 font-semibold">Default MRP Price (₹)</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {getPricingConfigRows().map((row) => {
                  const config = priceConfigs.find(
                    (c) => c.modelName === row.modelName && c.modelVariant === (row.modelVariant || "")
                  );
                  return (
                    <PriceConfigRow
                      key={`${row.modelName}-${row.modelVariant || "Standard"}`}
                      modelName={row.modelName}
                      modelVariant={row.modelVariant}
                      initialConfig={config}
                      onSaveSuccess={(updatedConfig) => {
                        setPriceConfigs((prev) => {
                          const existingIndex = prev.findIndex((c) => c.id === updatedConfig.id);
                          if (existingIndex > -1) {
                            return prev.map((c, i) => (i === existingIndex ? updatedConfig : c));
                          } else {
                            return [...prev, updatedConfig];
                          }
                        });
                      }}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Custom Alert/Confirm Modal */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => {
              if (modalConfig.type === "alert") {
                setModalConfig((prev) => ({ ...prev, isOpen: false }));
              }
            }}
          />
          <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl transition-all border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              {modalConfig.type === "confirm" ? (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 border border-rose-100 text-rose-600">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 border border-amber-100 text-amber-600">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
              <h3 className="text-lg font-bold leading-6 text-slate-900">{modalConfig.title}</h3>
            </div>
            <div className="mt-3">
              <p className="text-sm text-slate-500 leading-relaxed">{modalConfig.message}</p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              {modalConfig.type === "confirm" ? (
                <>
                  <button
                    type="button"
                    onClick={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalConfig((prev) => ({ ...prev, isOpen: false }));
                      if (modalConfig.onConfirm) modalConfig.onConfirm();
                    }}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition shadow-sm"
                  >
                    Confirm Delete
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
                  className="rounded-xl bg-blue-700 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition shadow-sm"
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type PriceConfigRowProps = {
  modelName: string;
  modelVariant: string | null;
  initialConfig?: PriceConfigItem;
  onSaveSuccess: (updatedConfig: PriceConfigItem) => void;
};

function PriceConfigRow({ modelName, modelVariant, initialConfig, onSaveSuccess }: PriceConfigRowProps) {
  const [invoice, setInvoice] = useState(initialConfig ? String(initialConfig.invoiceAmount) : "0");
  const [mrp, setMrp] = useState(initialConfig ? String(initialConfig.mrpAmount) : "0");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Update values if config props update dynamically
  useEffect(() => {
    if (initialConfig) {
      setInvoice(String(initialConfig.invoiceAmount));
      setMrp(String(initialConfig.mrpAmount));
    }
  }, [initialConfig]);

  async function handleSave() {
    setLoading(true);
    setSuccess(false);
    setError("");

    try {
      const res = await fetch("/api/admin/model-prices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelName,
          modelVariant: modelVariant || "",
          invoiceAmount: parseFloat(invoice) || 0,
          mrpAmount: parseFloat(mrp) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save prices");
        return;
      }

      setSuccess(true);
      onSaveSuccess(data);
      setTimeout(() => setSuccess(false), 2000);
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <tr className="hover:bg-slate-50/50 transition">
      <td className="px-6 py-4 font-semibold text-slate-900">
        {modelName}
        {modelVariant && (
          <span className="ml-2 inline-flex items-center rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
            {modelVariant}
          </span>
        )}
      </td>
      <td className="px-6 py-4">
        <input
          type="number"
          step="any"
          value={invoice}
          onChange={(e) => setInvoice(e.target.value)}
          className="w-full max-w-[180px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
        />
      </td>
      <td className="px-6 py-4">
        <input
          type="number"
          step="any"
          value={mrp}
          onChange={(e) => setMrp(e.target.value)}
          className="w-full max-w-[180px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none ring-blue-500 focus:ring-2"
        />
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-3">
          {error && <span className="text-xs text-rose-600 font-medium">{error}</span>}
          {success && (
            <span className="inline-flex items-center gap-1 text-xs text-green-600 font-semibold animate-bounce">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Saved!
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={loading}
            className="rounded-lg bg-blue-700 hover:bg-blue-800 px-3.5 py-2 text-xs font-semibold text-white transition disabled:opacity-50 inline-flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </button>
        </div>
      </td>
    </tr>
  );
}
