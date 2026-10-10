"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ApiResponse } from "@mohan-bagh/shared";

import AdminLayout from "../../../components/admin/AdminLayout";
import { api } from "../../../lib/api";
import type {
  EnquiryAssignee,
  EnquiryRole,
} from "../../../types/enquiry";

interface CurrentUser {
  id: string;
  name: string;
  role: string;
}

type InputMode = "text" | "numeric" | "tel" | "email";

function FormInput({
  label,
  required = false,
  type = "text",
  inputMode,
  value,
  onChange,
  error,
  placeholder,
  helper,
}: {
  label: string;
  required?: boolean;
  type?: string;
  inputMode?: InputMode;
  value: string;
  onChange?: (value: string) => void;
  error?: string;
  placeholder?: string;
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
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange?.(event.target.value)}
        className={`h-12 w-full rounded-lg border bg-white px-3.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/10 ${
          error ? "border-red-400" : "border-amber-900/20"
        }`}
      />
      {helper && !error && <p className="mt-1.5 text-xs text-gray-400">{helper}</p>}
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
  placeholder,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange?: (value: string) => void;
  error?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-gray-800">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </label>
      <textarea
        rows={3}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange?.(event.target.value)}
        className={`w-full resize-y rounded-lg border bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/10 ${
          error ? "border-red-400" : "border-amber-900/20"
        }`}
      />
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function CreateEnquiryPage() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [remarks, setRemarks] = useState("");

  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [verified, setVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  const [assignees, setAssignees] = useState<EnquiryAssignee[]>([]);
  const [assignedTo, setAssignedTo] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);

  const isAdmin = user?.role === "ADMIN";

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

  const validPhone = phone.replace(/\D/g, "").length >= 10;

  const groupedAssignees = useMemo(() => {
    const groups: { role: EnquiryRole; label: string; items: EnquiryAssignee[] }[] =
      [];
    const roles: { role: EnquiryRole; label: string }[] = [
      { role: "EMPLOYEE", label: "Employees" },
      { role: "BROKER", label: "Brokers" },
    ];
    for (const { role, label } of roles) {
      const items = assignees.filter((item) => item.role === role);
      if (items.length) groups.push({ role, label, items });
    }
    return groups;
  }, [assignees]);

  async function handleSendOtp() {
    setError(null);
    setOtpError(null);
    setOtp("");
    setVerified(false);
    setSendingOtp(true);
    try {
      await api.post("/enquiries/otp/request", { mobile: phone });
      setOtpSent(true);
      setMessage(
        "OTP sent to the customer's mobile. In development, the OTP is printed on the server console.",
      );
    } catch (requestError: unknown) {
      setOtpSent(false);
      setOtpError(
        (requestError as { response?: { data?: { message?: string } } })
          ?.response?.data?.message ?? "Unable to send the OTP.",
      );
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleVerifyOtp() {
    setError(null);
    setOtpError(null);
    if (otp.replace(/\D/g, "").length !== 6) {
      setOtpError("Enter the 6-digit OTP.");
      return;
    }
    setVerifyingOtp(true);
    try {
      await api.post("/enquiries/otp/verify", { mobile: phone, otp });
      setVerified(true);
      setMessage("Mobile number verified.");
    } catch (requestError: unknown) {
      setVerified(false);
      setOtpError(
        (requestError as { response?: { data?: { message?: string } } })
          ?.response?.data?.message ?? "Invalid or expired OTP.",
      );
    } finally {
      setVerifyingOtp(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!customerName.trim()) {
      setError("Customer name is required.");
      return;
    }
    if (!validPhone) {
      setError("Enter a valid mobile number.");
      return;
    }
    if (!verified) {
      setError("Verify the customer's mobile number before adding the enquiry.");
      return;
    }
    if (isAdmin && !assignedTo) {
      setError("Select the employee, master broker or broker to assign this enquiry to.");
      return;
    }

    try {
      setSaving(true);
      await api.post("/enquiries", {
        customerName,
        phone,
        email: email.trim() || undefined,
        remarks: remarks.trim() || undefined,
        ...(isAdmin ? { assignedToUserId: assignedTo } : {}),
      });
      setCustomerName("");
      setPhone("");
      setEmail("");
      setRemarks("");
      setOtp("");
      setOtpSent(false);
      setVerified(false);
      if (isAdmin) setAssignedTo("");
      setMessage("Enquiry added successfully.");
    } catch (requestError: unknown) {
      setError(
        (requestError as { response?: { data?: { message?: string } } })
          ?.response?.data?.message ?? "Unable to add the enquiry.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout user={user}>
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-gray-500">Customer enquiry</p>
          <h1 className="mt-1 font-serif text-2xl font-semibold text-primary sm:text-3xl">
            Add enquiry
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Add a customer enquiry. The mobile number must be verified with an
            OTP before the enquiry is saved.
          </p>
        </div>
        <Link
          href="/enquiries"
          className="rounded-lg border border-amber-900/15 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-amber-50"
        >
          View enquiries
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

      <form
        onSubmit={handleSubmit}
        className="mt-6 max-w-2xl rounded-2xl border border-amber-900/20 border-t-4 border-t-amber-600 bg-white p-6 shadow-sm sm:p-7"
      >
        <h2 className="font-serif text-2xl font-semibold text-primary">
          Customer details
        </h2>

        <div className="mt-7 grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <FormInput
            label="Customer name"
            required
            value={customerName}
            onChange={setCustomerName}
            placeholder="Customer's full name"
          />

          <FormInput
            label="Mobile number"
            required
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(value) => {
              setPhone(value.replace(/\D/g, ""));
              setOtpSent(false);
              setOtp("");
              setVerified(false);
            }}
            placeholder="10-digit mobile number"
          />

          <div className="sm:col-span-2">
            <FormInput
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="optional"
            />
          </div>

          <div className="sm:col-span-2">
            <FormTextarea
              label="Remarks"
              value={remarks}
              onChange={setRemarks}
              placeholder="Any notes about this customer's requirement (optional)"
            />
          </div>

          {isAdmin && (
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-gray-800">
                Assign enquiry to <span className="ml-1 text-red-600">*</span>
              </label>
              <select
                value={assignedTo}
                onChange={(event) => setAssignedTo(event.target.value)}
                className="h-12 w-full rounded-lg border border-amber-900/20 bg-white px-3.5 text-sm text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              >
                <option value="">
                  {groupedAssignees.length ? "Select a team member" : "No team members available"}
                </option>
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
              {!groupedAssignees.length && (
                <p className="mt-1.5 text-xs text-gray-400">
                  No active team members found.
                </p>
              )}
            </div>
          )}

          {validPhone && !verified && (
            <div className="sm:col-span-2 rounded-xl border border-amber-900/15 bg-amber-50/60 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={sendingOtp}
                  className="rounded-lg border border-amber-900/25 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 transition hover:bg-amber-100 disabled:opacity-60"
                >
                  {sendingOtp ? "Sending..." : otpSent ? "Resend OTP" : "Send OTP"}
                </button>
                {otpSent && (
                  <input
                    inputMode="numeric"
                    value={otp}
                    onChange={(event) =>
                      setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="Enter 6-digit OTP"
                    className="h-12 w-full rounded-lg border border-amber-900/20 bg-white px-3.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 sm:w-48"
                  />
                )}
                {otpSent && (
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={verifyingOtp}
                    className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
                  >
                    {verifyingOtp ? "Verifying..." : "Verify OTP"}
                  </button>
                )}
              </div>
              {otpError && <p className="mt-2 text-xs text-red-600">{otpError}</p>}
            </div>
          )}

          {verified && (
            <div className="sm:col-span-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              Mobile number {phone} verified.
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <Link
            href="/enquiries"
            className="rounded-lg border border-amber-900/15 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-amber-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Add enquiry"}
          </button>
        </div>
      </form>
    </AdminLayout>
  );
}