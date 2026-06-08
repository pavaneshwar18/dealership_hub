"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatINR, formatDate } from "@/lib/format";

type BranchItem = {
  id: string;
  name: string;
};

type StaffDetailsProps = {
  staff: {
    id: string;
    name: string;
    role: string;
    salary: number;
    active: boolean;
    createdAt: string;
    branchName: string;
    branchId: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    emergencyContact?: string | null;
    dob?: string | null;
    photoPath?: string | null;
  };
  attendanceStats: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    leaveDays: number;
    attendanceRate: number;
  };
  payments: Array<{
    id: string;
    date: string;
    amount: number;
    description: string;
    source: string;
    recordedBy: string;
  }>;
  branches?: BranchItem[];
};

export function AdminStaffDetailsClient({ staff, attendanceStats, payments, branches = [] }: StaffDetailsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"payments" | "attendance" | "profile" | "sales">("profile");

  // Local state for staff details to reflect updates dynamically
  const [staffData, setStaffData] = useState(staff);

  // Edit Modal States
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [formName, setFormName] = useState(staff.name);
  const [formRole, setFormRole] = useState(staff.role);
  const [formSalary, setFormSalary] = useState(staff.salary.toString());
  const [formBranchId, setFormBranchId] = useState(staff.branchId);
  const [formActive, setFormActive] = useState(staff.active);

  // New Personal Details states
  const [formEmail, setFormEmail] = useState(staff.email ?? "");
  const [formPhone, setFormPhone] = useState(staff.phone ?? "");
  const [formAddress, setFormAddress] = useState(staff.address ?? "");
  const [formEmergencyContact, setFormEmergencyContact] = useState(staff.emergencyContact ?? "");
  const [formDob, setFormDob] = useState(staff.dob ?? "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    staff.photoPath ? `/api/uploads/${staff.photoPath}` : null
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Profile photo must be under 5 MB");
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setErrorMsg("");
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setErrorMsg("Profile photo must be JPEG, PNG, or WebP");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("Profile photo must be under 5 MB");
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setErrorMsg("");
  }

  // Get initials for the profile avatar placeholder
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || !formRole.trim() || !formBranchId) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    const formData = new FormData();
    formData.set("id", staffData.id);
    formData.set("name", formName.trim());
    formData.set("role", formRole.trim());
    formData.set("salary", formSalary);
    formData.set("branchId", formBranchId);
    formData.set("active", String(formActive));
    formData.set("email", formEmail.trim());
    formData.set("phone", formPhone.trim());
    formData.set("address", formAddress.trim());
    formData.set("emergencyContact", formEmergencyContact.trim());
    formData.set("dob", formDob);

    if (photoFile) {
      formData.set("photo", photoFile);
    } else if (photoPreview) {
      formData.set("keepOldPhoto", "true");
    } else {
      formData.set("keepOldPhoto", "false");
    }

    try {
      const res = await fetch("/api/admin/staff", {
        method: "PUT",
        body: formData,
      });
      const data = await res.json();
      setSubmitting(false);

      if (!res.ok) {
        setErrorMsg(data.error ?? "Failed to save staff record.");
        return;
      }

      const updatedBranchName = branches.find((b) => b.id === formBranchId)?.name ?? staffData.branchName;
      setStaffData({
        ...staffData,
        name: data.name,
        role: data.role,
        salary: data.salary,
        active: data.active,
        branchId: data.branchId,
        branchName: updatedBranchName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        emergencyContact: data.emergencyContact,
        dob: data.dob,
        photoPath: data.photoPath,
      });

      setSuccessMsg("Staff member updated successfully!");
      router.refresh();

      setTimeout(() => {
        setShowModal(false);
        setSuccessMsg("");
      }, 1200);
    } catch {
      setSubmitting(false);
      setErrorMsg("Failed to save staff member due to a network error.");
    }
  }

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteConfirm() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/staff?id=${staffData.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Failed to delete staff member.");
        setDeleting(false);
        return;
      }

      setShowDeleteConfirm(false);
      router.push("/admin/staff");
      router.refresh();
    } catch {
      alert("Failed to delete staff member due to a network error.");
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Back link & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href="/admin/staff"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs self-start"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Staff Directory
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition shadow-xs"
          >
            Edit Profile
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 px-4 py-2.5 text-sm font-semibold text-rose-700 transition shadow-xs"
          >
            Remove Employee
          </button>
        </div>
      </div>

      {/* Profile Header Block */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center gap-6">
        <div className="h-24 w-24 shrink-0 rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden text-slate-600">
          {staffData.photoPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/uploads/${staffData.photoPath}`}
              alt={staffData.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-3xl font-bold">{getInitials(staffData.name)}</span>
          )}
        </div>
        
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 truncate">{staffData.name}</h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                staffData.active
                  ? "bg-green-50 text-green-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {staffData.active ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            {staffData.role} · <span className="text-slate-700">{staffData.branchName} Branch</span>
          </p>
        </div>

        <div className="pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-slate-100 md:pl-6 space-y-1.5">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Salary Commitment</p>
          <p className="text-xl font-black text-slate-900">{formatINR(staffData.salary)} <span className="text-xs font-medium text-slate-500">/ month</span></p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab("profile")}
          className={`pb-3 text-sm font-semibold border-b-2 px-3 whitespace-nowrap transition-colors ${
            activeTab === "profile"
              ? "border-blue-700 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          Personal Profile
        </button>
        <button
          onClick={() => setActiveTab("sales")}
          className={`pb-3 text-sm font-semibold border-b-2 px-3 whitespace-nowrap transition-colors ${
            activeTab === "sales"
              ? "border-blue-700 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          Sales Performance
        </button>
        <button
          onClick={() => setActiveTab("attendance")}
          className={`pb-3 text-sm font-semibold border-b-2 px-3 whitespace-nowrap transition-colors ${
            activeTab === "attendance"
              ? "border-blue-700 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          Attendance & Metrics
        </button>
        <button
          onClick={() => setActiveTab("payments")}
          className={`pb-3 text-sm font-semibold border-b-2 px-3 whitespace-nowrap transition-colors ${
            activeTab === "payments"
              ? "border-blue-700 text-blue-700"
              : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
          }`}
        >
          Salary & Payment Logs
        </button>
      </div>

      {/* Tab Panels */}
      <div className="mt-4">
        {/* PAYMENTS TAB */}
        {activeTab === "payments" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Recorded Salaries & Advances</h2>
              <span className="text-xs font-bold text-slate-500">{payments.length} log entries</span>
            </div>

            {payments.length === 0 ? (
              <div className="text-center py-10 text-slate-400 italic">
                No salary or advance payments recorded for this employee.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-bold">Payment Date</th>
                      <th className="px-5 py-3 font-bold">Source Ledger</th>
                      <th className="px-5 py-3 font-bold">Details</th>
                      <th className="px-5 py-3 font-bold">Recorded By</th>
                      <th className="px-5 py-3 font-bold text-right">Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                          {formatDate(item.date)}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-block rounded bg-slate-100 px-2 py-0.5 font-bold text-slate-600 text-[10px]">
                            {item.source}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-900 font-bold">
                          {item.description}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500">
                          {item.recordedBy}
                        </td>
                        <td className="px-5 py-3.5 text-right font-black text-rose-700 whitespace-nowrap">
                          - {formatINR(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ATTENDANCE TAB */}
        {activeTab === "attendance" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Attendance Metrics</h2>

            {/* Clean Info Grid (NO KPI Cards) */}
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5 bg-slate-50/50 p-5 rounded-xl border border-slate-100 text-xs font-semibold text-slate-600">
              <div className="space-y-1">
                <span className="text-slate-400 block">Total Logs</span>
                <span className="text-lg font-bold text-slate-900">{attendanceStats.totalDays} days</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 block">Present Logs</span>
                <span className="text-lg font-bold text-green-700">{attendanceStats.presentDays} days</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 block">Absent Logs</span>
                <span className="text-lg font-bold text-rose-700">{attendanceStats.absentDays} days</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 block">On Leave</span>
                <span className="text-lg font-bold text-amber-700">{attendanceStats.leaveDays} days</span>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 block">Attendance Rate</span>
                <span className="text-lg font-bold text-blue-700">{attendanceStats.attendanceRate}%</span>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Attendance Verification Status</h3>
              <p className="text-xs text-slate-500">
                Attendance rate is calculated relative to total recorded operations since hiring date ({formatDate(staffData.createdAt)}).
              </p>
            </div>
          </div>
        )}

        {/* PERSONAL PROFILE TAB */}
        {activeTab === "profile" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Personal & Contact Details</h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Email Address</label>
                  <span className="text-sm font-bold text-slate-800">{staffData.email || `${staffData.name.toLowerCase().replace(/\s+/g, "")}@bajajdealership.in`}</span>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Phone Number</label>
                  <span className="text-sm font-bold text-slate-800">{staffData.phone || "N/A"}</span>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Hiring & Registration Date</label>
                  <span className="text-sm font-bold text-slate-800">{formatDate(staffData.createdAt)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Permanent Address</label>
                  <span className="text-sm font-bold text-slate-800">{staffData.address || "N/A"}</span>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Emergency Contact Person</label>
                  <span className="text-sm font-bold text-slate-800">{staffData.emergencyContact || "N/A"}</span>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Date of Birth</label>
                  <span className="text-sm font-bold text-slate-800">{staffData.dob ? formatDate(staffData.dob) : "N/A"}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SALES PERFORMANCE TAB */}
        {activeTab === "sales" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Sales Attribution History</h2>
            
            <div className="text-center py-12 space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 border border-blue-100">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-sm font-bold text-slate-800">Future Integration: Agent Sales Tracking</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Vehicle sale transactions are currently cataloged at the branch level. A future update will allow linking individual Sales Executives to sale sheets, populating performance dashboards and commission metrics here.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
            <h2 className="text-lg font-bold text-slate-900">Edit Staff Profile</h2>
            <p className="mt-1 text-sm text-slate-500">Update employee information and active status.</p>

            <form onSubmit={handleEditSubmit} className="mt-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Full Name</span>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2 text-slate-900 animate-transition bg-white"
                    placeholder="e.g. Ramesh Kumar"
                    required
                    disabled={submitting || !!successMsg}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Job Role</span>
                  <input
                    type="text"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2 text-slate-900 animate-transition bg-white"
                    placeholder="e.g. Sales Executive"
                    required
                    disabled={submitting || !!successMsg}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Monthly Base Salary (INR)</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={formSalary}
                    onChange={(e) => setFormSalary(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2 text-slate-900 animate-transition bg-white"
                    placeholder="e.g. 20000"
                    required
                    disabled={submitting || !!successMsg}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Dealership Branch</span>
                  <select
                    value={formBranchId}
                    onChange={(e) => setFormBranchId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2 bg-white text-slate-900 animate-transition"
                    required
                    disabled={submitting || !!successMsg}
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Email Address</span>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2 text-slate-900 animate-transition bg-white"
                    placeholder="e.g. ramesh@bajajdealership.in"
                    disabled={submitting || !!successMsg}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Phone Number</span>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2 text-slate-900 animate-transition bg-white"
                    placeholder="e.g. +91 98765 43210"
                    disabled={submitting || !!successMsg}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Emergency Contact Person</span>
                  <input
                    type="text"
                    value={formEmergencyContact}
                    onChange={(e) => setFormEmergencyContact(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2 text-slate-900 animate-transition bg-white"
                    placeholder="e.g. Spouse / Parent"
                    disabled={submitting || !!successMsg}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Date of Birth</span>
                  <input
                    type="date"
                    value={formDob}
                    onChange={(e) => setFormDob(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2 text-slate-900 animate-transition bg-white"
                    disabled={submitting || !!successMsg}
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Permanent Address</span>
                  <textarea
                    rows={2}
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2 text-slate-900 animate-transition bg-white"
                    placeholder="Full permanent address"
                    disabled={submitting || !!successMsg}
                  />
                </label>

                <div className="block md:col-span-2">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Profile Photo</span>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className="relative flex min-h-[120px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center transition hover:border-blue-400 hover:bg-blue-50/50"
                  >
                    {photoPreview ? (
                      <div className="space-y-2 relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photoPreview}
                          alt="Profile preview"
                          className="mx-auto max-h-24 rounded-lg border border-slate-200 object-contain shadow-xs"
                        />
                        <p className="text-xs text-slate-500">
                          {photoFile?.name ?? "Profile photo active"}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoFile(null);
                            setPhotoPreview(null);
                          }}
                          className="absolute -top-1 -right-1 rounded-full bg-rose-500 hover:bg-rose-600 text-white p-1 text-xs"
                          title="Remove Photo"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
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
                            d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
                          />
                        </svg>
                        <p className="text-xs font-semibold text-slate-600">
                          Drag &amp; drop profile photo here or click to upload
                        </p>
                        <p className="text-[10px] text-slate-400">JPEG, PNG, or WebP · Max 5 MB</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      className="absolute inset-0 cursor-pointer opacity-0"
                      disabled={submitting || !!successMsg}
                    />
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-3.5 py-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                  disabled={submitting || !!successMsg}
                />
                <span className="text-sm font-semibold text-slate-700 select-none">
                  Active (Will show on daily attendance lists)
                </span>
              </label>

              {errorMsg && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700 animate-shake">
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700 animate-pulse">
                  {successMsg}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                  disabled={submitting || !!successMsg}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition disabled:opacity-60"
                  disabled={submitting || !!successMsg}
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-rose-50 border border-rose-100 text-rose-600 mx-auto">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-900">Remove Employee Record</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to remove <span className="font-bold text-slate-800">{staffData.name}</span>? This will permanently delete their employee record, payment logs, and attendance history. This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60"
                disabled={deleting}
              >
                {deleting ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
