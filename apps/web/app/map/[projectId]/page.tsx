"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import BrochureFlipbook from "../../../components/map/BrochureFlipbook";
import PlotMap from "../../../components/map/PlotMap";
import { api } from "../../../lib/api";
import type { Project } from "../../../types/project";

const statusLabels: Record<string, string> = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  SOLD: "Sold",
  BLOCKED: "Blocked",
  HOLD: "On hold",
  NOT_FOR_SALE: "Not for sale",
};

export default function PublicMapPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;

  const [project, setProject] = useState<Project | null>(null);
  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);
  const [brochureOpen, setBrochureOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    let isCurrent = true;
    setLoading(true);
    setError(null);

    api
      .get<{ data?: Project }>(`/public/projects/${projectId}`)
      .then(({ data }) => {
        if (isCurrent) setProject(data.data ?? null);
      })
      .catch(() => {
        if (isCurrent) setError("This map is not available.");
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [projectId]);

  const selectedPlot = useMemo(
    () =>
      project?.plots.find((plot) => plot.id === selectedPlotId) ?? null,
    [project, selectedPlotId],
  );

  const societyImageSource = project?.societyDrawing?.imageUrl
    ? `/api/v1${project.societyDrawing.imageUrl}`
    : project?.societyDrawing?.imageDataUrl ?? undefined;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <p className="text-sm text-gray-500">Loading map...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <div className="text-center">
          <h1 className="font-serif text-xl font-semibold text-primary">
            Map unavailable
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {error ?? "This project could not be found."}
          </p>
        </div>
      </div>
    );
  }

  const noop = () => {};

  return (
    <div className="flex h-screen flex-col bg-bg">
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-amber-900/10 bg-white px-4 sm:px-6">
        <div className="min-w-0">
          <p className="truncate font-serif text-lg font-semibold text-primary">
            {project.name}
          </p>
          <p className="truncate text-xs text-gray-500">
            {[project.city, project.state].filter(Boolean).join(", ") ||
              "Layout map"}
            {project.plots.length > 0
              ? ` · ${project.plots.length} plots`
              : ""}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {project.brochure ? (
            <button
              type="button"
              onClick={() => setBrochureOpen(true)}
              className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-white transition hover:bg-primary/90"
            >
              Brochure
            </button>
          ) : null}

          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            View only
          </span>
        </div>
      </header>

      <div className="relative flex-1">
        <PlotMap
          latitude={project.latitude}
          longitude={project.longitude}
          plots={project.plots}
          selectedPlotId={selectedPlotId}
          onPlotClick={setSelectedPlotId}
          onPlotGeometryChange={noop}
          drawingMode={false}
          boundaryCoordinates={[]}
          societyBoundary={project.societyBoundary}
          boundaryDrawingMode={false}
          societyBoundaryDraftCoordinates={[]}
          detectedPlotCoordinates={[]}
          templatePlacementMode={false}
          templatePreviewCoordinates={null}
          plotMoveMode={false}
          pasteMode={false}
          facilityPlacementMode={false}
          cursorCoordinate={null}
          imageMoveMode={false}
          societyDrawing={project.societyDrawing}
          societyImageSource={societyImageSource}
          showSocietyPlan={Boolean(project.societyDrawing)}
          planZoomRequest={project.societyDrawing || project.societyBoundary ? 1 : 0}
          onCoordinateSelect={noop}
          onBoundaryCoordinateSelect={noop}
          onCursorMove={noop}
          onCursorExit={noop}
          onTemplatePlace={noop}
          onTemplateMove={noop}
          onPlotMove={noop}
          onPlotMovePreview={noop}
          onPaste={noop}
          onFacilityPlace={noop}
          onFacilityMove={noop}
          onPlotRotate={noop}
          facilities={project.facilityLabels ?? []}
          selectedFacilityId={null}
          onImageMove={noop}
          readOnly
        />

        {selectedPlot && (
          <section className="absolute bottom-5 left-5 z-[200] w-[260px] rounded-2xl bg-white p-5 text-gray-900 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Plot
                </p>
                <h2 className="text-lg font-bold">{selectedPlot.plotNo}</h2>
              </div>

              <button
                type="button"
                aria-label="Close details"
                onClick={() => setSelectedPlotId(null)}
                className="rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Status</dt>
                <dd className="font-medium">
                  {statusLabels[selectedPlot.status] ?? selectedPlot.status}
                </dd>
              </div>

              {selectedPlot.areaSqft ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">Area</dt>
                  <dd className="font-medium">
                    {selectedPlot.areaSqft.toLocaleString()} sq.ft
                  </dd>
                </div>
              ) : null}

              {selectedPlot.facing ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-gray-500">Facing</dt>
                  <dd className="font-medium">{selectedPlot.facing}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        )}
      </div>

      {brochureOpen && project.brochure ? (
        <BrochureFlipbook
          url={`/api/v1${project.brochure.url}`}
          title={project.brochure.originalName || `${project.name} brochure`}
          onClose={() => setBrochureOpen(false)}
        />
      ) : null}
    </div>
  );
}
