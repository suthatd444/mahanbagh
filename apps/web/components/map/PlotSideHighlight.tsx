"use client";

import { useEffect } from "react";

import { useMap } from "@vis.gl/react-google-maps";

interface PlotSideHighlightProps {
  coordinates: google.maps.LatLngLiteral[] | null;
}

export default function PlotSideHighlight({
  coordinates,
}: PlotSideHighlightProps) {
  const map = useMap();

  useEffect(() => {
    if (
      !map ||
      typeof google === "undefined" ||
      !coordinates ||
      coordinates.length < 2
    ) {
      return;
    }

    const highlight = new google.maps.Polyline({
      path: coordinates,
      strokeColor: "#facc15",
      strokeOpacity: 1,
      strokeWeight: 6,
      clickable: false,
      zIndex: 500,
    });

    highlight.setMap(map);

    const endpoints = coordinates.map(
      (coordinate) =>
        new google.maps.Marker({
          map,
          position: coordinate,
          clickable: false,
          zIndex: 501,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 5,
            fillColor: "#facc15",
            fillOpacity: 1,
            strokeColor: "#111111",
            strokeWeight: 1,
          },
        })
    );

    return () => {
      highlight.setMap(null);
      endpoints.forEach((marker) =>
        marker.setMap(null)
      );
    };
  }, [map, coordinates]);

  return null;
}
