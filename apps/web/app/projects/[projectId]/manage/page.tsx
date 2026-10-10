"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { ApiResponse } from "@mohan-bagh/shared";

import AdminLayout from "../../../../components/admin/AdminLayout";
import { api } from "../../../../lib/api";
import type { Project, ProjectDocument } from "../../../../types/project";

interface CurrentUser {
  id: string;
  name: string;
  role: string;
  userCode: string | null;
}

interface MetaForm {
  name: string;
  code: string;
  description: string;
  address: string;
  city: string;
  state: string;
  latitude: string;
  longitude: string;
}

const emptyMeta: MetaForm = {
  name: "",
  code: "",
  description: "",
  address: "",
  city: "",
  state: "",
  latitude: "",
  longitude: "",
};

function documentHref(url: string) {
  return `/api/v1${url}`;
}

export default function ManageProjectPage() {
  const router = useRouter();
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [meta, setMeta] = useState<MetaForm>(emptyMeta);
  const [brochure, setBrochure] = useState<ProjectDocument | null>(null);
  const [photos, setPhotos] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ApiResponse<CurrentUser>>("/auth/me")
      .then(({ data }) => setUser(data.data ?? null))
      .catch(() => setUser(null));
  }, []);

  const loadProject = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get<ApiResponse<Project>>(
        `/admin/projects/${projectId}`,
      );
      const project = data.data;
      if (!project) throw new Error("missing");
      setMeta({
        name: project.name ?? "",
        code: project.code ?? "",
        description: project.description ?? "",
        address: project.address ?? "",
        city: project.city ?? "",
        state: project.state ?? "",
        latitude: String(project.latitude ?? ""),
        longitude: String(project.longitude ?? ""),
      });
      setBrochure(project.brochure ?? null);
      setPhotos(project.photos ?? []);
    } catch {
      setError("Unable to load this project.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  function updateField(field: keyof MetaForm, value: string) {
    setMeta((previous) => ({ ...previous, [field]: value }));
  }

  async function saveMeta(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId) return;
    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      await api.patch(`/admin/projects/${projectId}`, meta);
      setMessage("Project details saved.");
    } catch {
      setError("Unable to save the project details.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadFiles(files: FileList | null, kind: "PHOTO" | "BROCHURE") {
    if (!projectId || !files || files.length === 0) return;
    try {
      setUploading(true);
      setError(null);
      setMessage(null);
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("kind", kind);
        body.append("file", file);
        await api.post(`/admin/projects/${projectId}/documents`, body);
      }
      await loadProject();
      setMessage(kind === "BROCHURE" ? "Brochure updated." : "Photos added.");
    } catch {
      setError("Unable to upload the file(s).");
    } finally {
      setUploading(false);
    }
  }

  async function deleteDocument(documentId: string) {
    if (!projectId) return;
    if (!window.confirm("Delete this file?")) return;
    try {
      await api.delete(
        `/admin/projects/${projectId}/documents/${documentId}`,
      );
      if (brochure?.id === documentId) setBrochure(null);
      setPhotos((items) => items.filter((item) => item.id !== documentId));
    } catch {
      setError("Unable to delete the file.");
    }
  }

  async function deleteProject() {
    if (!projectId) return;
    if (!window.confirm("Delete this project? This cannot be undone.")) return;
    try {
      await api.delete(`/admin/projects/${projectId}`);
      router.push("/projects");
    } catch {
      setError("Unable to delete the project.");
    }
  }

  return (
    <AdminLayout user={user}>
      <section>
        <p className="text-sm text-gray-500">Project management</p>
        <div className="mt-1 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="mt-1 font-serif text-2xl font-semibold text-primary sm:text-3xl">
              {meta.name || "Project"}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Update details, manage the brochure and photos, or open the plot
              editor.
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
              href={`/projects/${projectId}/plots`}
              className="rounded-lg border border-amber-900/15 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-amber-50"
            >
              Plots &amp; enquiries
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
      ) : (
        <>
          <form
            onSubmit={saveMeta}
            className="mt-6 rounded-2xl border border-amber-900/20 border-t-4 border-t-amber-600 bg-white p-6 shadow-sm sm:p-7"
          >
            <h2 className="font-serif text-2xl font-semibold text-primary">
              Project details
            </h2>
            <div className="mt-7 grid gap-x-6 gap-y-5 sm:grid-cols-2">
              <FormInput label="Name" value={meta.name} onChange={(value) => updateField("name", value)} />
              <FormInput label="Code" value={meta.code} onChange={(value) => updateField("code", value.toUpperCase())} />
              <div className="sm:col-span-2">
                <FormTextarea label="Details" value={meta.description} onChange={(value) => updateField("description", value)} />
              </div>
              <div className="sm:col-span-2">
                <FormTextarea label="Address" value={meta.address} onChange={(value) => updateField("address", value)} />
              </div>
              <FormInput label="City" value={meta.city} onChange={(value) => updateField("city", value)} />
              <FormInput label="State" value={meta.state} onChange={(value) => updateField("state", value)} />
              <FormInput label="Latitude" value={meta.latitude} onChange={(value) => updateField("latitude", value)} />
              <FormInput label="Longitude" value={meta.longitude} onChange={(value) => updateField("longitude", value)} />
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save details"}
              </button>
            </div>
          </form>

          <section className="mt-6 rounded-2xl border border-amber-900/20 border-t-4 border-t-amber-600 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl font-semibold text-primary">
                  Brochure
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Upload a PDF brochure for this project.
                </p>
              </div>
              <input
                type="file"
                accept="application/pdf"
                disabled={uploading}
                onChange={(event) =>
                  void uploadFiles(event.target.files, "BROCHURE")
                }
                className="rounded-lg border border-amber-900/20 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-amber-50 file:px-3 file:py-1.5 file:font-medium file:text-primary"
              />
            </div>

            {brochure ? (
              <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                <a
                  href={documentHref(brochure.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {brochure.originalName}
                </a>
                <button
                  type="button"
                  onClick={() => void deleteDocument(brochure.id)}
                  className="text-sm font-medium text-red-700 hover:underline"
                >
                  Delete
                </button>
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500">No brochure uploaded.</p>
            )}
          </section>

          <section className="mt-6 rounded-2xl border border-amber-900/20 border-t-4 border-t-amber-600 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl font-semibold text-primary">
                  Photos
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Upload JPEG or PNG photos. {photos.length} photo(s).
                </p>
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png"
                multiple
                disabled={uploading}
                onChange={(event) =>
                  void uploadFiles(event.target.files, "PHOTO")
                }
                className="rounded-lg border border-amber-900/20 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-amber-50 file:px-3 file:py-1.5 file:font-medium file:text-primary"
              />
            </div>

            {photos.length > 0 ? (
              <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="group relative overflow-hidden rounded-lg border border-amber-900/10"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={documentHref(photo.url)}
                      alt={photo.originalName}
                      className="h-32 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => void deleteDocument(photo.id)}
                      className="absolute right-2 top-2 rounded bg-white/90 px-2 py-1 text-xs font-medium text-red-700 opacity-0 transition group-hover:opacity-100"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500">No photos uploaded.</p>
            )}
          </section>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => void deleteProject()}
              className="rounded-lg border border-red-200 bg-white px-5 py-3 text-sm font-medium text-red-700 transition hover:bg-red-50"
            >
              Delete project
            </button>
          </div>
        </>
      )}
    </AdminLayout>
  );
}

function FormInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-gray-800">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-lg border border-amber-900/20 bg-white px-3.5 text-sm text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
      />
    </div>
  );
}

function FormTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-gray-800">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="w-full resize-y rounded-xl border border-amber-900/20 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
      />
    </div>
  );
}
