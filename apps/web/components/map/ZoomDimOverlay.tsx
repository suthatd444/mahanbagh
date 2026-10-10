"use client";

import { useEffect, useRef, useState } from "react";

import { useMap } from "@vis.gl/react-google-maps";

import type { Plot } from "../../types/plot";
import type { SocietyBoundary } from "../../types/project";

const DIM_ZOOM_THRESHOLD = 21;
const DIM_OPACITY = "0.65";

interface ZoomDimOverlayProps {
  boundary: SocietyBoundary | null;

  selectedPlot: Plot | null;

  enabled: boolean;
}

export default function ZoomDimOverlay({
  boundary,
  selectedPlot,
  enabled,
}: ZoomDimOverlayProps) {
  const map = useMap();

  const [zoom, setZoom] = useState<number | null>(null);

  const overlayRef =
    useRef<google.maps.OverlayView | null>(null);

  const elementRef =
    useRef<HTMLDivElement | null>(null);

  const boundaryRef = useRef(boundary);
  const plotRef = useRef(selectedPlot);
  const activeRef = useRef(false);

  boundaryRef.current = boundary;
  plotRef.current = selectedPlot;

  const active =
    Boolean(map) &&
    enabled &&
    (zoom ?? 0) >= DIM_ZOOM_THRESHOLD &&
    Boolean(boundary || selectedPlot);

  activeRef.current = active;

  useEffect(() => {
    if (!map) {
      return;
    }

    const update = () => {
      setZoom(map.getZoom() ?? 0);
    };

    update();

    const listener =
      google.maps.event.addListener(
        map,
        "zoom_changed",
        update
      );

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map]);

  useEffect(() => {
    if (
      !map ||
      typeof google === "undefined" ||
      (!boundary && !selectedPlot)
    ) {
      return;
    }

    class DimOverlay extends google.maps.OverlayView {
      private element: HTMLDivElement | null = null;

      onAdd() {
        this.element = document.createElement("div");
        Object.assign(this.element.style, {
          pointerEvents: "none",
          position: "absolute",
          opacity: activeRef.current
            ? DIM_OPACITY
            : "0",
          transition: "opacity 300ms ease",
        });

        elementRef.current = this.element;

        this.getPanes()?.floatPane.appendChild(
          this.element
        );
      }

      draw() {
        if (!this.element) {
          return;
        }

        const projection = this.getProjection();
        const instance = this.getMap();
        const bounds =
          instance && "getBounds" in instance
            ? instance.getBounds()
            : null;

        if (!projection || !bounds) {
          return;
        }

        const corners = [
          bounds.getNorthEast(),
          bounds.getSouthWest(),
          {
            lat: bounds.getNorthEast().lat(),
            lng: bounds.getSouthWest().lng(),
          },
          {
            lat: bounds.getSouthWest().lat(),
            lng: bounds.getNorthEast().lng(),
          },
        ]
          .map((coordinate) =>
            projection.fromLatLngToDivPixel(coordinate)
          )
          .filter(
            (
              point
            ): point is google.maps.Point =>
              Boolean(point)
          );

        if (corners.length < 4) {
          return;
        }

        const minimumX = Math.min(
          ...corners.map((point) => point.x)
        );
        const maximumX = Math.max(
          ...corners.map((point) => point.x)
        );
        const minimumY = Math.min(
          ...corners.map((point) => point.y)
        );
        const maximumY = Math.max(
          ...corners.map((point) => point.y)
        );

        this.element.style.left = `${minimumX}px`;
        this.element.style.top = `${minimumY}px`;
        this.element.style.width = `${maximumX - minimumX}px`;
        this.element.style.height = `${maximumY - minimumY}px`;

        const holes: {
          points: google.maps.Point[];
          stroke: string;
          strokeWidth: number;
        }[] = [];

        const boundaryCoordinates =
          boundaryRef.current?.coordinates ?? [];

        if (boundaryCoordinates.length >= 3) {
          const points = boundaryCoordinates
            .map((coordinate) =>
              projection.fromLatLngToDivPixel(coordinate)
            )
            .filter(
              (
                point
              ): point is google.maps.Point =>
                Boolean(point)
            );

          if (points.length >= 3) {
            holes.push({
              points,
              stroke: "#1e3a8a",
              strokeWidth: 3,
            });
          }
        }

        const plotRing =
          plotRef.current?.geometry.coordinates[0] ?? [];

        if (plotRing.length >= 3) {
          const points = plotRing
            .map(([lng, lat]) =>
              projection.fromLatLngToDivPixel({ lat, lng })
            )
            .filter(
              (
                point
              ): point is google.maps.Point =>
                Boolean(point)
            );

          if (points.length >= 3) {
            holes.push({
              points,
              stroke: "#111111",
              strokeWidth: 2,
            });
          }
        }

        const toPath = (
          points: google.maps.Point[]
        ) =>
          points
            .map(
              (point) =>
                `${point.x - minimumX},${point.y - minimumY}`
            )
            .join(" ");

        const width = maximumX - minimumX;
        const height = maximumY - minimumY;
        const maskId = `dim-mask-${Math.random()
          .toString(36)
          .slice(2)}`;

        const svg =
          document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg"
          );
        svg.setAttribute("width", String(width));
        svg.setAttribute("height", String(height));
        svg.setAttribute(
          "viewBox",
          `0 0 ${width} ${height}`
        );

        const defs = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "defs"
        );
        const mask = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "mask"
        );
        mask.setAttribute("id", maskId);

        const maskRect = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "rect"
        );
        maskRect.setAttribute("x", "0");
        maskRect.setAttribute("y", "0");
        maskRect.setAttribute("width", String(width));
        maskRect.setAttribute("height", String(height));
        maskRect.setAttribute("fill", "white");
        mask.appendChild(maskRect);

        holes.forEach((hole) => {
          const maskPath = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "polygon"
          );
          maskPath.setAttribute(
            "points",
            toPath(hole.points)
          );
          maskPath.setAttribute("fill", "black");
          mask.appendChild(maskPath);
        });

        defs.appendChild(mask);
        svg.appendChild(defs);

        const dimRect = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "rect"
        );
        dimRect.setAttribute("x", "0");
        dimRect.setAttribute("y", "0");
        dimRect.setAttribute("width", String(width));
        dimRect.setAttribute("height", String(height));
        dimRect.setAttribute("fill", "black");
        dimRect.setAttribute(
          "mask",
          `url(#${maskId})`
        );
        svg.appendChild(dimRect);

        holes.forEach((hole) => {
          const outline = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "polygon"
          );
          outline.setAttribute(
            "points",
            toPath(hole.points)
          );
          outline.setAttribute("fill", "none");
          outline.setAttribute("stroke", hole.stroke);
          outline.setAttribute(
            "stroke-width",
            String(hole.strokeWidth)
          );
          svg.appendChild(outline);
        });

        this.element.replaceChildren(svg);
      }

      onRemove() {
        if (elementRef.current === this.element) {
          elementRef.current = null;
        }

        this.element?.remove();
        this.element = null;
      }
    }

    const overlay = new DimOverlay();
    overlay.setMap(map);
    overlayRef.current = overlay;

    return () => {
      overlay.setMap(null);

      if (overlayRef.current === overlay) {
        overlayRef.current = null;
      }

      if (elementRef.current) {
        elementRef.current.remove();
        elementRef.current = null;
      }
    };
  }, [map, boundary, selectedPlot]);

  useEffect(() => {
    if (elementRef.current) {
      elementRef.current.style.opacity = active
        ? DIM_OPACITY
        : "0";
    }
  }, [active]);

  return null;
}
