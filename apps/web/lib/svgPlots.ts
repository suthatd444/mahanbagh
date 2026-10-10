import {
  makeAbsolute,
  parseSVG,
} from "svg-path-parser";

import type {
  MapCoordinate,
  SocietyDrawing,
} from "@/types/project";

interface SvgPoint {
  x: number;
  y: number;
}

export function extractSvgPlotCandidates(
  svgSource: string,
  drawing: SocietyDrawing
): MapCoordinate[][] {
  if (drawing.corners.length !== 4) {
    throw new Error(
      "Position the society image before detecting plots."
    );
  }

  const document = new DOMParser().parseFromString(
    svgSource,
    "image/svg+xml"
  );
  const parserError =
    document.querySelector("parsererror");

  if (parserError) {
    throw new Error("The SVG could not be parsed.");
  }

  const svg = document.documentElement;
  const dimensions = getSvgDimensions(svg);

  if (!dimensions) {
    throw new Error(
      "The SVG needs a viewBox or numeric width and height."
    );
  }

  const candidates: MapCoordinate[][] = [];

  svg.querySelectorAll("rect").forEach((element) => {
    const x = getNumberAttribute(element, "x");
    const y = getNumberAttribute(element, "y");
    const width = getNumberAttribute(element, "width");
    const height = getNumberAttribute(element, "height");

    if (width <= 0 || height <= 0) {
      return;
    }

    addCandidate(
      candidates,
      [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
      ],
      dimensions,
      drawing
    );
  });

  svg
    .querySelectorAll("polygon")
    .forEach((element) => {
      addCandidate(
        candidates,
        parsePointList(
          element.getAttribute("points") ?? ""
        ),
        dimensions,
        drawing
      );
    });

  svg.querySelectorAll("path").forEach((element) => {
    const points = getClosedLinePathPoints(
      element.getAttribute("d") ?? ""
    );

    if (!points) {
      return;
    }

    addCandidate(
      candidates,
      points,
      dimensions,
      drawing
    );
  });

  return candidates;
}

function getSvgDimensions(
  svg: Element
): { x: number; y: number; width: number; height: number } | null {
  const viewBox = svg.getAttribute("viewBox");

  if (viewBox) {
    const values = parseNumbers(viewBox);

    if (
      values.length === 4 &&
      values[2] > 0 &&
      values[3] > 0
    ) {
      return {
        x: values[0],
        y: values[1],
        width: values[2],
        height: values[3],
      };
    }
  }

  const width = getNumberAttribute(svg, "width");
  const height = getNumberAttribute(svg, "height");

  if (width <= 0 || height <= 0) {
    return null;
  }

  return {
    x: 0,
    y: 0,
    width,
    height,
  };
}

function getNumberAttribute(
  element: Element,
  name: string
): number {
  return Number.parseFloat(
    element.getAttribute(name) ?? "0"
  );
}

function parsePointList(
  value: string
): SvgPoint[] {
  const values = parseNumbers(value);
  const points: SvgPoint[] = [];

  for (let index = 0; index < values.length - 1; index += 2) {
    points.push({
      x: values[index],
      y: values[index + 1],
    });
  }

  return points;
}

function parseNumbers(value: string): number[] {
  return (
    value.match(
      /[-+]?(?:\d*\.?\d+)(?:[eE][-+]?\d+)?/g
    ) ?? []
  ).map(Number);
}

function getClosedLinePathPoints(
  path: string
): SvgPoint[] | null {
  try {
    const commands = makeAbsolute(parseSVG(path));

    if (
      commands.length < 4 ||
      commands.at(-1)?.code !== "Z" ||
      commands.some(
        (command) =>
          !["M", "L", "H", "V", "Z"].includes(
            command.code
          )
      )
    ) {
      return null;
    }

    const points = commands
      .filter(
        (command) =>
          command.code !== "Z"
      )
      .map((command) => ({
        x: command.x,
        y: command.y,
      }))
      .filter(
        (
          point
        ): point is SvgPoint =>
          Number.isFinite(point.x) &&
          Number.isFinite(point.y)
      );

    return points.length >= 3 ? points : null;
  } catch {
    return null;
  }
}

function addCandidate(
  candidates: MapCoordinate[][],
  points: SvgPoint[],
  dimensions: {
    x: number;
    y: number;
    width: number;
    height: number;
  },
  drawing: SocietyDrawing
) {
  if (points.length < 3) {
    return;
  }

  const coordinates = points.map((point) =>
    mapSvgPointToCoordinate(
      point,
      dimensions,
      drawing
    )
  );

  candidates.push(coordinates);
}

function mapSvgPointToCoordinate(
  point: SvgPoint,
  dimensions: {
    x: number;
    y: number;
    width: number;
    height: number;
  },
  drawing: SocietyDrawing
): MapCoordinate {
  const horizontal =
    (point.x - dimensions.x) / dimensions.width;
  const vertical =
    (point.y - dimensions.y) / dimensions.height;
  const [
    topLeft,
    topRight,
    bottomRight,
    bottomLeft,
  ] = drawing.corners;
  const top = interpolateCoordinate(
    topLeft,
    topRight,
    horizontal
  );
  const bottom = interpolateCoordinate(
    bottomLeft,
    bottomRight,
    horizontal
  );
  const position = interpolateCoordinate(
    top,
    bottom,
    vertical
  );
  const center = drawing.corners.reduce(
    (total, corner) => ({
      lat: total.lat + corner.lat / 4,
      lng: total.lng + corner.lng / 4,
    }),
    { lat: 0, lng: 0 }
  );
  const latitudeRadians =
    center.lat * (Math.PI / 180);
  const scale = drawing.scale ?? 1;
  const east =
    (position.lng - center.lng) *
    Math.cos(latitudeRadians) *
    scale;
  const north =
    (position.lat - center.lat) * scale;
  const rotation =
    ((drawing.rotation ?? 0) * Math.PI) / 180;
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);

  return {
    lat:
      center.lat +
      north * cosine -
      east * sine,
    lng:
      center.lng +
      (east * cosine + north * sine) /
        Math.cos(latitudeRadians),
  };
}

function interpolateCoordinate(
  start: MapCoordinate,
  end: MapCoordinate,
  amount: number
): MapCoordinate {
  return {
    lat: start.lat + (end.lat - start.lat) * amount,
    lng: start.lng + (end.lng - start.lng) * amount,
  };
}
