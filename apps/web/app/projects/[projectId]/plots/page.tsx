"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ApiResponse } from "@mohan-bagh/shared";

import AdminLayout from "../../../../components/admin/AdminLayout";
import { api } from "../../../../lib/api";
import {
  ENQUIRY_STATUS_COLORS,
  ENQUIRY_STATUS_OPTIONS,
  PLOT_STATUS_COLORS,
  PLOT_STATUS_OPTIONS,
} from "../../../../lib/constants";
import type { Plot, PlotStatus } from "../../../../types/plot";
import type {
  EnquiryStatus,
  PlotEnquiry,
  Project,
} from "../../../../types/project";

interface CurrentUser {
  id: string;
  name: string;
  role: string;
  userCode: string | null;
}

interface EnquiryForm {
  customerName: string;
  phone: string;
  email: string;
  message: string;
}

const emptyEnquiry: EnquiryForm = {
  customerName: "",
  phone: "",
  email: "",
  message: "",
};

export default function ProjectPlotsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [enquiries, setEnquiries] = useState<PlotEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PlotStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [activePlot, setActivePlot] = useState<Plot | null>(null);

  useEffect(() => {
    api
      .get<ApiResponse<CurrentUser>>("/auth/me")
      .then(({ data }) => setUser(data.data ?? null))
      .catch(() => setUser(null));
  }, []);

  const loadProject = useCallback(async () => {
    if (!projectId) return;
    const { data } = await api.get<ApiResponse<Project>>(
      `/admin/projects/${projectId}`,
    );
    setProject(data.data ?? null);
    setPlots(data.data?.plots ?? []);
  }, [projectId]);

  const loadEnquiries = useCallback(async () => {
    if (!projectId) return;
    const { data } = await api.get<ApiResponse<{ items: PlotEnquiry[] }>>(
      `/admin/projects/${projectId}/enquiries`,
    );
    setEnquiries(data.data?.items ?? []);
  }, [projectId]);

  const load = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      await Promise.all([loadProject(), loadEnquiries()]);
    } catch {
      setError("Unable to load this project's plots.");
    } finally {
      setLoading(false);
    }
  }, [projectId, loadProject, loadEnquiries]);

  useEffect(() => {
    void load();
  }, [load]);

  const enquiryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const enquiry of enquiries) {
      if (!enquiry.plotId) continue;
      counts.set(enquiry.plotId, (counts.get(enquiry.plotId) ?? 0) + 1);
    }
    return counts;
  }, [enquiries]);

  const filteredPlots = useMemo(() => {
    const term = search.trim().toLowerCase();
    return plots.filter((plot) => {
      if (statusFilter !== "ALL" && plot.status !== statusFilter) return false;
      if (term && !plot.plotNo.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [plots, statusFilter, search]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const plot of plots) {
      counts[plot.status] = (counts[plot.status] ?? 0) + 1;
    }
    return counts;
  }, [plots]);

  async function updatePlotStatus(plot: Plot, status: PlotStatus) {
    if (!projectId) return;
    const previous = plot.status;
    setPlots((items) =>
      items.map((item) => (item.id === plot.id ? { ...item, status } : item)),
    );
    try {
      await api.patch(`/admin/projects/${projectId}/plots/${plot.id}`, {
        status,
      });
    } catch {
      setPlots((items) =>
        items.map((item) =>
          item.id === plot.id ? { ...item, status: previous } : item,
        ),
      );
      setError("Unable to update the plot status.");
    }
  }

  async function createEnquiry(plot: Plot, form: EnquiryForm) {
    if (!projectId) return;
    const { data } = await api.post<ApiResponse<PlotEnquiry>>(
      `/admin/projects/${projectId}/plots/${plot.id}/enquiries`,
      form,
    );
    if (data.data) {
      setEnquiries((items) => [data.data as PlotEnquiry, ...items]);
    }
    setMessage(`Enquiry added for plot ${plot.plotNo}.`);
  }

  async function updateEnquiry(
    enquiryId: string,
    updates: Partial<PlotEnquiry>,
  ) {
    if (!projectId) return;
    const { data } = await api.patch<ApiResponse<PlotEnquiry>>(
      `/admin/projects/${projectId}/enquiries/${enquiryId}`,
      updates,
    );
    if (data.data) {
      setEnquiries((items) =>
        items.map((item) => (item.id === enquiryId ? data.data! : item)),
      );
    }
  }

  async function deleteEnquiry(enquiryId: string) {
    if (!projectId) return;
    if (!window.confirm("Delete this enquiry?")) return;
    await api.delete(`/admin/projects/${projectId}/enquiries/${enquiryId}`);
    setEnquiries((items) => items.filter((item) => item.id !== enquiryId));
  }

  return (
    <AdminLayout user={user}>
      <section>
        <p className="text-sm text-gray-500">Project plots</p>
        <div className="mt-1 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="mt-1 font-serif text-2xl font-semibold text-primary sm:text-3xl">
              {project?.name || "Project"} — Plots
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Manage plot status and track enquiries for each plot.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/projects"
              className="rounded-lg border border-amber-900/15 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-amber-50"
            >
              Back
            </Link>
            <Link
              href={`/projects/${projectId}`}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
            >
              Open editor
            </Link>
          </div>
        </div>
      </section>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {message && (
        <p className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </p>
      )}

      {loading ? (
        <p className="mt-10 text-center text-sm text-gray-500">Loading...</p>
      ) : plots.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-amber-900/20 bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-gray-500">
            No plots have been drawn for this project yet.
          </p>
          <Link
            href={`/projects/${projectId}`}
            className="mt-4 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
          >
            Open the plot editor
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <SummaryCard label="Total plots" value={plots.length} tone="primary" />
            {PLOT_STATUS_OPTIONS.map((option) => (
              <SummaryCard
                key={option.value}
                label={option.label}
                value={statusCounts[option.value] ?? 0}
                color={PLOT_STATUS_COLORS[option.value]}
              />
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-amber-900/20 border-t-4 border-t-amber-600 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-amber-900/10 p-5 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-serif text-xl font-semibold text-primary">
                Plot list
              </h2>
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search plot no."
                  className="h-10 rounded-lg border border-amber-900/20 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as PlotStatus | "ALL")
                  }
                  className="h-10 rounded-lg border border-amber-900/20 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                >
                  <option value="ALL">All statuses</option>
                  {PLOT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-amber-50/60 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Plot no.</th>
                    <th className="px-5 py-3 font-semibold">Type</th>
                    <th className="px-5 py-3 font-semibold">Area (sqft)</th>
                    <th className="px-5 py-3 font-semibold">Facing</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Enquiries</th>
                    <th className="px-5 py-3 font-semibold text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlots.map((plot) => (
                    <tr
                      key={plot.id}
                      className="border-t border-amber-900/5 hover:bg-amber-50/40"
                    >
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {plot.plotNo}
                      </td>
                      <td className="px-5 py-3 text-gray-600">{plot.plotType}</td>
                      <td className="px-5 py-3 text-gray-600">
                        {plot.areaSqft ? Math.round(plot.areaSqft) : "—"}
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        {plot.facing || "—"}
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={plot.status}
                          onChange={(event) =>
                            void updatePlotStatus(
                              plot,
                              event.target.value as PlotStatus,
                            )
                          }
                          className="h-9 rounded-lg border border-amber-900/20 bg-white px-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                          style={{
                            borderLeftWidth: 4,
                            borderLeftColor: PLOT_STATUS_COLORS[plot.status],
                          }}
                        >
                          {PLOT_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-amber-100 px-2 text-xs font-semibold text-primary">
                          {enquiryCounts.get(plot.id) ?? 0}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setMessage(null);
                            setActivePlot(plot);
                          }}
                          className="rounded-lg border border-amber-900/20 bg-white px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-amber-50"
                        >
                          Enquiries
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredPlots.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-8 text-center text-sm text-gray-500"
                      >
                        No plots match the current filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activePlot && (
        <PlotEnquiryDrawer
          plot={activePlot}
          enquiries={enquiries.filter(
            (enquiry) => enquiry.plotId === activePlot.id,
          )}
          onClose={() => setActivePlot(null)}
          onCreate={(form) => createEnquiry(activePlot, form)}
          onUpdate={updateEnquiry}
          onDelete={deleteEnquiry}
        />
      )}
    </AdminLayout>
  );
}

function SummaryCard({
  label,
  value,
  color,
  tone,
}: {
  label: string;
  value: number;
  color?: string;
  tone?: "primary";
}) {
  return (
    <div className="rounded-xl border border-amber-900/15 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        {color && (
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {label}
        </span>
      </div>
      <p
        className={`mt-2 font-serif text-2xl font-semibold ${
          tone === "primary" ? "text-primary" : "text-gray-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function PlotEnquiryDrawer({
  plot,
  enquiries,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: {
  plot: Plot;
  enquiries: PlotEnquiry[];
  onClose: () => void;
  onCreate: (form: EnquiryForm) => Promise<void>;
  onUpdate: (id: string, updates: Partial<PlotEnquiry>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [form, setForm] = useState<EnquiryForm>(emptyEnquiry);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EnquiryForm>(emptyEnquiry);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!form.customerName.trim()) {
      setError("Customer name is required.");
      return;
    }
    if (form.phone.replace(/\D/g, "").length < 10) {
      setError("Enter a valid phone number.");
      return;
    }
    try {
      setSaving(true);
      await onCreate(form);
      setForm(emptyEnquiry);
    } catch {
      setError("Unable to add the enquiry.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(enquiry: PlotEnquiry) {
    setEditingId(enquiry.id);
    setEditForm({
      customerName: enquiry.customerName,
      phone: enquiry.phone,
      email: enquiry.email ?? "",
      message: enquiry.message ?? "",
    });
  }

  async function saveEdit(enquiryId: string) {
    await onUpdate(enquiryId, {
      customerName: editForm.customerName,
      phone: editForm.phone,
      email: editForm.email || undefined,
      message: editForm.message || undefined,
    });
    setEditingId(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-gray-950/40">
      <div
        className="flex-1"
        onClick={onClose}
        aria-hidden="true"
        role="presentation"
      />
      <aside className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-primary">
              Plot {plot.plotNo}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {enquiries.length} enquiry(ies)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg border border-amber-900/20 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-amber-50"
          >
            Close
          </button>
        </div>

        <form
          onSubmit={submit}
          className="mt-5 rounded-xl border border-amber-900/15 bg-amber-50/40 p-4"
        >
          <h3 className="text-sm font-semibold text-gray-800">Add enquiry</h3>
          <div className="mt-3 space-y-2">
            <input
              placeholder="Customer name"
              value={form.customerName}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  customerName: event.target.value,
                }))
              }
              className="h-11 w-full rounded-lg border border-amber-900/20 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
            <input
              placeholder="Phone"
              inputMode="numeric"
              value={form.phone}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  phone: event.target.value.replace(/\D/g, ""),
                }))
              }
              className="h-11 w-full rounded-lg border border-amber-900/20 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
            <input
              placeholder="Email (optional)"
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              className="h-11 w-full rounded-lg border border-amber-900/20 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
            <textarea
              placeholder="Message (optional)"
              rows={2}
              value={form.message}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  message: event.target.value,
                }))
              }
              className="w-full resize-y rounded-lg border border-amber-900/20 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>
          {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="mt-3 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Add enquiry"}
          </button>
        </form>

        <div className="mt-5 space-y-3">
          {enquiries.length === 0 && (
            <p className="text-sm text-gray-500">No enquiries yet.</p>
          )}
          {enquiries.map((enquiry) => (
            <div
              key={enquiry.id}
              className="rounded-xl border border-amber-900/15 bg-white p-4 shadow-sm"
            >
              {editingId === enquiry.id ? (
                <div className="space-y-2">
                  <input
                    value={editForm.customerName}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        customerName: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-lg border border-amber-900/20 px-3 text-sm outline-none focus:border-primary"
                  />
                  <input
                    value={editForm.phone}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        phone: event.target.value.replace(/\D/g, ""),
                      }))
                    }
                    className="h-10 w-full rounded-lg border border-amber-900/20 px-3 text-sm outline-none focus:border-primary"
                  />
                  <input
                    value={editForm.email}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    className="h-10 w-full rounded-lg border border-amber-900/20 px-3 text-sm outline-none focus:border-primary"
                  />
                  <textarea
                    rows={2}
                    value={editForm.message}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        message: event.target.value,
                      }))
                    }
                    className="w-full resize-y rounded-lg border border-amber-900/20 px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-lg border border-amber-900/20 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-amber-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveEdit(enquiry.id)}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {enquiry.customerName}
                      </p>
                      <p className="text-sm text-gray-600">{enquiry.phone}</p>
                      {enquiry.email && (
                        <p className="text-sm text-gray-500">{enquiry.email}</p>
                      )}
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        ENQUIRY_STATUS_COLORS[enquiry.status]
                      }`}
                    >
                      {ENQUIRY_STATUS_OPTIONS.find(
                        (option) => option.value === enquiry.status,
                      )?.label ?? enquiry.status}
                    </span>
                  </div>
                  {enquiry.message && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">
                      {enquiry.message}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <select
                      value={enquiry.status}
                      onChange={(event) =>
                        void onUpdate(enquiry.id, {
                          status: event.target.value as EnquiryStatus,
                        })
                      }
                      className="h-9 rounded-lg border border-amber-900/20 bg-white px-2 text-xs outline-none focus:border-primary"
                    >
                      {ENQUIRY_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => startEdit(enquiry)}
                      className="rounded-lg border border-amber-900/20 px-3 py-1.5 text-xs font-medium text-primary hover:bg-amber-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDelete(enquiry.id)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
