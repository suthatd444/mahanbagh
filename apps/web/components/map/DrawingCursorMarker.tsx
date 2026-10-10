"use client";

import { useEffect } from "react";

import { useMap } from "@vis.gl/react-google-maps";

interface DrawingCursorMarkerProps {
  coordinate: google.maps.LatLngLiteral | null;
}

export default function DrawingCursorMarker({
  coordinate,
}: DrawingCursorMarkerProps) {
  const map = useMap();

  useEffect(() => {
    if (
      !map ||
      !coordinate ||
      typeof google === "undefined"
    ) {
      return;
    }

    const marker = new google.maps.Marker({
      map,
      position: coordinate,
      clickable: false,
      zIndex: 300,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillOpacity: 0,
        strokeOpacity: 0,
        scale: 12,
      },
      label: {
        text: "+",
        color: "#2563eb",
        fontSize: "20px",
        fontWeight: "700",
      },
    });

    return () => {
      marker.setMap(null);
    };
  }, [map, coordinate]);

  return null;
}
