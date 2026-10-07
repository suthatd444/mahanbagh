"use client";
import { Suspense } from "react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import AdminLayout from "../../../components/admin/AdminLayout";
import { api } from "../../../lib/api";

type Role = "EMPLOYEE" | "MASTER_BROKER" | "BROKER";

type TeamMemberForm = {
  role: Role;

  // Account & Profile
  fullName: string;
  mobile: string;
  email: string;
  city: string;
  pan: string;
  aadhaar: string;
  address: string;

  // Employee
  employeeCode: string;
  designation: string;
  joiningDate: string;

  // Master Broker
  masterBrokerCode: string;
  masterBrokerId: string;

  firmAgencyName: string;
  bankHolderName: string;
  bankName: string;
  bankAccount: string;
  bankIfsc: string;
  panDocument: File | null;
  aadhaarDocument: File | null;
};

interface CurrentUser {
  role: string;
}

interface MasterBrokerOption {
  id: string;
  name: string;
  user_code: string | null;
}

function createInitialForm(role: Role): TeamMemberForm {
  return {
    role,

    fullName: "",
    mobile: "",
    email: "",
    city: "",
    pan: "",
    aadhaar: "",
    address: "",

    employeeCode: "",
    designation: "",
    joiningDate: "",

    masterBrokerCode: "",
    masterBrokerId: "",

    firmAgencyName: "",
    bankHolderName: "",
    bankName: "",
    bankAccount: "",
    bankIfsc: "",
    panDocument: null,
    aadhaarDocument: null,
  };
}

export default function CreateTeamMemberPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading...</div>}>
      <CreateTeamMemberForm />
    </Suspense>
  );
}

function CreateTeamMemberForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [form, setForm] = useState<TeamMemberForm>(() =>
    createInitialForm(
      searchParams.get("role") === "master-broker"
        ? "MASTER_BROKER"
        : searchParams.get("role") === "broker"
          ? "BROKER"
          : "EMPLOYEE",
    ),
  );
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [masterBrokers, setMasterBrokers] = useState<MasterBrokerOption[]>([]);

  const [errors, setErrors] = useState<
    Partial<Record<keyof TeamMemberForm, string>>
  >({});

  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ data?: CurrentUser }>("/auth/me")
      .then(({ data }) => {
        setCurrentUser(data.data ?? null);
        if (data.data?.role === "EMPLOYEE") {
          setForm((previous) => ({ ...previous, role: "MASTER_BROKER" }));
          api
            .get<{ data?: { items: MasterBrokerOption[] } }>(
              "/employee/downline",
              { params: { limit: 100 } },
            )
            .then(({ data: response }) =>
              setMasterBrokers(response.data?.items ?? []),
            )
            .catch(() => setMasterBrokers([]));
        } else if (data.data?.role === "MASTER_BROKER") {
          setForm((previous) => ({ ...previous, role: "BROKER" }));
        }
      })
      .catch(() => setCurrentUser(null));
  }, []);

  const isEmployeeCreator = currentUser?.role === "EMPLOYEE";
  const isMasterBrokerCreator = currentUser?.role === "MASTER_BROKER";

  function updateField<K extends keyof TeamMemberForm>(
    field: K,
    value: TeamMemberForm[K],
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [field]: undefined,
    }));
  }

  function validate(): boolean {
    const nextErrors: Partial<Record<keyof TeamMemberForm, string>> = {};

    if (!form.fullName.trim()) {
      nextErrors.fullName = "Full name is required";
    }

    if (!form.mobile.trim()) {
      nextErrors.mobile = "Mobile number is required";
    } else if (!/^[0-9]{10}$/.test(form.mobile)) {
      nextErrors.mobile = "Enter a valid 10 digit mobile number";
    }

    if (!form.email.trim()) {
      nextErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = "Enter a valid email address";
    }

    if (!form.city.trim()) {
      nextErrors.city = "City is required";
    }

    if (!form.address.trim()) {
      nextErrors.address = "Address is required";
    }

    if (!form.pan.trim()) {
      nextErrors.pan = "PAN is required";
    } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.pan)) {
      nextErrors.pan = "Enter a valid PAN";
    }

    if (!form.aadhaar.trim()) {
      nextErrors.aadhaar = "Aadhaar number is required";
    } else if (!/^[0-9]{12}$/.test(form.aadhaar)) {
      nextErrors.aadhaar = "Enter a valid 12 digit Aadhaar number";
    }

    if (!form.panDocument && !isMasterBrokerCreator) {
      nextErrors.panDocument = "PAN document is required";
    }

    if (!form.aadhaarDocument && !isMasterBrokerCreator) {
      nextErrors.aadhaarDocument = "Aadhaar document is required";
    }

    if (!form.bankHolderName.trim()) {
      nextErrors.bankHolderName = "Account holder name is required";
    }

    if (!form.bankName.trim()) {
      nextErrors.bankName = "Bank name is required";
    }

    if (!form.bankAccount.trim()) {
      nextErrors.bankAccount = "Bank account number is required";
    }

    if (!form.bankIfsc.trim()) {
      nextErrors.bankIfsc = "IFSC code is required";
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.bankIfsc)) {
      nextErrors.bankIfsc = "Enter a valid 11 character IFSC code";
    }

    if (form.role === "EMPLOYEE") {
      if (!form.designation) {
        nextErrors.designation = "Designation is required";
      }

      if (!form.joiningDate) {
        nextErrors.joiningDate = "Joining date is required";
      }
    }

    if (form.role === "MASTER_BROKER") {
      if (!form.firmAgencyName.trim()) {
        nextErrors.firmAgencyName = "Firm or agency name is required";
      }
    }

    if (
      form.role === "BROKER" &&
      !isMasterBrokerCreator &&
      !form.masterBrokerId
    ) {
      nextErrors.masterBrokerId = "Select a master broker";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      setSubmitting(true);
      setSubmissionError(null);

      const fields: Record<string, string> = {
        name: form.fullName,
        mobile: form.mobile,
        email: form.email,
        city: form.city,
        pan: form.pan,
        aadhaar: form.aadhaar,
        address: form.address,
        bankHolderName: form.bankHolderName,
        bankName: form.bankName,
        bankAccount: form.bankAccount,
        bankIfsc: form.bankIfsc,
      };

      if (form.role === "EMPLOYEE") {
        Object.assign(fields, {
          designation: form.designation,
          joiningDate: form.joiningDate,
        });
      } else if (form.role === "MASTER_BROKER") {
        Object.assign(fields, { firmAgencyName: form.firmAgencyName });
      } else {
        Object.assign(fields, {
          masterBrokerId: form.masterBrokerId,
          firmName: form.firmAgencyName,
        });
      }

      let endpoint: string;
      if (isMasterBrokerCreator) {
        endpoint = "/master-broker/brokers";
      } else if (form.role === "EMPLOYEE") {
        endpoint = "/admin/employees";
      } else if (isEmployeeCreator) {
        endpoint =
          form.role === "BROKER"
            ? "/employee/brokers"
            : "/employee/master-brokers";
      } else {
        endpoint = "/admin/master-brokers";
      }

      if (isMasterBrokerCreator) {
        delete fields.masterBrokerId;
        await api.post(endpoint, fields);
      } else {
        const payload = new globalThis.FormData();
        Object.entries(fields).forEach(([name, value]) =>
          payload.append(name, value),
        );
        payload.append("panDocument", form.panDocument!);
        payload.append("aadhaarDocument", form.aadhaarDocument!);
        await api.post(endpoint, payload);
      }

      router.push("/team");
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof error.response === "object" &&
        error.response !== null &&
        "data" in error.response &&
        typeof error.response.data === "object" &&
        error.response.data !== null &&
        "message" in error.response.data &&
        typeof error.response.data.message === "string"
          ? error.response.data.message
          : "Unable to create the team member. Please try again.";
      setSubmissionError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
        <Suspense fallback={<div>Loading...</div>}>
    <AdminLayout>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Page Header */}
        <section>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm text-gray-500">Team management</p>

              <h1 className="mt-1 font-serif text-2xl font-semibold text-primary sm:text-3xl">
                Create Team Member
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                {isMasterBrokerCreator
                  ? "Create a broker account under your firm."
                  : "Create an employee or master broker account."}
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/team")}
              className="rounded-lg border border-amber-900/15 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-amber-50"
            >
              Cancel
            </button>
          </div>
        </section>

        {/* Role */}
        <section className="rounded-2xl border border-amber-900/20 border-t-4 border-t-amber-600 bg-white p-6 shadow-sm sm:p-7">
          <SectionTitle
            title="Role"
            description="Select the type of team member you want to create."
          />

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {!isEmployeeCreator && !isMasterBrokerCreator && (
              <RoleOption
                value="EMPLOYEE"
                selected={form.role === "EMPLOYEE"}
                title="Employee"
                description="Create an employee account."
                onChange={() => updateField("role", "EMPLOYEE")}
              />
            )}

            {!isMasterBrokerCreator && (
              <RoleOption
                value="MASTER_BROKER"
                selected={form.role === "MASTER_BROKER"}
                title="Master Broker"
                description="Create a master broker account."
                onChange={() => updateField("role", "MASTER_BROKER")}
              />
            )}

            {(isEmployeeCreator || isMasterBrokerCreator) && (
              <RoleOption
                value="BROKER"
                selected={form.role === "BROKER"}
                title="Broker"
                description={
                  isMasterBrokerCreator
                    ? "Create a broker under your firm."
                    : "Create a broker under one of your master brokers."
                }
                onChange={() => updateField("role", "BROKER")}
              />
            )}
          </div>
        </section>
        {/* Employee Details */}
        {form.role === "EMPLOYEE" && (
          <section className="rounded-2xl border border-amber-900/20 border-t-4 border-t-amber-600 bg-white p-6 shadow-sm sm:p-7">
            <SectionTitle
              title="Employee details"
              description="Information related to the employee."
            />

            <div className="mt-7 grid gap-x-6 gap-y-5 sm:grid-cols-2">
              <FormInput
                label="Employee code"
                value={form.employeeCode}
                readOnly
                placeholder="Generated automatically"
                helper="Saved after account creation"
              />

              <FormSelect
                label="Designation"
                required
                value={form.designation}
                onChange={(value) => updateField("designation", value)}
                error={errors.designation}
                options={[
                  {
                    value: "EXECUTIVE",
                    label: "Executive",
                  },
                  {
                    value: "SENIOR_EXECUTIVE",
                    label: "Senior Executive",
                  },
                  {
                    value: "MANAGER",
                    label: "Manager",
                  },
                  {
                    value: "SENIOR_MANAGER",
                    label: "Senior Manager",
                  },
                ]}
              />

              <FormInput
                label="Joining date"
                required
                type="date"
                value={form.joiningDate}
                onChange={(value) => updateField("joiningDate", value)}
                error={errors.joiningDate}
              />
            </div>
          </section>
        )}

        {/* Master Broker Details */}
        {form.role === "MASTER_BROKER" && (
          <section className="rounded-2xl border border-amber-900/20 border-t-4 border-t-amber-600 bg-white p-6 shadow-sm sm:p-7">
            <SectionTitle
              title="Master Broker details"
              description="Information related to the master broker."
            />

            <div className="mt-7 grid gap-x-6 gap-y-5 sm:grid-cols-2">
              <FormInput
                label="Master broker code"
                value={form.masterBrokerCode}
                readOnly
                placeholder="Generated automatically"
                helper="Saved after account creation"
              />

              <FormInput
                label="Firm or agency name"
                required
                value={form.firmAgencyName}
                onChange={(value) => updateField("firmAgencyName", value)}
                error={errors.firmAgencyName}
              />
            </div>
          </section>
        )}

        {form.role === "BROKER" && (
          <section className="rounded-2xl border border-amber-900/20 border-t-4 border-t-amber-600 bg-white p-6 shadow-sm sm:p-7">
            <SectionTitle
              title="Broker details"
              description={
                isMasterBrokerCreator
                  ? "This broker will be created under your firm."
                  : "Assign this broker to one of your master brokers."
              }
            />

            <div className="mt-7 grid gap-x-6 gap-y-5 sm:grid-cols-2">
              {!isMasterBrokerCreator && (
                <FormSelect
                  label="Master broker"
                  required
                  value={form.masterBrokerId}
                  onChange={(value) => updateField("masterBrokerId", value)}
                  error={errors.masterBrokerId}
                  options={masterBrokers.map((broker) => ({
                    value: broker.id,
                    label: `${broker.name} (${broker.user_code ?? "No code"})`,
                  }))}
                />
              )}

              <FormInput
                label="Firm or agency name"
                value={form.firmAgencyName}
                onChange={(value) => updateField("firmAgencyName", value)}
                error={errors.firmAgencyName}
              />
            </div>
          </section>
        )}

        {/* Account & Profile */}
        <section className="rounded-2xl border border-amber-900/20 border-t-4 border-t-amber-600 bg-white p-6 shadow-sm sm:p-7">
          <SectionTitle
            title="Account and profile"
            description="Basic information for the account."
          />

          <div className="mt-7 grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <FormInput
              label="Full name"
              required
              value={form.fullName}
              onChange={(value) => updateField("fullName", value)}
              error={errors.fullName}
              placeholder=""
            />

            <FormInput
              label="Mobile"
              required
              type="tel"
              value={form.mobile}
              onChange={(value) =>
                updateField("mobile", value.replace(/\D/g, "").slice(0, 10))
              }
              error={errors.mobile}
              placeholder=""
            />

            <FormInput
              label="Email"
              required
              type="email"
              value={form.email}
              onChange={(value) => updateField("email", value)}
              error={errors.email}
              placeholder=""
            />

            <FormInput
              label="City"
              required
              value={form.city}
              onChange={(value) => updateField("city", value)}
              error={errors.city}
              placeholder=""
            />

            <FormInput
              label="PAN"
              required
              value={form.pan}
              onChange={(value) =>
                updateField("pan", value.toUpperCase().slice(0, 10))
              }
              placeholder=""
              error={errors.pan}
            />

            <FormInput
              label="Aadhaar number"
              required
              value={form.aadhaar}
              type="text"
              onChange={(value) =>
                updateField("aadhaar", value.replace(/\D/g, "").slice(0, 12))
              }
              placeholder=""
              error={errors.aadhaar}
            />

            <div className="sm:col-span-2">
              <FormTextarea
                label="Address"
                required
                value={form.address}
                onChange={(value) => updateField("address", value)}
                error={errors.address}
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-amber-900/20 border-t-4 border-t-amber-600 bg-white p-6 shadow-sm sm:p-7">
          <SectionTitle
            title="Bank and identity documents"
            description={
              isMasterBrokerCreator
                ? "Bank details and identity numbers are required to create the account."
                : "Bank details and identity documents are required to create the account."
            }
          />

          <div className="mt-7 grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <FormInput
              label="Account holder name"
              required
              value={form.bankHolderName}
              onChange={(value) => updateField("bankHolderName", value)}
              error={errors.bankHolderName}
            />

            <FormInput
              label="Bank name"
              required
              value={form.bankName}
              onChange={(value) => updateField("bankName", value)}
              error={errors.bankName}
            />

            <FormInput
              label="Bank account number"
              required
              value={form.bankAccount}
              onChange={(value) => updateField("bankAccount", value)}
              error={errors.bankAccount}
            />

            <FormInput
              label="IFSC code"
              required
              value={form.bankIfsc}
              onChange={(value) =>
                updateField(
                  "bankIfsc",
                  value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 11),
                )
              }
              error={errors.bankIfsc}
            />

            {!isMasterBrokerCreator && (
              <>
                <FileInput
                  label="PAN document"
                  required
                  file={form.panDocument}
                  onChange={(file) => updateField("panDocument", file)}
                  error={errors.panDocument}
                />

                <FileInput
                  label="Aadhaar document"
                  required
                  file={form.aadhaarDocument}
                  onChange={(file) => updateField("aadhaarDocument", file)}
                  error={errors.aadhaarDocument}
                />
              </>
            )}
          </div>
        </section>

        {submissionError && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {submissionError}
          </p>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => router.push("/team")}
            disabled={submitting}
            className="rounded-lg border border-amber-900/15 bg-white px-5 py-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? "Creating..."
              : form.role === "EMPLOYEE"
                ? "Create Employee"
                : form.role === "BROKER"
                  ? "Create Broker"
                  : "Create Master Broker"}
          </button>
        </div>
      </form>
    </AdminLayout>
    </Suspense>
  );
}

/* -------------------------------------------------------------------------- */
/* Components                                                                 */
/* -------------------------------------------------------------------------- */

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <h2 className="font-serif text-2xl font-semibold text-primary sm:text-3xl">
        {title}
      </h2>

      {description && (
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      )}
    </div>
  );
}

function RoleOption({
  value,
  selected,
  title,
  description,
  onChange,
}: {
  value: Role;
  selected: boolean;
  title: string;
  description: string;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-5 transition ${
        selected
          ? "border-primary bg-primary/[0.03] ring-1 ring-primary"
          : "border-amber-900/15 bg-white hover:border-primary/40 hover:bg-amber-50/30"
      }`}
    >
      <input
        type="radio"
        name="role"
        value={value}
        checked={selected}
        onChange={onChange}
        className="mt-1 h-4 w-4 accent-primary"
      />

      <span>
        <span className="block text-base font-semibold text-gray-900">
          {title}
        </span>

        <span className="mt-1 block text-sm text-gray-500">{description}</span>
      </span>
    </label>
  );
}

function FormInput({
  label,
  required = false,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
  readOnly = false,
  helper,
}: {
  label: string;
  required?: boolean;
  type?: string;
  value: string;
  onChange?: (value: string) => void;
  error?: string;
  placeholder?: string;
  readOnly?: boolean;
  helper?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-gray-800">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </label>

      <input
        type={type}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={(event) => onChange?.(event.target.value)}
        className={`h-12 w-full rounded-lg border bg-white px-3.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/10 ${
          error ? "border-red-400" : "border-amber-900/20"
        } ${readOnly ? "cursor-not-allowed bg-gray-50 text-gray-500" : ""}`}
      />

      {helper && !error && (
        <p className="mt-1.5 text-xs text-gray-400">{helper}</p>
      )}

      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function FileInput({
  label,
  required = false,
  file,
  onChange,
  error,
}: {
  label: string;
  required?: boolean;
  file: File | null;
  onChange: (file: File | null) => void;
  error?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-gray-800">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </label>

      <input
        type="file"
        accept=".pdf,image/jpeg,image/png"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        className={`block w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-amber-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary hover:file:bg-amber-100 ${
          error ? "border-red-400" : "border-amber-900/20"
        }`}
      />

      <p className="mt-1.5 text-xs text-gray-400">
        {file ? file.name : "PDF, JPEG, or PNG up to 5 MB"}
      </p>

      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function FormTextarea({
  label,
  required = false,
  value,
  onChange,
  error,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-gray-800">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </label>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className={`w-full resize-y rounded-xl border bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/10 ${
          error ? "border-red-400" : "border-amber-900/20"
        }`}
      />

      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function FormSelect({
  label,
  required = false,
  value,
  onChange,
  error,
  options,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  options: {
    value: string;
    label: string;
  }[];
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-gray-800">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-14 w-full rounded-xl border bg-white px-4 text-sm text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 ${
          error ? "border-red-400" : "border-amber-900/20"
        } ${!value ? "text-gray-400" : ""}`}
      >
        <option value="">Select {label}</option>

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
