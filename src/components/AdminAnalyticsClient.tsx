"use client";

import { useState } from "react";
import { AdminFinancersClient } from "./AdminFinancersClient";
import { AdminBranchAnalyticsClient } from "./AdminBranchAnalyticsClient";
import { AdminModelAnalyticsClient } from "./AdminModelAnalyticsClient";

export function AdminAnalyticsClient({ initialSales }: { initialSales: any[] }) {
  const [activeTab, setActiveTab] = useState<"branch" | "model" | "financers">("branch");

  return (
    <div className="space-y-6">
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab("branch")}
          className={`pb-3 text-sm font-semibold border-b-2 px-3 whitespace-nowrap transition-colors ${
            activeTab === "branch"
              ? "border-blue-700 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          Branch wise
        </button>
        <button
          onClick={() => setActiveTab("model")}
          className={`pb-3 text-sm font-semibold border-b-2 px-3 whitespace-nowrap transition-colors ${
            activeTab === "model"
              ? "border-blue-700 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          Model wise
        </button>
        <button
          onClick={() => setActiveTab("financers")}
          className={`pb-3 text-sm font-semibold border-b-2 px-3 whitespace-nowrap transition-colors ${
            activeTab === "financers"
              ? "border-blue-700 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          Financers Matrix
        </button>
      </div>

      <div className="mt-4">
        {activeTab === "branch" && (
          <div className="animate-in fade-in duration-300">
            <AdminBranchAnalyticsClient initialSales={initialSales} />
          </div>
        )}

        {activeTab === "model" && (
          <div className="animate-in fade-in duration-300">
            <AdminModelAnalyticsClient initialSales={initialSales} />
          </div>
        )}

        {activeTab === "financers" && (
          <div className="animate-in fade-in duration-300">
            <AdminFinancersClient initialSales={initialSales} />
          </div>
        )}
      </div>
    </div>
  );
}
