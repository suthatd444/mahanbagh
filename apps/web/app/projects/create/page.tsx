"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ApiResponse } from "@mohan-bagh/shared";

import AdminLayout from "../../../components/admin/AdminLayout";
import { api } from "../../../lib/api";
import type { Project } from "../../../types/project";

interface CurrentUser {
  id: string;
  name: string;
  role: string;
  userCode: string | null;
}

interface CreateForm {
  name: string;
  code: string;
  description: string;
  address: string;
  city: string;
  state: string;
  latitude: string;
  longitude: string;
  brochure: File | null;
  photos: File[];
}

const emptyForm: CreateForm = {
  name: "",
  code: "",
  description: "",
  address: "",
  city: "",
  state: "",
  latitude: "26.014865",
  longitude: "73.840739",
  brochure: null,
  photos: [],
};

export default function CreateProjectPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [form, setForm] = useState<CreateForm>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof CreateForm, string>>>(
    {},
  );
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ApiResponse<CurrentUser>>("/auth/me")
      .then(({ data }) => setUser(data.data ?? null))
      .catch(() => setUser(null));
  }, []);

  function updateField<K extends keyof CreateForm>(
    field: K,
    value: CreateForm[K],
  ) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof CreateForm, string>> = {};
    if (!form.name.trim()) next.name = "Project name is required";
    if (!form.description.trim())
      next.description = "Project details are required";
    if (!Number.isFinite(Number(form.latitude)))
      next.latitude = "Enter a valid latitude";
    if (!Number.isFinite(Number(form.longitude)))
      next.longitude = "Enter a valid longitude";
    if (form.brochure && form.brochure.type !== "application/pdf")
      next.brochure = "Brochure must be a PDF file";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);
      setSubmissionError(null);

      const payload = new FormData();
      payload.append("name", form.name);
      payload.append("code", form.code);
      payload.append("description", form.description);
      payload.append("address", form.address);
      payload.append("city", form.city);
      payload.append("state", form.state);
      payload.append("latitude", form.latitude);
      payload.append("longitude", form.longitude);
      if (form.brochure) payload.append("brochure", form.brochure);
      form.photos.forEach((photo) => payload.append("photos", photo));

      const { data } = await api.post<ApiResponse<Project>>(
        "/admin/projects",
        payload,
      );
      const project = data.data;
      router.push(project ? `/projects/${project.id}` : "/projects");
    } catch (error: unknown) {
      const message = (
        error as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      setSubmissionError(
        message || "Unable to create the project. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminLayout user={user}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <section>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm text-gray-500">Project management</p>
              <h1 className="mt-1 font-serif text-2xl font-semibold text-primary sm:text-3xl">
                Create Project
              </h1>
              <p className="mt-2 text-sm text-gray-500">
                Enter the project name and details, then upload a brochure and
                photos.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/projects")}
              className="rounded-lg border border-amber-900/15 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-amber-50"
            >
              Cancel
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-amber-900/20 border-t-4 border-t-amber-600 bg-white p-6 shadow-sm sm:p-7">
          <h2 className="font-serif text-2xl font-semibold text-primary">
            Project details
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Basic information about the project.
          </p>

          <div className="mt-7 grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <FormInput
              label="Project name"
              required
              value={form.name}
              onChange={(value) => updateField("name", value)}
              error={errors.name}
            />
            <FormInput
              label="Project code"
              value={form.code}
              onChange={(value) => updateField("code", value.toUpperCase())}
              helper="Optional unique code"
            />
            <div className="sm:col-span-2">
              <FormTextarea
                label="Details"
                required
                value={form.description}
                onChange={(value) => updateField("description", value)}
                error={errors.description}
              />
            </div>
            <div className="sm:col-span-2">
              <FormTextarea
                label="Address"
                value={form.address}
                onChange={(value) => updateField("address", value)}
              />
            </div>
            <FormInput
              label="City"
              value={form.city}
              onChange={(value) => updateField("city", value)}
            />
            <FormInput
              label="State"
              value={form.state}
              onChange={(value) => updateField("state", value)}
            />
            <FormInput
              label="Latitude"
              value={form.latitude}
              onChange={(value) => updateField("latitude", value)}
              error={errors.latitude}
            />
            <FormInput
              label="Longitude"
              value={form.longitude}
              onChange={(value) => updateField("longitude", value)}
              error={errors.longitude}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-amber-900/20 border-t-4 border-t-amber-600 bg-white p-6 shadow-sm sm:p-7">
          <h2 className="font-serif text-2xl font-semibold text-primary">
            Brochure and photos
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Upload a PDF brochure and one or more project photos.
          </p>

          <div className="mt-7 grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <FileInput
              label="Brochure (PDF)"
              accept="application/pdf"
              file={form.brochure}
              onChange={(file) => updateField("brochure", file)}
              error={errors.brochure}
              hint="PDF up to 5 MB"
            />

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-800">
                Photos
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png"
                multiple
                onChange={(event) =>
                  updateField(
                    "photos",
                    Array.from(event.target.files ?? []).slice(0, 12),
                  )
                }
                className="block w-full rounded-lg border border-amber-900/20 bg-white px-3 py-2 text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-amber-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary hover:file:bg-amber-100"
              />
              <p className="mt-1.5 text-xs text-gray-400">
                {form.photos.length > 0
                  ? `${form.photos.length} photo(s) selected`
                  : "JPEG or PNG, up to 12 files, 5 MB each"}
              </p>
            </div>
          </div>

          {form.photos.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-3">
              {form.photos.map((photo, index) => (
                <div
                  key={`${photo.name}-${index}`}
                  className="relative h-24 w-24 overflow-hidden rounded-lg border border-amber-900/10"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={URL.createObjectURL(photo)}
                    alt={photo.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {submissionError && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {submissionError}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => router.push("/projects")}
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
            {submitting ? "Creating..." : "Create Project"}
          </button>
        </div>
      </form>
    </AdminLayout>
  );
}

function FormInput({
  label,
  required = false,
  value,
  onChange,
  error,
  helper,
}: {
  label: string;
  required?: boolean;
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
        type="text"
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

function FileInput({
  label,
  accept,
  file,
  onChange,
  error,
  hint,
}: {
  label: string;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
  error?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-gray-800">
        {label}
      </label>
      <input
        type="file"
        accept={accept}
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        className={`block w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-amber-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary hover:file:bg-amber-100 ${
          error ? "border-red-400" : "border-amber-900/20"
        }`}
      />
      <p className="mt-1.5 text-xs text-gray-400">
        {file ? file.name : hint}
      </p>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
