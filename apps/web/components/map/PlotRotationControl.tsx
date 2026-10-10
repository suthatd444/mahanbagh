"use client";

import { useEffect } from "react";

import { useMap } from "@vis.gl/react-google-maps";

interface PlotRotationControlProps {
  coordinates: google.maps.LatLngLiteral[] | null;

  onRotate: () => void;
}

export default function PlotRotationControl({
  coordinates,
  onRotate,
}: PlotRotationControlProps) {
  const map = useMap();

  useEffect(() => {
    if (
      !map ||
      !coordinates ||
      coordinates.length < 3 ||
      typeof google === "undefined"
    ) {
      return;
    }

    const center = coordinates.reduce(
      (total, coordinate) => ({
        lat:
          total.lat +
          coordinate.lat / coordinates.length,
        lng:
          total.lng +
          coordinate.lng / coordinates.length,
      }),
      { lat: 0, lng: 0 }
    );
    const marker = new google.maps.Marker({
      map,
      position: {
        lat: center.lat + 12 / 111_320,
        lng: center.lng,
      },
      title: "Rotate plot 15 degrees",
      zIndex: 330,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: "#ffffff",
        fillOpacity: 1,
        strokeColor: "#2563eb",
        strokeWeight: 2,
        scale: 14,
      },
      label: {
        text: "⟳",
        color: "#2563eb",
        fontSize: "20px",
        fontWeight: "700",
      },
    });
    const listener = marker.addListener(
      "click",
      onRotate
    );

    return () => {
      listener.remove();
      marker.setMap(null);
    };
  }, [map, coordinates, onRotate]);

  return null;
}
