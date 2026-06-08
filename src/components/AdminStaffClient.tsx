"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatINR, formatDate } from "@/lib/format";

type StaffItem = {
  id: string;
  name: string;
  role: string;
  salary: number;
  active: boolean;
  branchId: string;
  branchName: string;
};

type BranchItem = {
  id: string;
  name: string;
};

type AdminStaffClientProps = {
  initialStaff: StaffItem[];
  branches: BranchItem[];
};

export function AdminStaffClient({ initialStaff, branches }: AdminStaffClientProps) {
  const router = useRouter();
  const [staffList, setStaffList] = useState<StaffItem[]>(initialStaff);
  const [filterBranchId, setFilterBranchId] = useState<string>("ALL");

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [activeStaff, setActiveStaff] = useState<StaffItem | null>(null);
  
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formSalary, setFormSalary] = useState("0");
  const [formBranchId, setFormBranchId] = useState("");
  const [formActive, setFormActive] = useState(true);

  // New Personal Details States
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formEmergencyContact, setFormEmergencyContact] = useState("");
  const [formDob, setFormDob] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Add Expense Form States
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  function handleOpenAdd() {
    setActiveStaff(null);
    setFormName("");
    setFormRole("");
    setFormBranchId(branches[0]?.id || "");
    setFormActive(true);
    setFormSalary("0");
    setFormEmail("");
    setFormPhone("");
    setFormAddress("");
    setFormEmergencyContact("");
    setFormDob("");
    setPhotoFile(null);
    setPhotoPreview(null);
    setErrorMsg("");
    setSuccessMsg("");
    setShowModal(true);
  }

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



  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim() || !formRole.trim() || !formBranchId) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    const isEditing = activeStaff !== null;
    const url = "/api/admin/staff";
    const method = isEditing ? "PUT" : "POST";
    
    const formData = new FormData();
    if (isEditing && activeStaff) {
      formData.set("id", activeStaff.id);
      formData.set("active", String(formActive));
    }
    formData.set("name", formName.trim());
    formData.set("role", formRole.trim());
    formData.set("salary", formSalary);
    formData.set("branchId", formBranchId);
    formData.set("email", formEmail.trim());
    formData.set("phone", formPhone.trim());
    formData.set("address", formAddress.trim());
    formData.set("emergencyContact", formEmergencyContact.trim());
    formData.set("dob", formDob);

    if (photoFile) {
      formData.set("photo", photoFile);
    }

    try {
      const res = await fetch(url, {
        method,
        body: formData,
      });
      const data = await res.json();
      setSubmitting(false);

      if (!res.ok) {
        setErrorMsg(data.error ?? "Failed to save staff record.");
        return;
      }

      const savedBranchName = branches.find((b) => b.id === formBranchId)?.name ?? "N/A";
      const savedItem: StaffItem = {
        id: data.id,
        name: data.name,
        role: data.role,
        salary: data.salary,
        active: data.active,
        branchId: data.branchId,
        branchName: savedBranchName,
      };

      if (isEditing) {
        setStaffList((prev) =>
          prev.map((item) => (item.id === savedItem.id ? savedItem : item))
        );
        setSuccessMsg("Staff member updated successfully!");
      } else {
        setStaffList((prev) => [savedItem, ...prev]);
        setSuccessMsg("Staff member added successfully!");
      }

      setTimeout(() => {
        setShowModal(false);
      }, 1200);
    } catch {
      setSubmitting(false);
      setErrorMsg("Failed to save staff member due to a network error.");
    }
  }



  // Filter list
  const filteredStaff = staffList.filter((s) => {
    if (filterBranchId === "ALL") return true;
    return s.branchId === filterBranchId;
  });

  return (
    <div className="space-y-6">
      {/* Filters and Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-700">Filter Branch:</span>
          <select
            value={filterBranchId}
            onChange={(e) => setFilterBranchId(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-500 focus:ring-2"
          >
            <option value="ALL">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={handleOpenAdd}
          className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 self-start sm:self-center"
        >
          Add Staff Member
        </button>
      </div>

      {/* Staff Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Name</th>
              <th className="px-5 py-3.5 font-semibold">Role</th>
              <th className="px-5 py-3.5 font-semibold">Branch</th>
              <th className="px-5 py-3.5 font-semibold">Salary</th>
              <th className="px-5 py-3.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStaff.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                  No staff members found matching criteria.
                </td>
              </tr>
            ) : (
              filteredStaff.map((staff) => {
                return (
                  <tr
                    key={staff.id}
                    onClick={() => router.push(`/admin/staff/${staff.id}`)}
                    className="cursor-pointer transition hover:bg-slate-50/50"
                  >
                    <td className="px-5 py-4 font-semibold text-slate-900">{staff.name}</td>
                    <td className="px-5 py-4 text-slate-600">{staff.role}</td>
                    <td className="px-5 py-4 text-slate-600">{staff.branchName}</td>
                    <td className="px-5 py-4 text-slate-600">{formatINR(staff.salary)}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          staff.active
                            ? "bg-green-50 text-green-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {staff.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
        {/* Editor Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
            <h2 className="text-lg font-bold text-slate-900">
              {activeStaff ? "Edit Staff Member" : "Add Staff Member"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {activeStaff
                ? "Update employee information and active status."
                : "Register a new employee to one of the dealership branches."}
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Full Name <span className="text-rose-500">*</span>
                  </span>
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
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Job Role <span className="text-rose-500">*</span>
                  </span>
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
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Monthly Base Salary (INR) <span className="text-rose-500">*</span>
                  </span>
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
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Dealership Branch <span className="text-rose-500">*</span>
                  </span>
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
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Email Address
                  </span>
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
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Phone Number
                  </span>
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
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Emergency Contact Person
                  </span>
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
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Date of Birth
                  </span>
                  <input
                    type="date"
                    value={formDob}
                    onChange={(e) => setFormDob(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none ring-blue-500 focus:ring-2 text-slate-900 animate-transition bg-white"
                    disabled={submitting || !!successMsg}
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Permanent Address
                  </span>
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
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Profile Photo
                  </span>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className="relative flex min-h-[120px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center transition hover:border-blue-400 hover:bg-blue-50/50"
                  >
                    {photoPreview ? (
                      <div className="space-y-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photoPreview}
                          alt="Profile preview"
                          className="mx-auto max-h-24 rounded-lg border border-slate-200 object-contain shadow-xs"
                        />
                        <p className="text-xs text-slate-500">
                          {photoFile?.name ?? "Selected photo"}
                        </p>
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

              {activeStaff && (
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
              )}

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
    </div>
  );
}
