"use client";

import { useEffect, useState } from "react";
import { formatINR } from "@/lib/format";

type OperationSale = {
  id: string;
  date: string;
  branchName: string;
  customerName: string;
  modelName: string;
  chassisNumber: string;
  trCompleted: boolean;
  invoiceCompleted: boolean;
  insuranceCompleted: boolean;
  numberPlateCompleted: boolean;
  trDate: string | null;
  trNumber: string | null;
  invoiceId: string | null;
  insuranceProvider: string | null;
  insurancePolicyNumber: string | null;
  permanentNumberPlate: string | null;
};

type ModalState = {
  isOpen: boolean;
  saleId: string | null;
  stage: "tr" | "invoice" | "insurance" | "numberPlate" | null;
};

export function BackOfficeOperationsClient() {
  const [sales, setSales] = useState<OperationSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("ALL");

  const [modal, setModal] = useState<ModalState>({ isOpen: false, saleId: null, stage: null });

  useEffect(() => {
    fetchOperations();
  }, []);

  async function fetchOperations() {
    try {
      const res = await fetch("/api/backoffice/operations");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSales(data);
    } catch {
      setErrorMsg("Failed to load operations data.");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenModal(saleId: string, stage: ModalState["stage"]) {
    setModal({ isOpen: true, saleId, stage });
  }

  function handleCloseModal() {
    setModal({ isOpen: false, saleId: null, stage: null });
  }

  async function handleSubmitStageData(data: any) {
    if (!modal.saleId || !modal.stage) return;

    try {
      const res = await fetch("/api/backoffice/operations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saleId: modal.saleId, stage: modal.stage, data }),
      });

      if (!res.ok) throw new Error("Update failed");

      // Optimistically update the UI and filter out if all completed
      setSales((current) =>
        current
          .map((sale) => {
            if (sale.id === modal.saleId) {
              const updatedSale = { ...sale };
              if (modal.stage === "tr") {
                updatedSale.trCompleted = true;
                updatedSale.trDate = data.trDate;
                updatedSale.trNumber = data.trNumber;
              } else if (modal.stage === "invoice") {
                updatedSale.invoiceCompleted = true;
                updatedSale.invoiceId = data.invoiceId;
              } else if (modal.stage === "insurance") {
                updatedSale.insuranceCompleted = true;
                updatedSale.insuranceProvider = data.insuranceProvider;
                updatedSale.insurancePolicyNumber = data.insurancePolicyNumber;
              } else if (modal.stage === "numberPlate") {
                updatedSale.numberPlateCompleted = true;
                updatedSale.permanentNumberPlate = data.permanentNumberPlate;
              }
              return updatedSale;
            }
            return sale;
          })
          .filter((sale) => {
            return !(
              sale.trCompleted &&
              sale.invoiceCompleted &&
              sale.insuranceCompleted &&
              sale.numberPlateCompleted
            );
          })
      );
      handleCloseModal();
    } catch (e) {
      alert("Failed to save details. Please try again.");
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700"></div>
      </div>
    );
  }

  const branchOptions = Array.from(new Set(sales.map((s) => s.branchName))).sort();

  const filteredSales = sales.filter((sale) => {
    if (selectedBranch !== "ALL" && sale.branchName !== selectedBranch) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        sale.customerName.toLowerCase().includes(q) ||
        sale.chassisNumber.toLowerCase().includes(q) ||
        sale.modelName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 relative">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Operations Pipeline</h1>
          <p className="mt-2 text-slate-500">
            Enter mandatory documentation details to complete post-sale requirements.
          </p>
        </div>

        <div className="w-full sm:w-48 shrink-0">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Pending Sales</p>
              <p className="mt-0.5 text-xl font-bold text-slate-900">{filteredSales.length}</p>
            </div>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700 font-bold text-[10px] uppercase tracking-wide">
              {filteredSales.length === 1 ? "Unit" : "Units"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by customer, model, or chassis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-w-[200px]"
        >
          <option value="ALL">All Branches</option>
          {branchOptions.map((branch) => (
            <option key={branch} value={branch}>{branch}</option>
          ))}
        </select>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMsg}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Date & Branch</th>
                <th className="px-5 py-4 font-semibold">Customer & Model</th>
                <th className="px-5 py-4 font-semibold">Chassis No.</th>
                <th className="px-5 py-4 font-semibold text-center">TR</th>
                <th className="px-5 py-4 font-semibold text-center">Invoice</th>
                <th className="px-5 py-4 font-semibold text-center">Insurance</th>
                <th className="px-5 py-4 font-semibold text-center">Number Plate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                    <p className="text-base font-semibold text-slate-700">All caught up!</p>
                    <p className="mt-1 text-sm">No pending post-sale operations found.</p>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{sale.date}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{sale.branchName}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">{sale.customerName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{sale.modelName}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs font-mono text-slate-700 tracking-wide">{sale.chassisNumber}</p>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <StageStatus
                        completed={sale.trCompleted}
                        label={sale.trNumber || "Done"}
                        onClick={() => handleOpenModal(sale.id, "tr")}
                      />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <StageStatus
                        completed={sale.invoiceCompleted}
                        label={sale.invoiceId || "Done"}
                        onClick={() => handleOpenModal(sale.id, "invoice")}
                      />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <StageStatus
                        completed={sale.insuranceCompleted}
                        label={sale.insuranceProvider ? `${sale.insuranceProvider} (${sale.insurancePolicyNumber})` : "Done"}
                        onClick={() => handleOpenModal(sale.id, "insurance")}
                      />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <StageStatus
                        completed={sale.numberPlateCompleted}
                        label={sale.permanentNumberPlate || "Done"}
                        onClick={() => handleOpenModal(sale.id, "numberPlate")}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal.isOpen && (
        <DataEntryModal
          stage={modal.stage!}
          onClose={handleCloseModal}
          onSubmit={handleSubmitStageData}
        />
      )}
    </div>
  );
}

function StageStatus({ completed, label, onClick }: { completed: boolean; label: string; onClick: () => void }) {
  if (completed) {
    return (
      <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 border border-green-100 max-w-[120px] truncate block mx-auto" title={label}>
        <svg className="mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        {label}
      </span>
    );
  }
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-blue-400 hover:bg-slate-50 transition shadow-sm"
    >
      Pending
    </button>
  );
}

function DataEntryModal({
  stage,
  onClose,
  onSubmit,
}: {
  stage: "tr" | "invoice" | "insurance" | "numberPlate";
  onClose: () => void;
  onSubmit: (data: any) => void;
}) {
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(formData);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-900/10">
        <h2 className="mb-1 text-xl font-bold text-slate-900">
          {stage === "tr" && "Enter TR Details"}
          {stage === "invoice" && "Enter Invoice Details"}
          {stage === "insurance" && "Enter Insurance Details"}
          {stage === "numberPlate" && "Enter Number Plate"}
        </h2>
        <p className="mb-6 text-sm text-slate-500">Provide the required documentation details to mark this stage as complete.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {stage === "tr" && (
            <>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">TR Application Date</span>
                <input
                  required
                  type="date"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  onChange={(e) => setFormData({ ...formData, trDate: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">TR Number</span>
                <input
                  required
                  type="text"
                  placeholder="e.g. TR-12345"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  onChange={(e) => setFormData({ ...formData, trNumber: e.target.value })}
                />
              </label>
            </>
          )}

          {stage === "invoice" && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Invoice ID</span>
              <input
                required
                type="text"
                placeholder="e.g. INV-9876"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                onChange={(e) => setFormData({ ...formData, invoiceId: e.target.value })}
              />
            </label>
          )}

          {stage === "insurance" && (
            <>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Insurance Provider</span>
                <input
                  required
                  type="text"
                  placeholder="e.g. Bajaj Allianz"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  onChange={(e) => setFormData({ ...formData, insuranceProvider: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Policy Number</span>
                <input
                  required
                  type="text"
                  placeholder="e.g. POL-12345678"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  onChange={(e) => setFormData({ ...formData, insurancePolicyNumber: e.target.value })}
                />
              </label>
            </>
          )}

          {stage === "numberPlate" && (
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Permanent Number Plate</span>
              <input
                required
                type="text"
                placeholder="e.g. TS 09 AB 1234"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm uppercase outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                onChange={(e) => setFormData({ ...formData, permanentNumberPlate: e.target.value.toUpperCase() })}
              />
            </label>
          )}

          <div className="mt-6 flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Details"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
