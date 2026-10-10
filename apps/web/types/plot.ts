export type PlotStatus =
  | "AVAILABLE"
  | "RESERVED"
  | "SOLD"
  | "BLOCKED"
  | "HOLD"
  | "NOT_FOR_SALE";

export type PlotType =
  | "NORMAL"
  | "CORNER"
  | "PARK_FACING"
  | "ROAD_FACING"
  | "PARK"
  | "FACILITY"
  | "PU"
  | "INSTITUTIONAL";

export interface Plot {
  id: string;

  projectId: string;

  blockId?: string;

  plotNo: string;

  status: PlotStatus;

  plotType: PlotType;

  color?: string;

  areaSqft?: number;

  areaSqm?: number;

  perimeterMeters?: number;

  frontageMeters?: number;

  depthMeters?: number;

  sideLengths?: number[];

  facing?: string;

  roadWidthMeters?: number;

  price?: number;

  geometry: GeoJSON.Polygon;
}