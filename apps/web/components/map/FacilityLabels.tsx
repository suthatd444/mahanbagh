"use client";

import { useEffect } from "react";

import { useMap } from "@vis.gl/react-google-maps";

import type {
  FacilityLabel,
  MapCoordinate,
} from "@/types/project";

interface FacilityLabelsProps {
  facilities: FacilityLabel[];
  selectedFacilityId: string | null;
  onMove: (
    facilityId: string,
    position: MapCoordinate
  ) => void;
}

export default function FacilityLabels({
  facilities,
  selectedFacilityId,
  onMove,
}: FacilityLabelsProps) {
  return (
    <>
      {facilities.map((facility) => (
        <FacilityLabelOverlay
          key={facility.id}
          facility={facility}
          movable={
            facility.id === selectedFacilityId
          }
          onMove={onMove}
        />
      ))}
    </>
  );
}

interface FacilityLabelOverlayProps {
  facility: FacilityLabel;
  movable: boolean;
  onMove: (
    facilityId: string,
    position: MapCoordinate
  ) => void;
}

function FacilityLabelOverlay({
  facility,
  movable,
  onMove,
}: FacilityLabelOverlayProps) {
  const map = useMap();

  useEffect(() => {
    if (!map || typeof google === "undefined") {
      return;
    }

    let removeDragListeners:
      | (() => void)
      | null = null;

    class FacilityOverlay extends google.maps.OverlayView {
      private element: HTMLDivElement | null = null;

      private dragOffset = {
        x: 0,
        y: 0,
      };

      private startClient = {
        x: 0,
        y: 0,
      };

      private startPixel: google.maps.Point | null =
        null;

      onAdd() {
        this.element = document.createElement("div");
        this.element.textContent = facility.name;
        Object.assign(this.element.style, {
          position: "absolute",
          backgroundColor: facility.color,
          border: "2px solid #111111",
          borderRadius: "9999px",
          color: "#111111",
          cursor: movable ? "grab" : "default",
          fontSize: "13px",
          fontWeight: "700",
          padding: "4px 9px",
          pointerEvents: movable ? "auto" : "none",
          userSelect: "none",
          whiteSpace: "nowrap",
        });
        this.element.addEventListener(
          "pointerdown",
          this.handlePointerDown
        );

        const panes = this.getPanes();
        const pane = movable
          ? panes?.overlayMouseTarget
          : panes?.overlayLayer;

        pane?.appendChild(this.element);
      }

      handlePointerDown = (event: PointerEvent) => {
        if (!movable || !this.element) {
          return;
        }

        const projection = this.getProjection();
        const pixel =
          projection.fromLatLngToDivPixel(
            facility.position
          );

        if (!pixel) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        this.startPixel = pixel;
        this.startClient = {
          x: event.clientX,
          y: event.clientY,
        };
        this.element.style.cursor = "grabbing";
        this.element.setPointerCapture(event.pointerId);

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
          removeDragListeners?.();
          removeDragListeners = null;
          this.element?.style.setProperty(
            "cursor",
            "grab"
          );

          if (!this.startPixel) {
            return;
          }

          const position =
            this.getProjection().fromDivPixelToLatLng(
              new google.maps.Point(
                this.startPixel.x + this.dragOffset.x,
                this.startPixel.y + this.dragOffset.y
              )
            );

          if (position) {
            onMove(facility.id, position.toJSON());
          }

          this.startPixel = null;
          this.dragOffset = { x: 0, y: 0 };
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
        removeDragListeners = () => {
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
        if (!this.element) {
          return;
        }

        const pixel =
          this.getProjection().fromLatLngToDivPixel(
            facility.position
          );

        if (!pixel) {
          return;
        }

        this.element.style.left = `${
          pixel.x + this.dragOffset.x
        }px`;
        this.element.style.top = `${
          pixel.y + this.dragOffset.y
        }px`;
        this.element.style.transform =
          `translate(-50%, -50%) rotate(${facility.rotation}deg)`;
      }

      onRemove() {
        removeDragListeners?.();
        this.element?.removeEventListener(
          "pointerdown",
          this.handlePointerDown
        );
        this.element?.remove();
        this.element = null;
      }
    }

    const overlay = new FacilityOverlay();
    overlay.setMap(map);

    return () => {
      overlay.setMap(null);
    };
  }, [map, facility, movable, onMove]);

  return null;
}
