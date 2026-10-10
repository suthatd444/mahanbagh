import * as pdfjs from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

export interface FlipbookPage {
  img: HTMLImageElement;
  num: number;
  width: number;
  height: number;
}

export interface FlipbookBook {
  numPages: () => number;
  getPage: (
    num: number,
    cb: (err?: unknown, page?: FlipbookPage) => void,
  ) => void;
}

export function createPdfBook(url: string): Promise<FlipbookBook> {
  return pdfjs.getDocument(url).promise.then((pdf) => {
    const cache: Record<number, FlipbookPage> = {};

    function getPage(
      num: number,
      cb: (err?: unknown, page?: FlipbookPage) => void,
    ) {
      if (!num || num > pdf.numPages) {
        cb();
        return;
      }

      if (cache[num]) {
        cb(undefined, cache[num]);
        return;
      }

      pdf
        .getPage(num)
        .then((page) => {
          const viewport = page.getViewport({ scale: 1.2 });
          const outputScale = window.devicePixelRatio || 1;

          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;

          const transform =
            outputScale !== 1
              ? [outputScale, 0, 0, outputScale, 0, 0]
              : undefined;

          const context = canvas.getContext("2d");
          if (!context) {
            cb("Unable to render the brochure page.");
            return;
          }

          page
            .render({
              canvasContext: context,
              transform,
              viewport,
            })
            .promise.then(() => {
              const img = new Image();
              img.src = canvas.toDataURL();
              img.addEventListener(
                "load",
                () => {
                  cache[num] = {
                    img,
                    num,
                    width: img.width,
                    height: img.height,
                  };
                  cb(undefined, cache[num]);
                },
                false,
              );
            })
            .catch((err) => cb(err));
        })
        .catch((err) => cb(err));
    }

    return {
      numPages: () => pdf.numPages,
      getPage,
    };
  });
}
