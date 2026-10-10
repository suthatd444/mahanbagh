import {
  area,
  distance,
  centroid,
} from "@turf/turf";

import type {
  Feature,
  Polygon,
} from "geojson";

export interface PlotMeasurement {
  areaSqm: number;

  areaSqft: number;

  perimeterMeters: number;

  sideLengths: number[];

  center: {
    lat: number;
    lng: number;
  };
}

export function calculatePlotMeasurements(
  geometry: GeoJSON.Polygon
): PlotMeasurement {
  const feature: Feature<Polygon> = {
    type: "Feature",
    properties: {},
    geometry,
  };

  // -----------------------------
  // AREA
  // -----------------------------

  const areaSqm = area(feature);

  const areaSqft =
    areaSqm * 10.7639104167;

  // -----------------------------
  // COORDINATES
  // -----------------------------

  const coordinates =
    geometry.coordinates[0];

  // -----------------------------
  // SIDE LENGTHS
  // -----------------------------

  const sideLengths: number[] = [];

  for (
    let i = 0;
    i < coordinates.length - 1;
    i++
  ) {
    const start =
      coordinates[i];

    const end =
      coordinates[i + 1];

    const sideLength =
      distance(
        start,
        end,
        {
          units: "meters",
        }
      );

    sideLengths.push(
      sideLength
    );
  }

  // -----------------------------
  // PERIMETER
  // -----------------------------

  const perimeterMeters =
    sideLengths.reduce(
      (total, value) =>
        total + value,
      0
    );

  // -----------------------------
  // CENTER
  // -----------------------------

  const center =
    centroid(feature);

  const [
    lng,
    lat,
  ] = center.geometry.coordinates;

  return {
    areaSqm,

    areaSqft,

    perimeterMeters,

    sideLengths,

    center: {
      lat,
      lng,
    },
  };
}
