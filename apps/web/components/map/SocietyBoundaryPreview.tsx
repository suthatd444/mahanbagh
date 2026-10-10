"use client";

import { useEffect } from "react";

import { useMap } from "@vis.gl/react-google-maps";

interface SocietyBoundaryPreviewProps {
  coordinates: google.maps.LatLngLiteral[];

  strokeColor?: string;

  fillColor?: string;

  fillOpacity?: number;

  strokeWeight?: number;

  zIndex?: number;
}

export default function SocietyBoundaryPreview({
  coordinates,
  strokeColor = "#2563eb",
  fillColor = "#2563eb",
  fillOpacity = 0.2,
  strokeWeight = 3,
  zIndex,
}: SocietyBoundaryPreviewProps) {
  const map = useMap();

  useEffect(() => {
    if (
      !map ||
      typeof google === "undefined" ||
      coordinates.length < 2
    ) {
      return;
    }

    const preview =
      coordinates.length >= 3
        ? new google.maps.Polygon({
            paths: coordinates,
        strokeColor,
            strokeOpacity: 1,
        strokeWeight,
        fillColor,
        fillOpacity,
            clickable: false,
        zIndex,
      })
        : new google.maps.Polyline({
        path: coordinates,
        strokeColor,
        strokeOpacity: 1,
        strokeWeight,
        clickable: false,
        zIndex,
          });

    preview.setMap(map);

    return () => {
      preview.setMap(null);
    };
  }, [
    map,
    coordinates,
    strokeColor,
    fillColor,
    fillOpacity,
    strokeWeight,
    zIndex,
  ]);

  return null;
}
