"use client";

import { useEffect } from "react";

import { useMap } from "@vis.gl/react-google-maps";

import type {
  MapCoordinate,
  SocietyDrawing,
} from "@/types/project";

interface SocietyImageOverlayProps {
  drawing: SocietyDrawing;
  imageSource: string;
  movable: boolean;
  onMove: (corners: MapCoordinate[]) => void;
}

export default function SocietyImageOverlay({
  drawing,
  imageSource,
  movable,
  onMove,
}: SocietyImageOverlayProps) {
  const map = useMap();

  useEffect(() => {
    if (
      !map ||
      typeof google === "undefined" ||
      drawing.corners.length !== 4
    ) {
      return;
    }

    let overlay: google.maps.OverlayView | null =
      null;
    let cancelled = false;
    const image = new Image();

    image.onload = () => {
      if (cancelled) return;

      class DrawingOverlay
        extends google.maps.OverlayView
      {
        private imageElement: HTMLImageElement | null =
          null;

        private dragOffset = {
          x: 0,
          y: 0,
        };

        private startClient = {
          x: 0,
          y: 0,
        };

        private startPixels: google.maps.Point[] =
          [];

        private removeDragListeners:
          | (() => void)
          | null = null;

        onAdd() {
          this.imageElement =
            document.createElement("img");
          this.imageElement.src = imageSource;

          Object.assign(
            this.imageElement.style,
            {
              position: "absolute",
              width: `${image.naturalWidth}px`,
              height: `${image.naturalHeight}px`,
              opacity: String(
                Math.max(drawing.opacity, 0.85)
              ),
              pointerEvents: movable ? "auto" : "none",
              cursor: movable ? "grab" : "default",
              touchAction: "none",
              transformOrigin: "0 0",
              zIndex: "20",
            }
          );

          this.imageElement.addEventListener(
            "pointerdown",
            this.handlePointerDown
          );

          const panes = this.getPanes();
          const pane = movable
            ? panes?.overlayMouseTarget
            : panes?.overlayLayer;

          pane?.appendChild(this.imageElement);
        }

        handlePointerDown = (
          event: PointerEvent
        ) => {
          if (!movable) return;

          event.preventDefault();
          event.stopPropagation();

          const projection =
            this.getProjection();

          const pixels =
            drawing.corners.map((corner) =>
              projection.fromLatLngToDivPixel(
                corner
              )
            );

          if (pixels.some((pixel) => !pixel)) {
            return;
          }

          this.startPixels =
            pixels as google.maps.Point[];
          this.startClient = {
            x: event.clientX,
            y: event.clientY,
          };
          this.dragOffset = {
            x: 0,
            y: 0,
          };
          this.imageElement?.setPointerCapture(
            event.pointerId
          );

          const handlePointerMove = (
            moveEvent: PointerEvent
          ) => {
            this.dragOffset = {
              x:
                moveEvent.clientX -
                this.startClient.x,
              y:
                moveEvent.clientY -
                this.startClient.y,
            };

            this.draw();
          };

          const handlePointerUp = () => {
            this.removeDragListeners?.();
            this.removeDragListeners = null;

            const currentProjection =
              this.getProjection();
            const corners =
              this.startPixels.map((pixel) => {
                const position =
                  currentProjection.fromDivPixelToLatLng(
                    new google.maps.Point(
                      pixel.x + this.dragOffset.x,
                      pixel.y + this.dragOffset.y
                    )
                  );

                return position?.toJSON();
              });

            if (
              corners.length === 4 &&
              corners.every(
                (corner): corner is MapCoordinate =>
                  Boolean(corner)
              )
            ) {
              onMove(corners);
            }

            this.dragOffset = {
              x: 0,
              y: 0,
            };
          };

          window.addEventListener(
            "pointermove",
            handlePointerMove
          );
          window.addEventListener(
            "pointerup",
            handlePointerUp,
            { once: true }
          );

          this.removeDragListeners = () => {
            window.removeEventListener(
              "pointermove",
              handlePointerMove
            );
            window.removeEventListener(
              "pointerup",
              handlePointerUp
            );
          };
        };

        draw() {
          if (!this.imageElement) return;

          const projection =
            this.getProjection();
          const projectedCorners =
            drawing.corners.map((corner) =>
            projection.fromLatLngToDivPixel(corner)
            );

          if (
            projectedCorners.some(
              (corner) => !corner
            )
          ) {
            return;
          }

          const corners =
            projectedCorners as google.maps.Point[];
          const center = corners.reduce(
            (total, corner) => ({
              x: total.x + corner.x / 4,
              y: total.y + corner.y / 4,
            }),
            { x: 0, y: 0 }
          );
          const scale = drawing.scale ?? 1;
          const scaledCorners = corners.map(
            (corner) => ({
              x:
                center.x +
                (corner.x - center.x) * scale,
              y:
                center.y +
                (corner.y - center.y) * scale,
            })
          );
          const radians =
            ((drawing.rotation ?? 0) * Math.PI) /
            180;
          const cosine = Math.cos(radians);
          const sine = Math.sin(radians);
          const [
            topLeft,
            topRight,
            bottomRight,
            bottomLeft,
          ] = scaledCorners.map((corner) => ({
            x:
              center.x +
              (corner.x - center.x) * cosine -
              (corner.y - center.y) * sine,
            y:
              center.y +
              (corner.x - center.x) * sine +
              (corner.y - center.y) * cosine,
          }));

          const width = image.naturalWidth;
          const height = image.naturalHeight;
          const dx1 =
            topRight.x - bottomRight.x;
          const dx2 =
            bottomLeft.x - bottomRight.x;
          const dx3 =
            topLeft.x - topRight.x +
            bottomRight.x - bottomLeft.x;
          const dy1 =
            topRight.y - bottomRight.y;
          const dy2 =
            bottomLeft.y - bottomRight.y;
          const dy3 =
            topLeft.y - topRight.y +
            bottomRight.y - bottomLeft.y;
          const determinant =
            dx1 * dy2 - dx2 * dy1;

          if (determinant === 0) return;

          const perspectiveX =
            (dx3 * dy2 - dx2 * dy3) /
            determinant;
          const perspectiveY =
            (dx1 * dy3 - dx3 * dy1) /
            determinant;
          const scaleX =
            topRight.x - topLeft.x +
            perspectiveX * topRight.x;
          const skewX =
            bottomLeft.x - topLeft.x +
            perspectiveY * bottomLeft.x;
          const scaleY =
            topRight.y - topLeft.y +
            perspectiveX * topRight.y;
          const skewY =
            bottomLeft.y - topLeft.y +
            perspectiveY * bottomLeft.y;

          this.imageElement.style.transform =
            `matrix3d(${scaleX / width}, ${scaleY / width}, 0, ${perspectiveX / width}, ${skewX / height}, ${skewY / height}, 0, ${perspectiveY / height}, 0, 0, 1, 0, ${topLeft.x + this.dragOffset.x}, ${topLeft.y + this.dragOffset.y}, 0, 1)`;
        }

        onRemove() {
          this.removeDragListeners?.();
          this.imageElement?.removeEventListener(
            "pointerdown",
            this.handlePointerDown
          );
          this.imageElement?.remove();
          this.imageElement = null;
        }
      }

      overlay = new DrawingOverlay();
      overlay.setMap(map);
    };

    image.onerror = () => {
      console.error(
        "Failed to load the saved society drawing."
      );
    };

    image.src = imageSource;

    return () => {
      cancelled = true;
      overlay?.setMap(null);
    };
  }, [
    map,
    drawing,
    imageSource,
    movable,
    onMove,
  ]);

  return null;
}
