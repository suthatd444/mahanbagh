export type PlotTemplate =
  | RectanglePlotTemplate
  | TrapezoidPlotTemplate;

interface BasePlotTemplate {
  id: string;
  name: string;
}

export interface RectanglePlotTemplate
  extends BasePlotTemplate {
  shape: "RECTANGLE";
  frontageFeet: number;
  depthFeet: number;
}

export interface TrapezoidPlotTemplate
  extends BasePlotTemplate {
  shape: "TRAPEZOID";
  frontFeet: number;
  backFeet: number;
  leftFeet: number;
  rightFeet: number;
}
