"use client";

import { useState } from "react";

export type TeamEditKind = "employee" | "master-broker" | "broker";

export interface TeamEditForm {
  name: string;
  email: string;
  mobile: string;
  address: string;
  city: string;
  designation: string;
  firmName: string;
  reraNumber: string;
  bankHolderName: string;
  bankName: string;
  bankIfsc: string;
  bankAccount: string;
  pan: string;
  aadhaar: string;
}

export interface TeamEditFiles {
  panDocument?: File;
  aadhaarDocument?: File;
}

export interface TeamEditHints {
  bankAccountMasked?: string;
  panMasked?: string;
  aadhaarMasked?: string;
}

export const emptyTeamEditForm: TeamEditForm = {
  name: "",
  email: "",
  mobile: "",
  address: "",
  city: "",
  designation: "",
  firmName: "",
  reraNumber: "",
  bankHolderName: "",
  bankName: "",
  bankIfsc: "",
  bankAccount: "",
  pan: "",
  aadhaar: "",
};

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: FieldProps) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-500">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-amber-900/15 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/10"
      />
    </label>
  );
}

function FileField({
  label,
  hint,
  fileName,
  onChange,
}: {
  label: string;
  hint?: string;
  fileName?: string;
  onChange: (file: File | undefined) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <span className="mt-1 flex items-center gap-2">
        <span className="rounded-lg border border-amber-900/15 bg-white px-3 py-2 text-xs text-gray-500">
          {fileName ?? "No file selected"}
        </span>
        <span className="cursor-pointer rounded-lg border border-amber-900/15 bg-white px-3 py-2 text-xs font-medium text-primary transition hover:bg-gray-50">
          Choose file
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(event) => onChange(event.target.files?.[0])}
          />
        </span>
      </span>
      {hint && <span className="mt-1 block text-[11px] text-gray-400">{hint}</span>}
    </label>
  );
}

interface TeamMemberEditModalProps {
  title: string;
  kind: TeamEditKind;
  defaultValues: TeamEditForm;
  hints?: TeamEditHints;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: TeamEditForm, files: TeamEditFiles) => void;
}

export default function TeamMemberEditModal({
  title,
  kind,
  defaultValues,
  hints,
  saving,
  error,
  onClose,
  onSubmit,
}: TeamMemberEditModalProps) {
  const [form, setForm] = useState<TeamEditForm>(defaultValues);
  const [files, setFiles] = useState<TeamEditFiles>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  function update(patch: Partial<TeamEditForm>) {
    setForm((current) => ({ ...current, ...patch }));
    setValidationError(null);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const name = form.name.trim();
    const mobile = form.mobile.trim();
    const email = form.email.trim();
    const address = form.address.trim();
    const city = form.city.trim();
    const bankAccount = form.bankAccount.trim();
    const pan = form.pan.trim().toUpperCase();
    const aadhaar = form.aadhaar.trim();
    const ifsc = form.bankIfsc.trim().toUpperCase();

    if (!name) return setValidationError("Name is required.");
    if (!/^\d{10}$/.test(mobile))
      return setValidationError("Enter a valid 10-digit mobile number.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return setValidationError("Enter a valid email address.");
    if (!address) return setValidationError("Address is required.");
    if (!city) return setValidationError("City is required.");
    if (kind === "employee" && !form.designation.trim())
      return setValidationError("Designation is required.");
    if (ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc))
      return setValidationError("Enter a valid IFSC code.");
    if (bankAccount && !/^\d{6,20}$/.test(bankAccount))
      return setValidationError(
        "Account number must be 6 to 20 digits without spaces.",
      );
    if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan))
      return setValidationError("Enter a valid PAN number.");
    if (aadhaar && !/^\d{12}$/.test(aadhaar))
      return setValidationError("Aadhaar must be exactly 12 digits.");
    if (pan && !files.panDocument)
      return setValidationError("Attach the PAN document file as well.");
    if (files.panDocument && !pan)
      return setValidationError("Enter the PAN number for the attached file.");
    if (aadhaar && !files.aadhaarDocument)
      return setValidationError("Attach the Aadhaar document file as well.");
    if (files.aadhaarDocument && !aadhaar)
      return setValidationError(
        "Enter the Aadhaar number for the attached file.",
      );

    onSubmit(
      {
        ...form,
        name,
        email,
        mobile,
        address,
        city,
        designation: form.designation.trim(),
        firmName: form.firmName.trim(),
        reraNumber: form.reraNumber.trim(),
        bankHolderName: form.bankHolderName.trim(),
        bankName: form.bankName.trim(),
        bankIfsc: ifsc,
        bankAccount,
        pan,
        aadhaar,
      },
      files,
    );
  }

  const message = validationError ?? error;
  const hasBankDetails =
    !!hints?.bankAccountMasked || !!form.bankHolderName || !!form.bankName;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-serif text-lg font-semibold text-primary">
              {title}
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Leave bank and identity fields blank to keep them unchanged.
            </p>
          </div>

          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-md p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field
                label="Full name"
                required
                value={form.name}
                onChange={(value) => update({ name: value })}
              />
            </div>

            <Field
              label="Mobile number"
              required
              type="tel"
              value={form.mobile}
              onChange={(value) => update({ mobile: value })}
            />

            <Field
              label="Email"
              type="email"
              value={form.email}
              onChange={(value) => update({ email: value })}
            />

            <div className="sm:col-span-2">
              <Field
                label="Address"
                required
                value={form.address}
                onChange={(value) => update({ address: value })}
              />
            </div>

            <Field
              label="City"
              required
              value={form.city}
              onChange={(value) => update({ city: value })}
            />

            {kind === "employee" && (
              <Field
                label="Designation"
                required
                value={form.designation}
                onChange={(value) => update({ designation: value })}
              />
            )}

            {kind !== "employee" && (
              <>
                <Field
                  label="Firm name"
                  value={form.firmName}
                  onChange={(value) => update({ firmName: value })}
                />
                {kind === "broker" && (
                  <Field
                    label="RERA number"
                    value={form.reraNumber}
                    onChange={(value) => update({ reraNumber: value })}
                  />
                )}
              </>
            )}
          </div>

          <fieldset className="space-y-4 rounded-lg border border-amber-900/10 bg-amber-50/30 p-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Bank details
            </legend>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Account holder name"
                value={form.bankHolderName}
                onChange={(value) => update({ bankHolderName: value })}
              />

              <Field
                label="Bank name"
                value={form.bankName}
                onChange={(value) => update({ bankName: value })}
              />

              <Field
                label="IFSC code"
                value={form.bankIfsc}
                onChange={(value) => update({ bankIfsc: value.toUpperCase() })}
              />

              <Field
                label="Account number"
                type="text"
                value={form.bankAccount}
                placeholder={
                  hasBankDetails ? `On file: ${hints?.bankAccountMasked ?? "••••"}` : "e.g. 123456789012"
                }
                onChange={(value) => update({ bankAccount: value })}
              />
            </div>
          </fieldset>

          <fieldset className="space-y-4 rounded-lg border border-amber-900/10 bg-amber-50/30 p-4">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Identity documents
            </legend>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="PAN number"
                value={form.pan}
                placeholder={
                  hints?.panMasked ? `On file: ${hints.panMasked}` : "e.g. ABCDE1234F"
                }
                onChange={(value) => update({ pan: value.toUpperCase() })}
              />

              <FileField
                label="PAN document"
                hint="PDF or image, up to 5 MB"
                fileName={files.panDocument?.name}
                onChange={(file) => {
                  setFiles((current) => ({ ...current, panDocument: file }));
                  setValidationError(null);
                }}
              />

              <Field
                label="Aadhaar number"
                value={form.aadhaar}
                placeholder={
                  hints?.aadhaarMasked
                    ? `On file: ${hints.aadhaarMasked}`
                    : "e.g. 123456789012"
                }
                onChange={(value) =>
                  update({ aadhaar: value.replace(/\D/g, "") })
                }
              />

              <FileField
                label="Aadhaar document"
                hint="PDF or image, up to 5 MB"
                fileName={files.aadhaarDocument?.name}
                onChange={(file) => {
                  setFiles((current) => ({
                    ...current,
                    aadhaarDocument: file,
                  }));
                  setValidationError(null);
                }}
              />
            </div>

            <p className="text-[11px] text-gray-400">
              Upload a new file together with its number to replace the
              document on record. Existing numbers stay untouched when left
              blank.
            </p>
          </fieldset>

          {message && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {message}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-amber-900/15 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
