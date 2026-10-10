"use client";

import { useEffect } from "react";

interface MeasurementLabelProps {
  map: google.maps.Map | null;

  position: {
    lat: number;
    lng: number;
  };

  text: string;

  rotation?: number;
}

export default function MeasurementLabel({
  map,
  position,
  text,
  rotation = 0,
}: MeasurementLabelProps) {
  useEffect(() => {
    if (!map || typeof google === "undefined") {
      return;
    }

    class MeasurementOverlay
      extends google.maps.OverlayView
    {
      private div: HTMLDivElement | null =
        null;

      constructor(
        private readonly labelPosition: google.maps.LatLng,
        private readonly labelText: string,
        private readonly labelRotation: number
      ) {
        super();
      }

      onAdd() {
        this.div = document.createElement("div");
        this.div.innerText = this.labelText;

        Object.assign(this.div.style, {
          position: "absolute",
          whiteSpace: "nowrap",
          color: "#ffffff",
          fontSize: "10px",
          fontWeight: "600",
          textShadow:
            "0 0 2px #000000, 0 0 2px #000000",
          pointerEvents: "none",
          transform:
            `translate(-50%, -50%) rotate(${this.labelRotation}deg)`,
        });

        this.getPanes()?.floatPane.appendChild(
          this.div
        );
      }

      draw() {
        if (!this.div) return;

        const pixel =
          this.getProjection()
            ?.fromLatLngToDivPixel(
              this.labelPosition
            );

        if (!pixel) return;

        this.div.style.left = `${pixel.x}px`;
        this.div.style.top = `${pixel.y}px`;
      }

      onRemove() {
        this.div?.remove();
        this.div = null;
      }
    }

    const overlay =
      new MeasurementOverlay(
        new google.maps.LatLng(
          position.lat,
          position.lng
        ),
        text,
        rotation
      );

    overlay.setMap(map);

    return () => {
      overlay.setMap(null);
    };
  }, [
    map,
    position.lat,
    position.lng,
    text,
    rotation,
  ]);

  return null;
}