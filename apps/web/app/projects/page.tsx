"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ApiResponse } from "@mohan-bagh/shared";

import { api } from "../../lib/api";
import AdminLayout from "../../components/admin/AdminLayout";
import type { ProjectSummary } from "../../types/project";

interface CurrentUser {
  id: string;
  name: string;
  role: string;
  userCode: string | null;
}

interface ProjectListResponse {
  items: ProjectSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function ProjectsPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ApiResponse<CurrentUser>>("/auth/me")
      .then(({ data }) => setUser(data.data ?? null))
      .catch(() => setUser(null));
  }, []);

  const loadProjects = useCallback(async (query: string) => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get<ApiResponse<ProjectListResponse>>(
        "/admin/projects",
        { params: { limit: 100, search: query || undefined } },
      );
      setProjects(data.data?.items ?? []);
    } catch {
      setError("Unable to load projects. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadProjects(search.trim());
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [search, loadProjects]);

  async function deleteProject(project: ProjectSummary) {
    if (
      !window.confirm(
        `Delete "${project.name}"? This cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      setDeletingId(project.id);
      await api.delete(`/admin/projects/${project.id}`);
      setProjects((items) => items.filter((item) => item.id !== project.id));
    } catch {
      setError("Unable to delete the project. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AdminLayout user={user}>
      <section>
        <p className="text-sm text-gray-500">Project management</p>

        <div className="mt-1 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-primary sm:text-3xl">
              Projects
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
              Create projects with a name, details, brochure, and photos, then
              open the plot editor to draw the layout.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/projects/create")}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
          >
            + Create Project
          </button>
        </div>
      </section>

      <section className="mt-6">
        <div className="relative w-full sm:max-w-md">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search projects..."
            className="w-full rounded-lg border border-amber-900/15 bg-white px-4 py-2.5 text-sm outline-none transition placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
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

      {loading ? (
        <p className="mt-10 text-center text-sm text-gray-500">
          Loading projects...
        </p>
      ) : projects.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-amber-900/20 bg-white p-12 text-center">
          <p className="text-sm font-medium text-gray-700">
            No projects yet
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Create your first project to get started.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {projects.map((project) => (
            <article
              key={project.id}
              className="overflow-hidden rounded-2xl border border-amber-900/10 bg-white shadow-sm transition hover:border-amber-900/20 hover:shadow-md md:flex md:h-56"
            >
              <div className="flex h-44 shrink-0 items-center justify-center bg-amber-50/60 md:h-full md:w-64">
                {project.coverPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/v1${project.coverPhotoUrl}`}
                    alt={project.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-sm text-gray-400">No photo</span>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-serif text-lg font-semibold text-gray-900">
                      {project.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {[project.city, project.state]
                        .filter(Boolean)
                        .join(", ") || "No location"}
                    </p>
                  </div>

                  {project.hasBrochure && (
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      Brochure
                    </span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-600">
                  <span className="rounded-full bg-amber-50 px-3 py-1.5">
                    {project.plotCount} plots
                  </span>
                  <span className="rounded-full bg-amber-50 px-3 py-1.5">
                    {project.photoCount} photos
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap gap-2 border-t border-amber-900/10 pt-4">
                  <Link
                    href={`/projects/${project.id}`}
                    className="w-full rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-medium text-white transition hover:opacity-90 sm:w-auto"
                  >
                    Open editor
                  </Link>

                  <Link
                    href={`/projects/${project.id}/manage`}
                    className="flex-1 rounded-lg border border-amber-900/15 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-amber-50 sm:flex-none"
                  >
                    Manage
                  </Link>

                  <Link
                    href={`/projects/${project.id}/plots`}
                    className="flex-1 rounded-lg border border-amber-900/15 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-amber-50 sm:flex-none"
                  >
                    Plots
                  </Link>

                  <button
                    type="button"
                    disabled={deletingId === project.id}
                    onClick={() => void deleteProject(project)}
                    className="flex-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                  >
                    {deletingId === project.id ? "..." : "Delete"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
