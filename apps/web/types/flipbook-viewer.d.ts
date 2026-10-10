declare module "flipbook-viewer" {
  export interface FlipbookViewer {
    page_count: number;
    version?: string;
    flip_forward: () => void;
    flip_back: () => void;
    zoom: (zoom?: number) => void;
    on: (event: "seen", handler: (page: number) => void) => void;
  }

  export interface FlipbookOptions {
    width?: number;
    height?: number;
    backgroundColor?: string;
    boxColor?: string;
    boxBorder?: number;
    margin?: number;
    marginTop?: number;
    marginLeft?: number;
    singlepage?: boolean;
    popup?: boolean;
  }

  export function init(
    book: unknown,
    container: string | HTMLElement,
    cb?: (err: unknown, viewer?: FlipbookViewer) => void,
  ): void;

  export function init(
    book: unknown,
    container: string | HTMLElement,
    opts: FlipbookOptions,
    cb?: (err: unknown, viewer?: FlipbookViewer) => void,
  ): void;
}
