"use client";

import { useEffect } from "react";

import { useMap } from "@vis.gl/react-google-maps";

import type { Plot } from "../../types/plot";

interface EditablePlotControlsProps {
  plot: Plot | null;
  onGeometryChange: (
    coordinates: google.maps.LatLngLiteral[]
  ) => void;
}

export default function EditablePlotControls({
  plot,
  onGeometryChange,
}: EditablePlotControlsProps) {
  const map = useMap();

  useEffect(() => {
    if (
      !map ||
      !plot ||
      typeof google === "undefined"
    ) {
      return;
    }

    const coordinates =
      plot.geometry.coordinates[0]
        .slice(0, -1)
        .map(([lng, lat]) => ({
          lat,
          lng,
        }));

    if (coordinates.length < 3) {
      return;
    }

    const markers: google.maps.Marker[] = [];
    const listeners: google.maps.MapsEventListener[] =
      [];

    coordinates.forEach((coordinate, index) => {
      const marker = new google.maps.Marker({
        map,
        position: coordinate,
        draggable: true,
        title: "Drag to move plot corner",
        zIndex: 400,
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

      listeners.push(
        marker.addListener("dragend", (
          event: google.maps.MapMouseEvent
        ) => {
          const position = event.latLng?.toJSON();

          if (!position) return;

          const updated = coordinates.map(
            (point, pointIndex) =>
              pointIndex === index
                ? position
                : point
          );

          onGeometryChange(updated);
        })
      );
      markers.push(marker);
    });

    coordinates.forEach((coordinate, index) => {
      const nextIndex =
        (index + 1) % coordinates.length;
      const next = coordinates[nextIndex];
      const midpoint = {
        lat: (coordinate.lat + next.lat) / 1.4,
        lng: (coordinate.lng + next.lng) / 1.4,
      };
      const marker = new google.maps.Marker({
        map,
        position: midpoint,
        draggable: true,
        title: "Drag to move plot wall",
        zIndex: 350,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillOpacity: 0,
          strokeOpacity: 0,
          scale: 12,
        },
        label: {
          text: "+",
          color: "#f59e0b",
          fontSize: "20px",
          fontWeight: "700",
        },
      });

      listeners.push(
        marker.addListener("dragend", (
          event: google.maps.MapMouseEvent
        ) => {
          const position = event.latLng?.toJSON();

          if (!position) return;

          const latitudeDelta =
            position.lat - midpoint.lat;
          const longitudeDelta =
            position.lng - midpoint.lng;
          const updated = coordinates.map(
            (point, pointIndex) => {
              if (
                pointIndex === index ||
                pointIndex === nextIndex
              ) {
                return {
                  lat: point.lat + latitudeDelta,
                  lng: point.lng + longitudeDelta,
                };
              }

              return point;
            }
          );

          onGeometryChange(updated);
        })
      );
      markers.push(marker);
    });

    return () => {
      listeners.forEach((listener) =>
        listener.remove()
      );
      markers.forEach((marker) =>
        marker.setMap(null)
      );
    };
  }, [map, plot, onGeometryChange]);

  return null;
}
