"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import axios from "axios";
import type { ApiResponse } from "@mohan-bagh/shared";
import { api } from "../../../lib/api";

type TargetRole = "BROKER";

interface ReferralInfo {
  targetRole: TargetRole;
  parentBrokerName?: string | null;
}

interface RegisterForm {
  fullName: string;
  mobile: string;
  email: string;
  city: string;
  address: string;
  pan: string;
  aadhaar: string;
  firmAgencyName: string;
  bankHolderName: string;
  bankName: string;
  bankAccount: string;
  bankIfsc: string;
  panDocument: File | null;
  aadhaarDocument: File | null;
}

interface CreatedUser {
  userCode: string;
  name: string;
}

const initialForm: RegisterForm = {
  fullName: "",
  mobile: "",
  email: "",
  city: "",
  address: "",
  pan: "",
  aadhaar: "",
  firmAgencyName: "",
  bankHolderName: "",
  bankName: "",
  bankAccount: "",
  bankIfsc: "",
  panDocument: null,
  aadhaarDocument: null,
};

export default function RegisterPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";

  const [referral, setReferral] = useState<ReferralInfo | null>(null);
  const [loadState, setLoadState] = useState<
    "loading" | "invalid" | "ready"
  >("loading");

  const [form, setForm] = useState<RegisterForm>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof RegisterForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedUser | null>(null);

  useEffect(() => {
    if (!token) return;
    api
      .get<ApiResponse<ReferralInfo>>(
        `/public/referrals/${encodeURIComponent(token)}`,
      )
      .then(({ data }) => {
        const info = data.data;
        if (info?.targetRole === "BROKER") {
          setReferral(info);
          setLoadState("ready");
        } else {
          setLoadState("invalid");
        }
      })
      .catch(() => setLoadState("invalid"));
  }, [token]);

  function updateField<K extends keyof RegisterForm>(field: K, value: RegisterForm[K]) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  }

  function validate(): boolean {
    const nextErrors: Partial<Record<keyof RegisterForm, string>> = {};

    // Only name, mobile, PAN and Aadhaar are compulsory; every other field and
    // identity document upload is optional.
    if (!form.fullName.trim()) nextErrors.fullName = "Full name is required";

    if (!form.mobile.trim()) {
      nextErrors.mobile = "Mobile number is required";
    } else if (!/^[0-9]{10}$/.test(form.mobile)) {
      nextErrors.mobile = "Enter a valid 10 digit mobile number";
    }

    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = "Enter a valid email address";
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

    if (form.bankIfsc.trim() && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.bankIfsc)) {
      nextErrors.bankIfsc = "Enter a valid 11 character IFSC code";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      setSubmissionError(null);

      const payload = new globalThis.FormData();
      const fields: Record<string, string> = {
        name: form.fullName,
        mobile: form.mobile,
        email: form.email,
        city: form.city,
        address: form.address,
        firmName: form.firmAgencyName,
        pan: form.pan,
        aadhaar: form.aadhaar,
        bankHolderName: form.bankHolderName,
        bankName: form.bankName,
        bankAccount: form.bankAccount,
        bankIfsc: form.bankIfsc,
      };

      Object.entries(fields).forEach(([name, value]) =>
        payload.append(name, value),
      );
      if (form.panDocument) payload.append("panDocument", form.panDocument);
      if (form.aadhaarDocument)
        payload.append("aadhaarDocument", form.aadhaarDocument);

      const { data } = await api.post<ApiResponse<CreatedUser>>(
        `/public/referrals/${encodeURIComponent(token)}/register`,
        payload,
      );

      if (!data.status || !data.data) {
        throw new Error(data.message);
      }

      setCreated(data.data);
    } catch (error: unknown) {
      setSubmissionError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (loadState === "loading") {
    return (
      <Shell>
        <p className="py-10 text-center text-sm text-gray-500">
          Checking your invitation...
        </p>
      </Shell>
    );
  }

  if (loadState === "invalid") {
    return (
      <Shell>
        <h1 className="font-serif text-2xl font-semibold text-primary">
          Invalid or expired link
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          This referral link is no longer valid. Please ask the person who
          shared it to generate a new one.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
        >
          Go to login
        </Link>
      </Shell>
    );
  }

  if (created) {
    return (
      <Shell>
        <h1 className="font-serif text-2xl font-semibold text-primary">
          Registration successful
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Welcome, {created.name}. Your account has been created.
        </p>
        <p className="mt-4 rounded-lg border border-amber-900/15 bg-amber-50/50 px-4 py-3 text-sm text-gray-700">
          Your code:{" "}
          <span className="font-semibold text-primary">{created.userCode}</span>
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
        >
          Continue to login
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="font-serif text-2xl font-semibold text-primary sm:text-3xl">
        Register as Broker
      </h1>

      <p className="mt-2 text-sm leading-6 text-gray-600">
        {`Complete the form below to create your broker account${
          referral?.parentBrokerName
            ? ` under ${referral.parentBrokerName}`
            : ""
        }.`}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <FormSection title="Account and profile">
          <FormInput
            label="Full name"
            required
            value={form.fullName}
            onChange={(value) => updateField("fullName", value)}
            error={errors.fullName}
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
          />
          <FormInput
            label="Email"
            type="email"
            value={form.email}
            onChange={(value) => updateField("email", value)}
            error={errors.email}
          />
          <FormInput
            label="City"
            value={form.city}
            onChange={(value) => updateField("city", value)}
            error={errors.city}
          />
          <FormInput
            label="PAN"
            required
            value={form.pan}
            onChange={(value) =>
              updateField("pan", value.toUpperCase().slice(0, 10))
            }
            error={errors.pan}
          />
          <FormInput
            label="Aadhaar number"
            required
            value={form.aadhaar}
            onChange={(value) =>
              updateField("aadhaar", value.replace(/\D/g, "").slice(0, 12))
            }
            error={errors.aadhaar}
          />
          <div className="sm:col-span-2">
            <FormTextarea
              label="Address"
              value={form.address}
              onChange={(value) => updateField("address", value)}
              error={errors.address}
            />
          </div>
        </FormSection>

        <FormSection title="Business details">
          <FormInput
            label="Firm or agency name"
            value={form.firmAgencyName}
            onChange={(value) => updateField("firmAgencyName", value)}
            error={errors.firmAgencyName}
          />
        </FormSection>

        <FormSection title="Bank and identity documents">
          <FormInput
            label="Account holder name"
            value={form.bankHolderName}
            onChange={(value) => updateField("bankHolderName", value)}
            error={errors.bankHolderName}
          />
          <FormInput
            label="Bank name"
            value={form.bankName}
            onChange={(value) => updateField("bankName", value)}
            error={errors.bankName}
          />
          <FormInput
            label="Bank account number"
            value={form.bankAccount}
            onChange={(value) => updateField("bankAccount", value)}
            error={errors.bankAccount}
          />
          <FormInput
            label="IFSC code"
            value={form.bankIfsc}
            onChange={(value) =>
              updateField(
                "bankIfsc",
                value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11),
              )
            }
            error={errors.bankIfsc}
          />
          <FileInput
            label="PAN document"
            file={form.panDocument}
            onChange={(file) => updateField("panDocument", file)}
            error={errors.panDocument}
          />
          <FileInput
            label="Aadhaar document"
            file={form.aadhaarDocument}
            onChange={(file) => updateField("aadhaarDocument", file)}
            error={errors.aadhaarDocument}
          />
        </FormSection>

        {submissionError && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {submissionError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Complete registration"}
        </button>
      </form>
    </Shell>
  );
}

/* -------------------------------------------------------------------------- */
/* Layout & components                                                        */
/* -------------------------------------------------------------------------- */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg px-4 py-10">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-amber-900/10 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-3 border-b border-amber-900/10 pb-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
            MB
          </span>
          <div>
            <p className="font-serif text-lg font-semibold text-primary">
              Mohan Bagh
            </p>
            <p className="text-xs text-gray-500">Registration</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-amber-900/15 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </h2>
      <div className="mt-4 grid gap-x-6 gap-y-5 sm:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

function FormInput({
  label,
  required = false,
  type = "text",
  value,
  onChange,
  error,
  helper,
}: {
  label: string;
  required?: boolean;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
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
        onChange={(event) => onChange(event.target.value)}
        className={`h-12 w-full rounded-lg border bg-white px-3.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/10 ${
          error ? "border-red-400" : "border-amber-900/20"
        }`}
      />

      {helper && !error && (
        <p className="mt-1.5 text-xs text-gray-400">{helper}</p>
      )}

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
        rows={4}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full resize-y rounded-lg border bg-white px-3.5 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/10 ${
          error ? "border-red-400" : "border-amber-900/20"
        }`}
      />

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

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError<ApiResponse>(error)) {
    return (
      error.response?.data?.message ||
      "Unable to complete the registration. Please try again."
    );
  }
  return "Unable to complete the registration. Please try again.";
}
