"use client";

import { useEffect, useMemo, useState } from "react";
import type { ApiResponse } from "@mohan-bagh/shared";
import { api } from "../../lib/api";
import AdminLayout from "../../components/admin/AdminLayout";
import TeamMemberEditModal, {
  emptyTeamEditForm,
  type TeamEditFiles,
  type TeamEditForm,
  type TeamEditHints,
  type TeamEditKind,
} from "../../components/admin/TeamMemberEditModal";
import TeamMemberViewModal, {
  type TeamMemberDetail,
} from "../../components/admin/TeamMemberViewModal";
import { useRouter } from "next/navigation";

interface CurrentUser {
  id: string;
  name: string;
  role: string;
  userCode: string | null;
}

interface BrokerRow {
  id: string;
  name: string;
  user_code: string | null;
  email: string | null;
  mobile: string | null;
  status: "ACTIVE" | "INACTIVE";
  created_at: string;
  firm_name?: string | null;
  brokerCount?: number;
  parentBroker?: {
    name: string;
    userCode: string | null;
  } | null;
}

interface EmployeeRow {
  id: string;
  name: string;
  user_code: string | null;
  email: string | null;
  mobile: string | null;
  role: string;
  status: "ACTIVE" | "INACTIVE";
  created_at: string;
  employee_profiles?: {
    designation: string | null;
  } | null;
}

interface DirectoryUser {
  id: string;
  name: string;
  user_code: string | null;
  email: string | null;
  mobile: string | null;
  status: "ACTIVE" | "INACTIVE";
  created_at: string;
  brokerCount?: number;
  parentBroker?: {
    name: string;
    userCode: string | null;
  } | null;
  employee_profiles?: {
    designation: string | null;
  } | null;
}

interface DirectoryResponse<T> {
  items: T[];
  pagination: {
    total: number;
  };
}

type StatusList = "brokers" | "employees";

function StatusToggle({
  status,
  busy,
  onToggle,
}: {
  status: "ACTIVE" | "INACTIVE";
  busy: boolean;
  onToggle: () => void;
}) {
  const active = status === "ACTIVE";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={busy}
      onClick={onToggle}
      title={active ? "Deactivate" : "Activate"}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
        active
          ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
          : "border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      <span
        className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition ${
          active ? "bg-green-500" : "bg-gray-400"
        }`}
      >
        <span
          className={`inline-block h-3 w-3 rounded-full bg-white transition ${
            active ? "translate-x-3.5" : "translate-x-0.5"
          }`}
        />
      </span>
      {busy ? "Saving..." : active ? "Active" : "Inactive"}
    </button>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {initials}
    </span>
  );
}

export default function TeamPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"brokers" | "employees">(
    "brokers",
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "INACTIVE"
  >("ALL");

  const [brokers, setBrokers] = useState<BrokerRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedBroker, setSelectedBroker] = useState<BrokerRow | null>(null);
  const [downlineBrokers, setDownlineBrokers] = useState<BrokerRow[]>([]);
  const [downlineLoading, setDownlineLoading] = useState(false);
  const [downlineError, setDownlineError] = useState<string | null>(null);

  const [referralUrl, setReferralUrl] = useState<string | null>(null);
  const [referralGenerating, setReferralGenerating] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [referralCopied, setReferralCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  const [statusBusy, setStatusBusy] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<{
    list: StatusList;
    id: string;
    title: string;
    kind: TeamEditKind;
    fromView?: boolean;
  } | null>(null);
  const [editValues, setEditValues] = useState<TeamEditForm | null>(null);
  const [editHints, setEditHints] = useState<TeamEditHints>({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [viewTarget, setViewTarget] = useState<{
    list: StatusList;
    id: string;
  } | null>(null);
  const [viewDetail, setViewDetail] = useState<TeamMemberDetail | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);

  const isAdmin = user?.role === "ADMIN";
  const isEmployee = user?.role === "EMPLOYEE";
  const isBrokerUser = user?.role === "BROKER";

  useEffect(() => {
    api
      .get<ApiResponse<CurrentUser>>("/auth/me")
      .then(({ data }) => setUser(data.data ?? null))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function loadDirectories() {
      if (!user) return;
      try {
        setLoading(true);
        setLoadError(null);

        let brokersData: DirectoryUser[] = [];
        let employeesData: DirectoryUser[] = [];

        if (isBrokerUser) {
          const response = await api.get<
            ApiResponse<DirectoryResponse<DirectoryUser>>
          >("/broker/downline", { params: { limit: 100 } });
          brokersData = response.data.data?.items ?? [];
        } else if (isEmployee) {
          const response = await api.get<
            ApiResponse<DirectoryResponse<DirectoryUser>>
          >("/employee/downline", { params: { limit: 100 } });
          brokersData = response.data.data?.items ?? [];
        } else {
          const [brokerResponse, employeeResponse] = await Promise.all([
            api.get<ApiResponse<DirectoryResponse<DirectoryUser>>>(
              "/admin/directory/brokers",
              { params: { limit: 100 } },
            ),
            api.get<ApiResponse<DirectoryResponse<DirectoryUser>>>(
              "/admin/directory/employees",
              { params: { limit: 100 } },
            ),
          ]);
          brokersData = brokerResponse.data.data?.items ?? [];
          employeesData = employeeResponse.data.data?.items ?? [];
        }

        if (!isCurrent) return;

        setBrokers(
          brokersData.map((broker) => ({
            id: broker.id,
            name: broker.name,
            user_code: broker.user_code,
            email: broker.email,
            mobile: broker.mobile,
            status: broker.status,
            created_at: broker.created_at,
            brokerCount: broker.brokerCount ?? 0,
            parentBroker: broker.parentBroker ?? null,
          })),
        );
        setEmployees(
          employeesData.map((employee) => ({
            id: employee.id,
            name: employee.name,
            user_code: employee.user_code,
            email: employee.email,
            mobile: employee.mobile,
            role: employee.employee_profiles?.designation ?? "-",
            status: employee.status,
            created_at: employee.created_at,
          })),
        );
      } catch {
        if (isCurrent) {
          setLoadError("Unable to load team members. Please refresh the page.");
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    }

    void loadDirectories();
    return () => {
      isCurrent = false;
    };
  }, [user, isBrokerUser, isEmployee, isAdmin]);

  const canShareReferral = user?.role === "EMPLOYEE" || user?.role === "BROKER";

  async function generateReferralLink() {
    try {
      setReferralGenerating(true);
      setReferralError(null);
      const { data } = await api.post<ApiResponse<{ token: string }>>(
        user?.role === "EMPLOYEE"
          ? "/employee/referrals"
          : "/broker/referrals",
      );
      const token = data.data?.token;
      if (!token) throw new Error("Missing referral token");
      setReferralUrl(`${window.location.origin}/register/${token}`);
      setReferralCopied(false);
    } catch {
      setReferralError("Unable to create the referral link. Please try again.");
    } finally {
      setReferralGenerating(false);
    }
  }

  async function copyReferralLink() {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setReferralCopied(true);
      setReferralError(null);
      window.setTimeout(() => setReferralCopied(false), 2000);
    } catch {
      setReferralError("Unable to copy. Select the link and copy it manually.");
    }
  }

  async function shareReferralLink() {
    if (!referralUrl) return;
    try {
      await navigator.share({
        title: "Register on Mohan Bagh",
        text: "Use this link to complete your registration on Mohan Bagh.",
        url: referralUrl,
      });
    } catch {
      // User dismissed the share sheet; ignore.
    }
  }

  function memberEndpoint(list: StatusList, id: string) {
    if (list === "employees") return `/admin/employees/${id}`;
    if (user?.role === "BROKER") return `/broker/downline/${id}`;
    if (user?.role === "EMPLOYEE") return `/employee/brokers/${id}`;
    return `/admin/brokers/${id}`;
  }

  function statusEndpoint(list: StatusList, id: string) {
    return `${memberEndpoint(list, id)}/status`;
  }

  function apiErrorMessage(error: unknown, fallback: string) {
    const message = (
      error as { response?: { data?: { message?: string } } }
    )?.response?.data?.message;
    return message || fallback;
  }

  async function toggleStatus(
    list: StatusList,
    id: string,
    current: "ACTIVE" | "INACTIVE",
  ) {
    const key = `${list}:${id}`;
    const next = current === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    setStatusBusy(key);
    setStatusError(null);

    try {
      const { data } = await api.patch<
        ApiResponse<{ id: string; status: "ACTIVE" | "INACTIVE" }>
      >(statusEndpoint(list, id), { status: next });
      const updated = data.data?.status ?? next;

      setBrokers((items) =>
        items.map((item) =>
          item.id === id ? { ...item, status: updated } : item,
        ),
      );
      setDownlineBrokers((items) =>
        items.map((item) =>
          item.id === id ? { ...item, status: updated } : item,
        ),
      );
      if (list === "employees") {
        setEmployees((items) =>
          items.map((item) =>
            item.id === id ? { ...item, status: updated } : item,
          ),
        );
      }
    } catch (error) {
      setStatusError(apiErrorMessage(error, "Unable to update the status."));
    } finally {
      setStatusBusy(null);
    }
  }

  function documentBase() {
    if (user?.role === "EMPLOYEE") return "/employee";
    if (user?.role === "BROKER") return "/broker";
    return "/admin";
  }

  function documentUrl(id: string, type: "PAN" | "AADHAAR") {
    return `/api/v1${documentBase()}/users/${id}/documents/${type}`;
  }

  function closeView() {
    setViewTarget(null);
    setViewDetail(null);
    setViewError(null);
  }

  async function openView(list: StatusList, id: string) {
    setViewTarget({ list, id });
    setViewDetail(null);
    setViewError(null);

    try {
      const { data } = await api.get<ApiResponse<TeamMemberDetail>>(
        memberEndpoint(list, id),
      );
      const detail = data.data;
      if (!detail || !detail.name) throw new Error("Missing profile");
      setViewDetail(detail);
    } catch (error) {
      setViewError(apiErrorMessage(error, "Unable to load this profile."));
    }
  }

  function editFormFromDetail(detail: TeamMemberDetail): TeamEditForm {
    return {
      ...emptyTeamEditForm,
      name: detail.name,
      email: detail.email ?? "",
      mobile: detail.mobile ?? "",
      address: detail.address ?? "",
      city: detail.city ?? "",
      designation: detail.designation ?? "",
      firmName: detail.firmName ?? "",
      reraNumber: detail.reraNumber ?? "",
      bankHolderName: detail.bankHolderName ?? "",
      bankName: detail.bankName ?? "",
      bankIfsc: detail.bankIfsc ?? "",
      bankAccount: "",
      pan: "",
      aadhaar: "",
    };
  }

  function editHintsFromDetail(detail: TeamMemberDetail): TeamEditHints {
    return {
      bankAccountMasked: detail.bankAccountMasked,
      panMasked: detail.panMasked,
      aadhaarMasked: detail.aadhaarMasked,
    };
  }

  function startEditFromView() {
    if (!viewTarget || !viewDetail) return;

    setEditTarget({
      list: viewTarget.list,
      id: viewTarget.id,
      title: `Edit ${viewDetail.name}`,
      kind: kindOfList(viewTarget.list),
      fromView: true,
    });
    setEditValues(editFormFromDetail(viewDetail));
    setEditHints(editHintsFromDetail(viewDetail));
    setEditError(null);
    closeView();
  }

  function kindOfList(list: StatusList): TeamEditKind {
    return list === "employees" ? "employee" : "broker";
  }

  function closeEdit() {
    setEditTarget(null);
    setEditValues(null);
    setEditHints({});
    setEditError(null);
  }

  async function openEdit(list: StatusList, id: string, title: string) {
    setEditTarget({ list, id, title, kind: kindOfList(list) });
    setEditValues(null);
    setEditHints({});
    setEditError(null);

    try {
      const { data } = await api.get<ApiResponse<TeamMemberDetail>>(
        memberEndpoint(list, id),
      );
      const detail = data.data;
      if (!detail || !detail.name) throw new Error("Missing profile");
      setEditValues(editFormFromDetail(detail));
      setEditHints(editHintsFromDetail(detail));
    } catch (error) {
      setEditError(
        apiErrorMessage(error, "Unable to load this profile for editing."),
      );
    }
  }

  async function saveEdit(values: TeamEditForm, files: TeamEditFiles) {
    if (!editTarget) return;

    setEditSaving(true);
    setEditError(null);

    try {
      const endpoint = memberEndpoint(editTarget.list, editTarget.id);
      const hasFiles = !!files.panDocument || !!files.aadhaarDocument;
      const payload = hasFiles
        ? (() => {
            const body = new FormData();
            Object.entries(values).forEach(([key, value]) =>
              body.append(key, value ?? ""),
            );
            if (files.panDocument) body.append("panDocument", files.panDocument);
            if (files.aadhaarDocument)
              body.append("aadhaarDocument", files.aadhaarDocument);
            return body;
          })()
        : values;

      const { data } = await api.patch<ApiResponse<TeamMemberDetail>>(
        endpoint,
        payload,
      );
      const updated = data.data ?? null;
      const saved = {
        name: updated?.name ?? values.name,
        email: updated?.email ?? values.email,
        mobile: updated?.mobile ?? values.mobile,
        designation: updated?.designation ?? values.designation,
        firmName: updated?.firmName ?? values.firmName,
      };
      const id = editTarget.id;

      setBrokers((items) =>
        items.map((item) =>
          item.id === id
            ? {
                ...item,
                name: saved.name,
                email: saved.email || null,
                mobile: saved.mobile,
                firm_name: saved.firmName || null,
              }
            : item,
        ),
      );
      setDownlineBrokers((items) =>
        items.map((item) =>
          item.id === id
            ? {
                ...item,
                name: saved.name,
                email: saved.email || null,
                mobile: saved.mobile,
                firm_name: saved.firmName || null,
              }
            : item,
        ),
      );
      if (editTarget.list === "employees") {
        setEmployees((items) =>
          items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  name: saved.name,
                  email: saved.email || null,
                  mobile: saved.mobile,
                  role: saved.designation || item.role,
                }
              : item,
          ),
        );
      }

      const { list, fromView } = editTarget;
      closeEdit();
      if (fromView) void openView(list, id);
    } catch (error) {
      setEditError(apiErrorMessage(error, "Unable to save the changes."));
    } finally {
      setEditSaving(false);
    }
  }

  async function showDownline(broker: BrokerRow) {
    try {
      setSelectedBroker(broker);
      setDownlineBrokers([]);
      setDownlineError(null);
      setDownlineLoading(true);
      const endpoint =
        user?.role === "BROKER"
          ? `/broker/downline/${broker.id}/downline`
          : user?.role === "EMPLOYEE"
            ? `/employee/brokers/${broker.id}/downline`
            : `/admin/brokers/${broker.id}/downline`;
      const { data } = await api.get<
        ApiResponse<DirectoryResponse<DirectoryUser>>
      >(endpoint, { params: { limit: 100 } });
      setDownlineBrokers(
        (data.data?.items ?? []).map((item) => ({
          id: item.id,
          name: item.name,
          user_code: item.user_code,
          email: item.email,
          mobile: item.mobile,
          status: item.status,
          created_at: item.created_at,
          brokerCount: item.brokerCount ?? 0,
          parentBroker: item.parentBroker ?? null,
        })),
      );
    } catch {
      setDownlineError("Unable to load this broker’s downline.");
    } finally {
      setDownlineLoading(false);
    }
  }

  const filteredBrokers = useMemo(() => {
    const query = search.toLowerCase().trim();

    return brokers.filter((broker) => {
      const matchesSearch =
        !query ||
        broker.name.toLowerCase().includes(query) ||
        broker.user_code?.toLowerCase().includes(query) ||
        broker.email?.toLowerCase().includes(query) ||
        broker.mobile?.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "ALL" || broker.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [brokers, search, statusFilter]);

  const filteredEmployees = useMemo(() => {
    const query = search.toLowerCase().trim();

    return employees.filter((employee) => {
      const matchesSearch =
        !query ||
        employee.name.toLowerCase().includes(query) ||
        employee.user_code?.toLowerCase().includes(query) ||
        employee.email?.toLowerCase().includes(query) ||
        employee.mobile?.toLowerCase().includes(query) ||
        employee.role.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "ALL" || employee.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [employees, search, statusFilter]);

  const brokerActiveCount = brokers.filter(
    (item) => item.status === "ACTIVE",
  ).length;
  const employeeActiveCount = employees.filter(
    (item) => item.status === "ACTIVE",
  ).length;

  function changeTab(tab: "brokers" | "employees") {
    setActiveTab(tab);
    setSearch("");
    setStatusFilter("ALL");
  }

  function addLabel() {
    if (isAdmin && activeTab === "employees") return "Add Employee";
    return "Add Broker";
  }

  function goCreate() {
    if (isAdmin && activeTab === "employees") {
      router.push("/team/create?role=employee");
    } else {
      router.push("/team/create?role=broker");
    }
  }

  const introCopy = isAdmin
    ? "Manage brokers and employees from one place."
    : isEmployee
      ? "Manage the brokers registered under you."
      : "Manage the brokers in your downline.";

  return (
    <AdminLayout user={user}>
      {/* Page intro */}
      <section>
        <p className="text-sm text-gray-500">Team management</p>

        <div className="mt-1 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-primary sm:text-3xl">
              People & Network
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
              {introCopy}
            </p>
          </div>

          <button
            type="button"
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
            onClick={goCreate}
          >
            + {addLabel()}
          </button>
        </div>
      </section>

      {/* Referral link */}
      {canShareReferral && (
        <section className="mt-6 rounded-xl border border-amber-900/10 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Share referral link
              </p>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
                {isEmployee
                  ? "Share this link so new brokers can register under you."
                  : "Share this link so new brokers can join your downline."}
              </p>
            </div>

            <button
              type="button"
              className="shrink-0 rounded-lg border border-amber-900/15 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={referralGenerating}
              onClick={() => void generateReferralLink()}
            >
              {referralGenerating
                ? "Generating..."
                : referralUrl
                  ? "Generate new link"
                  : "Generate referral link"}
            </button>
          </div>

          {referralUrl && (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                readOnly
                value={referralUrl}
                aria-label="Referral link"
                onFocus={(event) => event.target.select()}
                className="w-full rounded-lg border border-amber-900/15 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 outline-none"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
                  onClick={() => void copyReferralLink()}
                >
                  {referralCopied ? "Copied!" : "Copy link"}
                </button>

                {canNativeShare && (
                  <button
                    type="button"
                    className="rounded-lg border border-amber-900/15 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-amber-50"
                    onClick={() => void shareReferralLink()}
                  >
                    Share
                  </button>
                )}
              </div>
            </div>
          )}

          {referralError && (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {referralError}
            </p>
          )}

          <p className="mt-3 text-xs text-gray-400">
            Generating a new link invalidates the previous one. Links expire
            after 7 days.
          </p>
        </section>
      )}

      {/* Summary cards */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-amber-900/10 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            {isBrokerUser ? "Downline Brokers" : "Brokers"}
          </p>

          <p className="mt-3 font-serif text-3xl font-semibold text-primary">
            {brokers.length}
          </p>

          <p className="mt-2 text-xs text-gray-500">
            {brokerActiveCount} currently active
          </p>
        </article>

        {isAdmin && (
          <article className="rounded-xl border border-amber-900/10 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">Employees</p>

            <p className="mt-3 font-serif text-3xl font-semibold text-primary">
              {employees.length}
            </p>

            <p className="mt-2 text-xs text-gray-500">
              {employeeActiveCount} currently active
            </p>
          </article>
        )}
      </section>

      {/* Main table */}
      <section className="mt-6 overflow-hidden rounded-xl border border-amber-900/10 bg-white shadow-sm">
        {/* Tabs */}
        {isAdmin && (
          <div className="border-b border-amber-900/10 px-5 pt-4 sm:px-6">
            <div className="flex gap-6">
              <button
                type="button"
                onClick={() => changeTab("brokers")}
                className={`relative pb-4 text-sm font-medium transition ${
                  activeTab === "brokers"
                    ? "text-primary"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Brokers
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                  {brokers.length}
                </span>
                {activeTab === "brokers" && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />
                )}
              </button>

              <button
                type="button"
                onClick={() => changeTab("employees")}
                className={`relative pb-4 text-sm font-medium transition ${
                  activeTab === "employees"
                    ? "text-primary"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Employees
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                  {employees.length}
                </span>
                {activeTab === "employees" && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-3 border-b border-amber-900/10 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="relative w-full sm:max-w-md">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                isAdmin && activeTab === "employees"
                  ? "Search employees..."
                  : "Search brokers..."
              }
              className="w-full rounded-lg border border-amber-900/15 bg-white px-4 py-2.5 text-sm outline-none transition placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as "ALL" | "ACTIVE" | "INACTIVE",
              )
            }
            className="rounded-lg border border-amber-900/15 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-primary"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        {loadError && (
          <p
            role="alert"
            className="mx-5 mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-6"
          >
            {loadError}
          </p>
        )}

        {statusError && (
          <p
            role="alert"
            className="mx-5 mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-6"
          >
            {statusError}
          </p>
        )}

        {selectedBroker && (
          <section className="m-5 overflow-hidden rounded-lg border border-amber-900/15 sm:m-6">
            <div className="flex items-center justify-between gap-4 bg-amber-50/50 px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  {selectedBroker.name}&apos;s downline brokers
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  {selectedBroker.user_code ?? "No broker code"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBroker(null)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-white"
              >
                Close
              </button>
            </div>

            {downlineLoading ? (
              <p className="px-5 py-8 text-center text-sm text-gray-500">
                Loading brokers...
              </p>
            ) : downlineError ? (
              <p role="alert" className="px-5 py-5 text-sm text-red-700">
                {downlineError}
              </p>
            ) : downlineBrokers.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-500">
                No brokers under this broker yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left">
                  <thead className="border-y border-amber-900/10 bg-white">
                    <tr>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Broker
                      </th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Code
                      </th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Contact
                      </th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Parent
                      </th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Downline
                      </th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Status
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-900/10">
                    {downlineBrokers.map((broker) => (
                      <tr key={broker.id}>
                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-gray-900">
                            {broker.name}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {broker.email ?? "No email"}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-sm font-medium text-primary">
                          {broker.user_code ?? "-"}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-700">
                          {broker.mobile ?? "-"}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-700">
                          {broker.parentBroker ? (
                            <>
                              <p>{broker.parentBroker.name}</p>
                              <p className="text-xs text-gray-500">
                                {broker.parentBroker.userCode ?? "-"}
                              </p>
                            </>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-gray-900">
                          {broker.brokerCount ?? 0}
                        </td>
                        <td className="px-5 py-4">
                          <StatusToggle
                            status={broker.status}
                            busy={statusBusy === `brokers:${broker.id}`}
                            onToggle={() =>
                              void toggleStatus(
                                "brokers",
                                broker.id,
                                broker.status,
                              )
                            }
                          />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            className="rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5"
                            onClick={() => void openView("brokers", broker.id)}
                          >
                            View
                          </button>

                          <button
                            type="button"
                            className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                            onClick={() =>
                              void openEdit(
                                "brokers",
                                broker.id,
                                `Edit ${broker.name}`,
                              )
                            }
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5"
                            onClick={() => void showDownline(broker)}
                          >
                            View Downline ({broker.brokerCount ?? 0})
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Employees table */}
        {isAdmin && activeTab === "employees" && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left">
              <thead className="bg-amber-50/50">
                <tr className="border-b border-amber-900/10">
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Code
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Designation
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-amber-900/10">
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-sm text-gray-500"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <p className="text-sm font-medium text-gray-700">
                        No employees found
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        Try changing your search or filters.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((employee) => (
                    <tr
                      key={employee.id}
                      className="transition hover:bg-amber-50/30"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={employee.name} />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {employee.name}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500">
                              {employee.email || "No email"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-primary">
                          {employee.user_code || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {employee.mobile || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {employee.role}
                      </td>
                      <td className="px-6 py-4">
                        <StatusToggle
                          status={employee.status}
                          busy={statusBusy === `employees:${employee.id}`}
                          onToggle={() =>
                            void toggleStatus(
                              "employees",
                              employee.id,
                              employee.status,
                            )
                          }
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          className="rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5"
                          onClick={() =>
                            void openView("employees", employee.id)
                          }
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                          onClick={() =>
                            void openEdit(
                              "employees",
                              employee.id,
                              `Edit ${employee.name}`,
                            )
                          }
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Brokers table */}
        {(activeTab === "brokers" || !isAdmin) && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-amber-50/50">
                <tr className="border-b border-amber-900/10">
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Broker
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Code
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Downline
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-amber-900/10">
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-sm text-gray-500"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : filteredBrokers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <p className="text-sm font-medium text-gray-700">
                        No brokers found
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Try changing your search or filters.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredBrokers.map((broker) => (
                    <tr
                      key={broker.id}
                      className="transition hover:bg-amber-50/30"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={broker.name} />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {broker.name}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500">
                              {broker.email || "No email"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-primary">
                          {broker.user_code || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {broker.mobile || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {broker.parentBroker ? (
                          <>
                            <p>{broker.parentBroker.name}</p>
                            <p className="text-xs text-gray-500">
                              {broker.parentBroker.userCode ?? "-"}
                            </p>
                          </>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-gray-900">
                          {broker.brokerCount ?? 0}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusToggle
                          status={broker.status}
                          busy={statusBusy === `brokers:${broker.id}`}
                          onToggle={() =>
                            void toggleStatus(
                              "brokers",
                              broker.id,
                              broker.status,
                            )
                          }
                        />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          className="rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5"
                          onClick={() => void showDownline(broker)}
                        >
                          View Downline
                        </button>

                        <button
                          type="button"
                          className="rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5"
                          onClick={() => void openView("brokers", broker.id)}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                          onClick={() =>
                            void openEdit(
                              "brokers",
                              broker.id,
                              `Edit ${broker.name}`,
                            )
                          }
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modals */}
      {viewTarget && viewDetail && (
        <TeamMemberViewModal
          detail={viewDetail}
          documentUrl={(type) => documentUrl(viewTarget.id, type)}
          onClose={closeView}
          onEdit={startEditFromView}
        />
      )}

      {viewTarget && !viewDetail && !viewError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <p className="rounded-xl bg-white px-6 py-4 text-sm text-gray-600">
            Loading profile...
          </p>
        </div>
      )}

      {viewError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6">
            <p role="alert" className="text-sm text-red-700">
              {viewError}
            </p>
            <button
              type="button"
              onClick={closeView}
              className="mt-4 rounded-lg border border-amber-900/15 px-4 py-2 text-sm font-medium text-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {editTarget && editValues && (
        <TeamMemberEditModal
          title={editTarget.title}
          kind={editTarget.kind}
          defaultValues={editValues}
          hints={editHints}
          saving={editSaving}
          error={editError}
          onClose={closeEdit}
          onSubmit={(values, files) => void saveEdit(values, files)}
        />
      )}
    </AdminLayout>
  );
}