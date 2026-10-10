"use client";

import {
  useEffect,
  useRef,
} from "react";

import { useMap } from "@vis.gl/react-google-maps";

import { Plot } from "../../types/plot";

import {
  PLOT_STATUS_COLORS,
} from "../../lib/constants";

interface PlotLayerProps {
  plots: Plot[];

  selectedPlotId:
    | string
    | null;

  onPlotClick: (
    plotId: string
  ) => void;

  clickable: boolean;
}

export default function PlotLayer({
  plots,
  selectedPlotId,
  onPlotClick,
  clickable,
}: PlotLayerProps) {
  const map = useMap();

  const polygonsRef =
    useRef<
      google.maps.Polygon[]
    >([]);

  useEffect(() => {
    if (!map) return;

    // Remove previous polygons

    polygonsRef.current.forEach(
      (polygon) => {
        polygon.setMap(null);
      }
    );

    polygonsRef.current = [];

    // Create polygons

    plots.forEach((plot) => {
      const coordinates =
        plot.geometry
          .coordinates[0];

      if (
        !coordinates ||
        coordinates.length < 3
      ) {
        return;
      }

      const path =
        coordinates.map(
          ([lng, lat]) => ({
            lat,
            lng,
          })
        );

      const isSelected =
        plot.id ===
        selectedPlotId;

      const polygon =
        new google.maps.Polygon({
          paths: path,

          strokeColor:
            "#111111",

          strokeOpacity: 1,

          strokeWeight:
            1,

          fillColor:
            plot.color ??
            PLOT_STATUS_COLORS[plot.status],

          fillOpacity:
            1,

          clickable,

          zIndex:
            isSelected
              ? 100
              : 10,
        });

      polygon.setMap(map);

      polygon.addListener(
        "click",
        () => {
          onPlotClick(
            plot.id
          );
        }
      );

      polygonsRef.current.push(
        polygon
      );
    });

    return () => {
      polygonsRef.current.forEach(
        (polygon) => {
          polygon.setMap(null);
        }
      );
    };
  }, [
    map,
    plots,
    selectedPlotId,
    onPlotClick,
    clickable,
  ]);

  return null;
}