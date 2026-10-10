"use client";

import {
  useEffect,
  useRef,
} from "react";

import { useMap } from "@vis.gl/react-google-maps";

import type {
  SocietyBoundary,
  SocietyDrawing,
} from "@/types/project";

interface PlanBoundsFitterProps {
  drawing?: SocietyDrawing;
  boundary?: SocietyBoundary;
  request: number;
}

export default function PlanBoundsFitter({
  drawing,
  boundary,
  request,
}: PlanBoundsFitterProps) {
  const map = useMap();
  const handledRequest = useRef(0);

  useEffect(() => {
    if (
      !map ||
      request === 0 ||
      typeof google === "undefined"
    ) {
      return;
    }

    if (handledRequest.current === request) {
      return;
    }

    const bounds = new google.maps.LatLngBounds();

    const coordinates = [
      ...(drawing
        ? getTransformedDrawingCorners(drawing)
        : []),
      ...(boundary?.coordinates ?? []),
    ];

    if (coordinates.length === 0) {
      return;
    }

    coordinates.forEach((corner) => {
      bounds.extend(corner);
    });

    map.fitBounds(bounds, 22);
    handledRequest.current = request;
  }, [map, drawing, boundary, request]);

  return null;
}

function getTransformedDrawingCorners(
  drawing: SocietyDrawing
) {
  const center = drawing.corners.reduce(
    (total, corner) => ({
      lat:
        total.lat + corner.lat / drawing.corners.length,
      lng:
        total.lng + corner.lng / drawing.corners.length,
    }),
    { lat: 0, lng: 0 }
  );
  const scale = drawing.scale ?? 1;
  const radians =
    ((drawing.rotation ?? 0) * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const longitudeScale =
    111_320 *
    Math.cos(center.lat * (Math.PI / 180));

  return drawing.corners.map((corner) => {
    const eastMeters =
      (corner.lng - center.lng) *
      longitudeScale *
      scale;
    const northMeters =
      (corner.lat - center.lat) *
      111_320 *
      scale;

    return {
      lat:
        center.lat +
        (eastMeters * sine + northMeters * cosine) /
          111_320,
      lng:
        center.lng +
        (eastMeters * cosine - northMeters * sine) /
          longitudeScale,
    };
  });
}
