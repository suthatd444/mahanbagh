"use client";

import { Fragment } from "react";

import { useMap } from "@vis.gl/react-google-maps";

import {
  calculatePlotMeasurements,
} from "../../lib/plotMeasurements";
import type { Plot } from "../../types/plot";

import MeasurementLabel from "./MeasurementLabel";

interface PlotLabelsProps {
  plots: Plot[];
  selectedPlotId: string | null;
}

export default function PlotLabels({
  plots,
  selectedPlotId,
}: PlotLabelsProps) {
  const map = useMap();

  if (!map) {
    return null;
  }

  return (
    <>
      {plots
        .filter((plot) => plot.id !== selectedPlotId)
        .map((plot) => {
          const measurements =
            calculatePlotMeasurements(plot.geometry);

          return (
            <Fragment key={plot.id}>
              <MeasurementLabel
                map={map}
                position={measurements.center}
                text={plot.plotNo}
              />
            </Fragment>
          );
        })}
    </>
  );
}
