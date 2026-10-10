"use client";

import { useEffect } from "react";

import { useMap } from "@vis.gl/react-google-maps";

import type { SocietyBoundary } from "@/types/project";

interface SocietyBoundaryLayerProps {
  boundary: SocietyBoundary;
}

export default function SocietyBoundaryLayer({
  boundary,
}: SocietyBoundaryLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (
      !map ||
      typeof google === "undefined" ||
      boundary.coordinates.length < 3
    ) {
      return;
    }

    class BoundaryOverlay extends google.maps.OverlayView {
      private element: HTMLDivElement | null = null;

      onAdd() {
        this.element = document.createElement("div");
        Object.assign(this.element.style, {
          pointerEvents: "none",
          position: "absolute",
        });

        this.getPanes()?.mapPane.appendChild(
          this.element
        );
      }

      draw() {
        if (!this.element) {
          return;
        }

        const projection = this.getProjection();
        const points = boundary.coordinates
          .map((coordinate) =>
            projection.fromLatLngToDivPixel(coordinate)
          )
          .filter(
            (
              point
            ): point is google.maps.Point =>
              Boolean(point)
          );

        if (points.length < 3) {
          return;
        }

        const minimumX = Math.min(
          ...points.map((point) => point.x)
        );
        const maximumX = Math.max(
          ...points.map((point) => point.x)
        );
        const minimumY = Math.min(
          ...points.map((point) => point.y)
        );
        const maximumY = Math.max(
          ...points.map((point) => point.y)
        );
        const width = maximumX - minimumX;
        const height = maximumY - minimumY;

        this.element.style.left = `${minimumX}px`;
        this.element.style.top = `${minimumY}px`;
        this.element.style.width = `${width}px`;
        this.element.style.height = `${height}px`;

        const svg = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg"
        );
        svg.setAttribute("width", String(width));
        svg.setAttribute("height", String(height));
        svg.setAttribute(
          "viewBox",
          `0 0 ${width} ${height}`
        );
        const polygon = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "polygon"
        );
        polygon.setAttribute(
          "points",
          points
            .map(
              (point) =>
                `${point.x - minimumX},${point.y - minimumY}`
            )
            .join(" ")
        );
        polygon.setAttribute("fill", boundary.color);
        polygon.setAttribute("stroke", "#1e3a8a");
        polygon.setAttribute("stroke-width", "3");
        polygon.setAttribute(
          "vector-effect",
          "non-scaling-stroke"
        );
        svg.appendChild(polygon);
        this.element.replaceChildren(svg);
      }

      onRemove() {
        this.element?.remove();
        this.element = null;
      }
    }

    const overlay = new BoundaryOverlay();
    overlay.setMap(map);

    return () => {
      overlay.setMap(null);
    };
  }, [map, boundary]);

  return null;
}
