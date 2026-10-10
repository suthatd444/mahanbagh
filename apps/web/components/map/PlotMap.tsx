"use client";

import {
  APIProvider,
  Map,
} from "@vis.gl/react-google-maps";

import PlotLayer from "./PlotLayer";

import SelectedPlotOverlay from "./SelectedPlotOverlay";
import SocietyBoundaryPreview from "./SocietyBoundaryPreview";
import SocietyImageOverlay from "./SocietyImageOverlay";
import DrawingCursorMarker from "./DrawingCursorMarker";
import EditablePlotControls from "./EditablePlotControls";
import TemplatePlotPlacementControl from "./TemplatePlotPlacementControl";
import PlotRotationControl from "./PlotRotationControl";
import SocietyBoundaryLayer from "./SocietyBoundaryLayer";
import PlotLabels from "./PlotLabels";
import PlotSideHighlight from "./PlotSideHighlight";
import FacilityLabels from "./FacilityLabels";
import PlanBoundsFitter from "./PlanBoundsFitter";
import ZoomDimOverlay from "./ZoomDimOverlay";

import { Plot } from "../../types/plot";
import type {
  SocietyDrawing,
  SocietyBoundary,
  FacilityLabel,
} from "../../types/project";

const DRAWING_CURSOR =
  'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27%3E%3Ccircle cx=%2712%27 cy=%2712%27 r=%279%27 fill=%27white%27 stroke=%27%232563eb%27 stroke-width=%272%27/%3E%3Cpath d=%27M12 7v10M7 12h10%27 stroke=%27%232563eb%27 stroke-width=%272.5%27/%3E%3C/svg%3E") 12 12, crosshair';

interface PlotMapProps {
  latitude: number;

  longitude: number;

  plots: Plot[];

  selectedPlotId:
    | string
    | null;

  onPlotClick: (
    plotId: string
  ) => void;

  onPlotGeometryChange: (
    coordinates: google.maps.LatLngLiteral[]
  ) => void;

  drawingMode: boolean;

  boundaryCoordinates: google.maps.LatLngLiteral[];

  societyBoundary?: SocietyBoundary;

  boundaryDrawingMode: boolean;

  societyBoundaryDraftCoordinates:
    google.maps.LatLngLiteral[];

  detectedPlotCoordinates: google.maps.LatLngLiteral[][];

  templatePlacementMode: boolean;

  templatePreviewCoordinates:
    | google.maps.LatLngLiteral[]
    | null;

  plotMoveMode: boolean;

  pasteMode: boolean;

  facilityPlacementMode: boolean;

  cursorCoordinate: google.maps.LatLngLiteral | null;

  imageMoveMode: boolean;

  societyDrawing?: SocietyDrawing;

  societyImageSource?: string;

  showSocietyPlan: boolean;

  planZoomRequest: number;

  onCoordinateSelect: (
    coordinate: google.maps.LatLngLiteral
  ) => void;

  onBoundaryCoordinateSelect: (
    coordinate: google.maps.LatLngLiteral
  ) => void;

  onCursorMove: (
    coordinate: google.maps.LatLngLiteral
  ) => void;

  onCursorExit: () => void;

  onTemplatePlace: (
    coordinate: google.maps.LatLngLiteral
  ) => void;

  onTemplateMove: (
    coordinates: google.maps.LatLngLiteral[]
  ) => void;

  onPlotMove: (
    coordinates: google.maps.LatLngLiteral[]
  ) => void;

  onPlotMovePreview: (
    coordinates: google.maps.LatLngLiteral[]
  ) => void;

  onPaste: (
    coordinate: google.maps.LatLngLiteral
  ) => void;

  onFacilityPlace: (
    coordinate: google.maps.LatLngLiteral
  ) => void;

  onFacilityMove: (
    facilityId: string,
    coordinate: google.maps.LatLngLiteral
  ) => void;

  onPlotRotate: () => void;

  highlightedSideCoordinates?:
    | google.maps.LatLngLiteral[]
    | null;

  facilities: FacilityLabel[];

  selectedFacilityId: string | null;

  onImageMove: (
    corners: google.maps.LatLngLiteral[]
  ) => void;

  readOnly?: boolean;
}

export default function PlotMap({
  latitude,
  longitude,
  plots,
  selectedPlotId,
  onPlotClick,
  onPlotGeometryChange,
  drawingMode,
  boundaryCoordinates,
  societyBoundary,
  boundaryDrawingMode,
  societyBoundaryDraftCoordinates,
  detectedPlotCoordinates,
  templatePlacementMode,
  templatePreviewCoordinates,
  plotMoveMode,
  pasteMode,
  facilityPlacementMode,
  cursorCoordinate,
  imageMoveMode,
  societyDrawing,
  societyImageSource,
  showSocietyPlan,
  planZoomRequest,
  onCoordinateSelect,
  onBoundaryCoordinateSelect,
  onCursorMove,
  onCursorExit,
  onTemplatePlace,
  onTemplateMove,
  onPlotMove,
  onPlotMovePreview,
  onPaste,
  onFacilityPlace,
  onFacilityMove,
  onPlotRotate,
  highlightedSideCoordinates = null,
  facilities,
  selectedFacilityId,
  onImageMove,
  readOnly = false,
}: PlotMapProps) {
  return (
    <APIProvider
      apiKey={
        process.env
          .NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!
      }
    >
      <Map
        defaultCenter={{
          lat: latitude,
          lng: longitude,
        }}
        defaultZoom={17}
        maxZoom={24}
        mapTypeId="satellite"
        gestureHandling="greedy"
        draggableCursor={
          drawingMode ||
          templatePlacementMode ||
          pasteMode ||
          boundaryDrawingMode ||
          facilityPlacementMode
            ? DRAWING_CURSOR
            : undefined
        }
        className="h-full w-full"
        onClick={(event) => {
          if (!event.detail.latLng) return;

          if (pasteMode) {
            onPaste(event.detail.latLng);
            return;
          }

          if (facilityPlacementMode) {
            onFacilityPlace(event.detail.latLng);
            return;
          }

          if (templatePlacementMode) {
            onTemplatePlace(event.detail.latLng);
            return;
          }

          if (drawingMode) {
            onCoordinateSelect(
              event.detail.latLng
            );
            return;
          }

          if (boundaryDrawingMode) {
            onBoundaryCoordinateSelect(
              event.detail.latLng
            );
          }
        }}
        onMousemove={(event) => {
          if (
            (drawingMode || boundaryDrawingMode) &&
            event.detail.latLng
          ) {
            onCursorMove(
              event.detail.latLng
            );
          }
        }}
        onMouseout={() => {
          onCursorExit();
        }}
      >
        <PlanBoundsFitter
          drawing={societyDrawing}
          boundary={societyBoundary}
          request={planZoomRequest}
        />

        {societyBoundary && (
          <SocietyBoundaryLayer
            boundary={societyBoundary}
          />
        )}

        {showSocietyPlan &&
          societyDrawing &&
          societyImageSource && (
          <SocietyImageOverlay
            drawing={societyDrawing}
            imageSource={societyImageSource}
            movable={imageMoveMode}
            onMove={onImageMove}
          />
        )}

        <PlotLayer
          plots={plots}
          selectedPlotId={
            selectedPlotId
          }
          onPlotClick={
            onPlotClick
          }
          clickable={
            !drawingMode &&
            !templatePlacementMode &&
            !plotMoveMode &&
            !pasteMode &&
            !boundaryDrawingMode
          }
        />

        <FacilityLabels
          facilities={facilities}
          selectedFacilityId={selectedFacilityId}
          onMove={onFacilityMove}
        />

        <SelectedPlotOverlay
          plot={
            plots.find(
              (plot) =>
                plot.id ===
                selectedPlotId
            ) ?? null
          }
        />

        <PlotLabels
          plots={plots}
          selectedPlotId={selectedPlotId}
        />

        <PlotSideHighlight
          coordinates={highlightedSideCoordinates}
        />

        <EditablePlotControls
          plot={
            readOnly ||
            drawingMode ||
            imageMoveMode ||
            plotMoveMode ||
            templatePlacementMode ||
            templatePreviewCoordinates
              ? null
              : plots.find(
                  (plot) =>
                    plot.id === selectedPlotId
                ) ?? null
          }
          onGeometryChange={onPlotGeometryChange}
        />

        <SocietyBoundaryPreview
          coordinates={boundaryCoordinates}
          zIndex={200}
        />

        <SocietyBoundaryPreview
          coordinates={
            societyBoundaryDraftCoordinates
          }
          strokeColor="#7c3aed"
          fillColor="#a78bfa"
          fillOpacity={0.3}
          zIndex={210}
        />

        {detectedPlotCoordinates.map(
          (coordinates, index) => (
            <SocietyBoundaryPreview
              key={`detected-plot-${index}`}
              coordinates={coordinates}
              strokeColor="#16a34a"
              fillColor="#22c55e"
              fillOpacity={0.2}
              zIndex={220}
            />
          )
        )}

        {templatePreviewCoordinates && (
          <SocietyBoundaryPreview
            coordinates={templatePreviewCoordinates}
            strokeColor="#ea580c"
            fillColor="#fb923c"
            fillOpacity={0.25}
            zIndex={230}
          />
        )}

        <TemplatePlotPlacementControl
          coordinates={templatePreviewCoordinates}
          onMove={onTemplateMove}
        />

        <TemplatePlotPlacementControl
          coordinates={
            plotMoveMode
              ? getPlotCoordinates(
                  plots.find(
                    (plot) =>
                      plot.id === selectedPlotId
                  ) ?? null
                )
              : null
          }
          onMove={onPlotMove}
          onMovePreview={onPlotMovePreview}
          color="#2563eb"
          title="Drag to move plot"
        />

        <PlotRotationControl
          coordinates={
            readOnly ||
            drawingMode ||
            imageMoveMode ||
            templatePlacementMode ||
            plotMoveMode ||
            pasteMode ||
            facilityPlacementMode
              ? null
              : getPlotCoordinates(
                  plots.find(
                    (plot) =>
                      plot.id === selectedPlotId
                  ) ?? null
                )
          }
          onRotate={onPlotRotate}
        />

        {(drawingMode || boundaryDrawingMode) &&
          cursorCoordinate &&
          (drawingMode
            ? boundaryCoordinates
            : societyBoundaryDraftCoordinates
          ).length > 0 && (
            <SocietyBoundaryPreview
              coordinates={[
                (drawingMode
                  ? boundaryCoordinates
                  : societyBoundaryDraftCoordinates
                )[
                  (drawingMode
                    ? boundaryCoordinates
                    : societyBoundaryDraftCoordinates
                  ).length - 1
                ],
                cursorCoordinate,
              ]}
              strokeColor={
                boundaryDrawingMode
                  ? "#c4b5fd"
                  : "#93c5fd"
              }
              strokeWeight={2}
              zIndex={301}
            />
          )}

        <DrawingCursorMarker
          coordinate={
            drawingMode || boundaryDrawingMode
              ? cursorCoordinate
              : null
          }
        />

        <ZoomDimOverlay
          boundary={societyBoundary ?? null}
          selectedPlot={
            plots.find(
              (plot) =>
                plot.id === selectedPlotId
            ) ?? null
          }
          enabled={
            !drawingMode &&
            !boundaryDrawingMode &&
            !templatePlacementMode &&
            !plotMoveMode &&
            !pasteMode &&
            !facilityPlacementMode &&
            !imageMoveMode
          }
        />

      </Map>
    </APIProvider>
  );
}

function getPlotCoordinates(
  plot: Plot | null
): google.maps.LatLngLiteral[] | null {
  if (!plot) {
    return null;
  }

  const ring = plot.geometry.coordinates[0];

  if (ring.length < 4) {
    return null;
  }

  const firstCoordinate = ring[0];
  const lastCoordinate = ring[ring.length - 1];
  const vertices =
    firstCoordinate[0] === lastCoordinate[0] &&
    firstCoordinate[1] === lastCoordinate[1]
      ? ring.slice(0, -1)
      : ring;

  return vertices.map(([lng, lat]) => ({
    lat,
    lng,
  }));
}