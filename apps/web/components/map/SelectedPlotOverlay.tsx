"use client";

import {
  Fragment,
  useMemo,
} from "react";

import { useMap } from "@vis.gl/react-google-maps";

import { Plot } from "../../types/plot";

import {
  calculatePlotMeasurements,
} from "../../lib/plotMeasurements";

import MeasurementLabel from "./MeasurementLabel";

interface SelectedPlotOverlayProps {
  plot: Plot | null;
}

export default function SelectedPlotOverlay({
  plot,
}: SelectedPlotOverlayProps) {
  const map = useMap();

  const measurements =
    useMemo(() => {
      if (!plot) {
        return null;
      }

      return calculatePlotMeasurements(
        plot.geometry
      );
    }, [plot]);

  if (
    !plot ||
    !measurements ||
    !map
  ) {
    return null;
  }

  return (
    <>
      <MeasurementLabel
        map={map}
        position={
          measurements.center
        }
        text={plot.plotNo}
      />
    </>
  );
}