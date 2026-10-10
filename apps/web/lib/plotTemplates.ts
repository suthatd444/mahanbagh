import { destination } from "@turf/turf";

import type {
  MapCoordinate,
} from "../types/project";
import type {
  PlotTemplate,
} from "../types/plotTemplate";

const FEET_TO_METERS = 0.3048;

interface LocalPoint {
  eastMeters: number;
  northMeters: number;
}

export function createTemplateCoordinates(
  template: PlotTemplate,
  center: MapCoordinate
): MapCoordinate[] {
  const points =
    template.shape === "RECTANGLE"
      ? createRectanglePoints(template)
      : createTrapezoidPoints(template);
  const centroid = points.reduce(
    (total, point) => ({
      eastMeters:
        total.eastMeters +
        point.eastMeters / points.length,
      northMeters:
        total.northMeters +
        point.northMeters / points.length,
    }),
    { eastMeters: 0, northMeters: 0 }
  );
  return points.map((point) =>
    offsetCoordinate(
      center,
      point.eastMeters - centroid.eastMeters,
      point.northMeters - centroid.northMeters
    )
  );
}

function offsetCoordinate(
  center: MapCoordinate,
  eastMeters: number,
  northMeters: number
): MapCoordinate {
  const distanceMeters = Math.hypot(
    eastMeters,
    northMeters
  );

  if (distanceMeters === 0) {
    return center;
  }

  const point = destination(
    [center.lng, center.lat],
    distanceMeters / 1_000,
    (Math.atan2(eastMeters, northMeters) * 180) /
      Math.PI,
    { units: "kilometers" }
  );
  const [lng, lat] = point.geometry.coordinates;

  return { lat, lng };
}

export function validatePlotTemplate(
  template: PlotTemplate
): void {
  if (template.shape === "RECTANGLE") {
    if (
      !Number.isFinite(template.frontageFeet) ||
      !Number.isFinite(template.depthFeet) ||
      template.frontageFeet <= 0 ||
      template.depthFeet <= 0
    ) {
      throw new Error(
        "Frontage and depth must be greater than zero."
      );
    }

    return;
  }

  const {
    frontFeet,
    backFeet,
    leftFeet,
    rightFeet,
  } = template;

  if (
    !Number.isFinite(frontFeet) ||
    !Number.isFinite(backFeet) ||
    !Number.isFinite(leftFeet) ||
    !Number.isFinite(rightFeet) ||
    frontFeet <= 0 ||
    backFeet <= 0 ||
    leftFeet <= 0 ||
    rightFeet <= 0
  ) {
    throw new Error(
      "All trapezoid sides must be greater than zero."
    );
  }

  createTrapezoidPoints(template);
}

function createRectanglePoints(
  template: Extract<
    PlotTemplate,
    { shape: "RECTANGLE" }
  >
): LocalPoint[] {
  const frontage =
    template.frontageFeet * FEET_TO_METERS;
  const depth =
    template.depthFeet * FEET_TO_METERS;

  return [
    { eastMeters: 0, northMeters: 0 },
    { eastMeters: frontage, northMeters: 0 },
    { eastMeters: frontage, northMeters: depth },
    { eastMeters: 0, northMeters: depth },
  ];
}

function createTrapezoidPoints(
  template: Extract<
    PlotTemplate,
    { shape: "TRAPEZOID" }
  >
): LocalPoint[] {
  const front = template.frontFeet * FEET_TO_METERS;
  const back = template.backFeet * FEET_TO_METERS;
  const left = template.leftFeet * FEET_TO_METERS;
  const right = template.rightFeet * FEET_TO_METERS;
  const difference = back - front;
  let backStart = 0;

  if (Math.abs(difference) < 0.000001) {
    if (Math.abs(left - right) > 0.01) {
      throw new Error(
        "Equal front and back widths require equal left and right sides."
      );
    }
  } else {
    backStart =
      (right ** 2 -
        left ** 2 -
        difference ** 2) /
      (2 * difference);
  }

  const heightSquared =
    left ** 2 - backStart ** 2;

  if (heightSquared <= 0) {
    throw new Error(
      "These trapezoid dimensions cannot form a valid plot."
    );
  }

  const depth = Math.sqrt(heightSquared);

  return [
    { eastMeters: 0, northMeters: 0 },
    { eastMeters: front, northMeters: 0 },
    {
      eastMeters: backStart + back,
      northMeters: depth,
    },
    {
      eastMeters: backStart,
      northMeters: depth,
    },
  ];
}
