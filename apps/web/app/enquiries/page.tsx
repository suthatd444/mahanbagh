"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApiResponse } from "@mohan-bagh/shared";

import AdminLayout from "../../components/admin/AdminLayout";
import {
  ENQUIRY_STATUS_COLORS,
  ENQUIRY_STATUS_LABELS,
  ENQUIRY_STATUS_OPTIONS,
} from "../../lib/constants";
import { api } from "../../lib/api";
import type {
  Enquiry,
  EnquiryAssignee,
} from "../../types/enquiry";
import type { EnquiryStatus } from "../../types/project";

interface CurrentUser {
  id: string;
  name: string;
  role: string;
}

interface EnquiryListResponse {
  items: Enquiry[];
  total: number;
  page: number;
  limit: number;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function EnquiriesPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EnquiryStatus | "ALL">("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [assignees, setAssignees] = useState<EnquiryAssignee[]>([]);
  const [includeHidden, setIncludeHidden] = useState(false);

  const isAdmin = user?.role === "ADMIN";

  const loadEnquiries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (isAdmin && assigneeFilter) params.set("assigneeId", assigneeFilter);
      if (includeHidden) params.set("includeHidden", "true");
      params.set("limit", "100");

      const { data } = await api.get<ApiResponse<EnquiryListResponse>>(
        `/enquiries?${params.toString()}`,
      );
      setEnquiries(data.data?.items ?? []);
      setTotal(data.data?.total ?? 0);
    } catch {
      setError("Unable to load enquiries.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, isAdmin, assigneeFilter, includeHidden]);

  useEffect(() => {
    api
      .get<ApiResponse<CurrentUser>>("/auth/me")
      .then(({ data }) => setUser(data.data ?? null))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    api
      .get<ApiResponse<EnquiryAssignee[]>>("/enquiries/assignees")
      .then(({ data }) => setAssignees(data.data ?? []))
      .catch(() => setAssignees([]));
  }, [isAdmin]);

  useEffect(() => {
    if (user) {
      void loadEnquiries();
    }
  }, [user, loadEnquiries]);

  async function updateStatus(enquiry: Enquiry, status: EnquiryStatus) {
    const previous = enquiry.status;
    setEnquiries((items) =>
      items.map((item) =>
        item.id === enquiry.id ? { ...item, status } : item,
      ),
    );
    try {
      await api.patch(`/enquiries/${enquiry.id}`, { status });
      setMessage(`Status updated to ${ENQUIRY_STATUS_LABELS[status]}.`);
    } catch {
      setEnquiries((items) =>
        items.map((item) =>
          item.id === enquiry.id ? { ...item, status: previous } : item,
        ),
      );
      setError("Unable to update the status.");
    }
  }

  const groupedAssignees = useMemo(() => {
    const groups: { role: string; label: string; items: EnquiryAssignee[] }[] =
      [];
    const roles: { role: string; label: string }[] = [
      { role: "EMPLOYEE", label: "Employees" },
      { role: "BROKER", label: "Brokers" },
    ];
    for (const { role, label } of roles) {
      const items = assignees.filter((item) => item.role === role);
      if (items.length) groups.push({ role, label, items });
    }
    return groups;
  }, [assignees]);

  const roleBadge = (role?: string) => {
    if (!role) return null;
    const color =
      role === "EMPLOYEE"
        ? "bg-blue-100 text-blue-700"
        : "bg-amber-100 text-amber-700";
    return (
      <span
        className={`ml-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${color}`}
      >
        {role === "EMPLOYEE" ? "EMP" : "BRK"}
      </span>
    );
  };

  return (
    <AdminLayout user={user}>
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-gray-500">Customer enquiries</p>
          <h1 className="mt-1 font-serif text-2xl font-semibold text-primary sm:text-3xl">
            Enquiries
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Track customer enquiries and manage their status.
            {includeHidden ? " Showing archived history." : ""}
          </p>
        </div>
        <Link
          href="/enquiries/create"
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
        >
          Add enquiry
        </Link>
      </header>

      {message && (
        <p className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <div className="mt-6 rounded-2xl border border-amber-900/20 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search customer name or phone"
            className="h-11 w-full rounded-lg border border-amber-900/20 bg-white px-3.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 lg:max-w-xs"
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as EnquiryStatus | "ALL")
            }
            className="h-11 rounded-lg border border-amber-900/20 bg-white px-3 text-sm outline-none focus:border-primary"
          >
            <option value="ALL">All statuses</option>
            {ENQUIRY_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {isAdmin && (
            <select
              value={assigneeFilter}
              onChange={(event) => setAssigneeFilter(event.target.value)}
              className="h-11 rounded-lg border border-amber-900/20 bg-white px-3 text-sm outline-none focus:border-primary"
            >
              <option value="">All assignees</option>
              {groupedAssignees.map((group) => (
                <optgroup key={group.role} label={group.label}>
                  {group.items.map((assignee) => (
                    <option key={assignee.id} value={assignee.id}>
                      {assignee.name}
                      {assignee.userCode ? ` (${assignee.userCode})` : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}

          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={includeHidden}
              onChange={(event) => setIncludeHidden(event.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Show history
          </label>
        </div>
      </div>

      <section className="mt-6 space-y-3">
        <p className="text-sm text-gray-500">
          {total} enquiry{total === 1 ? "" : "ies"}
        </p>

        {loading ? (
          <div className="rounded-2xl border border-amber-900/20 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
            Loading enquiries...
          </div>
        ) : enquiries.length === 0 ? (
          <div className="rounded-2xl border border-amber-900/20 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-gray-500">No enquiries found.</p>
            <Link
              href="/enquiries/create"
              className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
            >
              Add the first enquiry
            </Link>
          </div>
        ) : (
          enquiries.map((enquiry) => (
            <div
              key={enquiry.id}
              className={`rounded-2xl border border-amber-900/20 bg-white p-5 shadow-sm ${
                enquiry.hiddenAt ? "opacity-60" : ""
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-gray-900">
                      {enquiry.customerName}
                    </p>
                    {enquiry.hiddenAt && (
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-semibold text-gray-500">
                        Archived
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        ENQUIRY_STATUS_COLORS[enquiry.status]
                      }`}
                    >
                      {ENQUIRY_STATUS_LABELS[enquiry.status] ?? enquiry.status}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-gray-600">{enquiry.phone}</p>
                  {enquiry.email && (
                    <p className="mt-0.5 text-sm text-gray-500">
                      {enquiry.email}
                    </p>
                  )}
                  {enquiry.remarks && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">
                      {enquiry.remarks}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-start gap-1 text-xs text-gray-500 sm:items-end">
                  {enquiry.assignedTo && (
                    <span className="flex items-center">
                      Assigned to {enquiry.assignedTo.name}
                      {roleBadge(enquiry.assignedTo.role)}
                    </span>
                  )}
                  {enquiry.createdBy && (
                    <span className="flex items-center">
                      Added by {enquiry.createdBy.name}
                      {roleBadge(enquiry.createdBy.role)}
                    </span>
                  )}
                  <span>Added {formatDate(enquiry.createdAt)}</span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <select
                  value={enquiry.status}
                  onChange={(event) =>
                    void updateStatus(
                      enquiry,
                      event.target.value as EnquiryStatus,
                    )
                  }
                  disabled={Boolean(enquiry.hiddenAt)}
                  className="h-9 rounded-lg border border-amber-900/20 bg-white px-2 text-xs outline-none focus:border-primary disabled:opacity-50"
                >
                  {ENQUIRY_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))
        )}
      </section>
    </AdminLayout>
  );
}