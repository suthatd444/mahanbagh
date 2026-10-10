declare module "svg-path-parser" {
  export interface SVGPathCommand {
    code: string;
    x?: number;
    y?: number;
  }

  export function parseSVG(
    path: string
  ): SVGPathCommand[];

  export function makeAbsolute(
    commands: SVGPathCommand[]
  ): SVGPathCommand[];
}
