import { distance } from "@turf/turf";

import type { MapCoordinate } from "../types/project";

export const FEET_TO_METERS = 0.3048;

const METERS_PER_DEGREE_LATITUDE = 111_320;

export function getPolygonVertices(
  geometry: GeoJSON.Polygon
): MapCoordinate[] {
  const ring = geometry.coordinates[0] ?? [];

  if (ring.length < 2) {
    return [];
  }

  const firstCoordinate = ring[0];
  const lastCoordinate = ring[ring.length - 1];
  const isClosed =
    firstCoordinate[0] === lastCoordinate[0] &&
    firstCoordinate[1] === lastCoordinate[1];
  const vertices = isClosed
    ? ring.slice(0, -1)
    : ring;

  return vertices.map(([lng, lat]) => ({ lat, lng }));
}

export function getSideCoordinates(
  geometry: GeoJSON.Polygon,
  sideIndex: number
): MapCoordinate[] | null {
  const vertices = getPolygonVertices(geometry);
  const count = vertices.length;

  if (count < 3 || sideIndex < 0 || sideIndex >= count) {
    return null;
  }

  return [
    vertices[sideIndex],
    vertices[(sideIndex + 1) % count],
  ];
}

export function getSideLengthFeet(
  geometry: GeoJSON.Polygon,
  sideIndex: number
): number | null {
  const vertices = getPolygonVertices(geometry);
  const count = vertices.length;

  if (count < 3 || sideIndex < 0 || sideIndex >= count) {
    return null;
  }

  const start = vertices[sideIndex];
  const end = vertices[(sideIndex + 1) % count];
  const referenceLatitude =
    vertices.reduce(
      (total, vertex) => total + vertex.lat,
      0
    ) / count;
  const longitudeScale =
    METERS_PER_DEGREE_LATITUDE *
    Math.cos(referenceLatitude * (Math.PI / 180));
  const eastMeters =
    (end.lng - start.lng) * longitudeScale;
  const northMeters =
    (end.lat - start.lat) * METERS_PER_DEGREE_LATITUDE;

  return (
    Math.hypot(eastMeters, northMeters) /
    FEET_TO_METERS
  );
}

export function resizePolygonSide(
  geometry: GeoJSON.Polygon,
  sideIndex: number,
  lengthFeet: number
): MapCoordinate[] | null {
  if (!Number.isFinite(lengthFeet) || lengthFeet <= 0) {
    return null;
  }

  const vertices = getPolygonVertices(geometry);
  const count = vertices.length;

  if (count < 3 || sideIndex < 0 || sideIndex >= count) {
    return null;
  }

  const start = vertices[sideIndex];
  const endIndex = (sideIndex + 1) % count;
  const end = vertices[endIndex];
  const referenceLatitude =
    vertices.reduce(
      (total, vertex) => total + vertex.lat,
      0
    ) / count;
  const longitudeScale =
    METERS_PER_DEGREE_LATITUDE *
    Math.cos(referenceLatitude * (Math.PI / 180));
  const eastMeters =
    (end.lng - start.lng) * longitudeScale;
  const northMeters =
    (end.lat - start.lat) * METERS_PER_DEGREE_LATITUDE;
  const currentLength = Math.hypot(
    eastMeters,
    northMeters
  );

  if (currentLength < 0.000001) {
    return null;
  }

  const targetMeters = lengthFeet * FEET_TO_METERS;
  const turfLength = distance(
    [start.lng, start.lat],
    [end.lng, end.lat],
    { units: "meters" }
  );
  const scale =
    turfLength > 0 ? currentLength / turfLength : 1;
  const adjustedTarget = targetMeters * scale;
  const delta = adjustedTarget - currentLength;
  const unitEast = eastMeters / currentLength;
  const unitNorth = northMeters / currentLength;

  const startEastShift = (-unitEast * delta) / 2;
  const startNorthShift = (-unitNorth * delta) / 2;
  const endEastShift = (unitEast * delta) / 2;
  const endNorthShift = (unitNorth * delta) / 2;

  return vertices.map((vertex, index) => {
    if (index === sideIndex) {
      return {
        lat:
          vertex.lat +
          startNorthShift / METERS_PER_DEGREE_LATITUDE,
        lng: vertex.lng + startEastShift / longitudeScale,
      };
    }

    if (index === endIndex) {
      return {
        lat:
          vertex.lat +
          endNorthShift / METERS_PER_DEGREE_LATITUDE,
        lng: vertex.lng + endEastShift / longitudeScale,
      };
    }

    return vertex;
  });
}
