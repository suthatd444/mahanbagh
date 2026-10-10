"use client";

import {
  useEffect,
  useRef,
} from "react";

import { useMap } from "@vis.gl/react-google-maps";

interface TemplatePlotPlacementControlProps {
  coordinates: google.maps.LatLngLiteral[] | null;

  onMove: (
    coordinates: google.maps.LatLngLiteral[]
  ) => void;

  onMovePreview?: (
    coordinates: google.maps.LatLngLiteral[]
  ) => void;

  color?: string;

  title?: string;
}

export default function TemplatePlotPlacementControl({
  coordinates,
  onMove,
  onMovePreview,
  color = "#ea580c",
  title = "Drag to move template plot",
}: TemplatePlotPlacementControlProps) {
  const map = useMap();
  const markerRef =
    useRef<google.maps.Marker | null>(null);
  const coordinatesRef = useRef(coordinates);
  const isDraggingRef = useRef(false);
  const onMoveRef = useRef(onMove);
  const onMovePreviewRef = useRef(onMovePreview);
  const hasCoordinates =
    Boolean(coordinates && coordinates.length >= 3);

  useEffect(() => {
    coordinatesRef.current = coordinates;
    onMoveRef.current = onMove;
    onMovePreviewRef.current = onMovePreview;

    if (
      markerRef.current &&
      coordinates &&
      !isDraggingRef.current
    ) {
      markerRef.current.setPosition(
        getCenter(coordinates)
      );
    }
  }, [coordinates, onMove, onMovePreview]);

  useEffect(() => {
    if (
      !map ||
      !hasCoordinates ||
      typeof google === "undefined"
    ) {
      return;
    }

    const marker = new google.maps.Marker({
      map,
      position: getCenter(
        coordinatesRef.current!
      ),
      draggable: true,
      title,
      zIndex: 320,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillOpacity: 0,
        strokeOpacity: 0,
        scale: 12,
      },
      label: {
        text: "+",
        color,
        fontSize: "22px",
        fontWeight: "700",
      },
    });
    markerRef.current = marker;
    const dragStartListener = marker.addListener(
      "dragstart",
      () => {
        isDraggingRef.current = true;
      }
    );
    const dragListener = marker.addListener(
      "drag",
      (event: google.maps.MapMouseEvent) => {
        const position = event.latLng?.toJSON();
        const sourceCoordinates =
          coordinatesRef.current;

        if (!position || !sourceCoordinates) return;

        onMovePreviewRef.current?.(
          translateCoordinates(
            sourceCoordinates,
            getCenter(sourceCoordinates),
            position
          )
        );
      }
    );
    const dragEndListener = marker.addListener(
      "dragend",
      (event: google.maps.MapMouseEvent) => {
        const position = event.latLng?.toJSON();
        const sourceCoordinates =
          coordinatesRef.current;

        if (!position || !sourceCoordinates) return;

        const movedCoordinates =
          translateCoordinates(
            sourceCoordinates,
            getCenter(sourceCoordinates),
            position
          );

        isDraggingRef.current = false;
        onMoveRef.current(movedCoordinates);
        marker.setPosition(getCenter(movedCoordinates));
      }
    );

    return () => {
      dragStartListener.remove();
      dragListener.remove();
      dragEndListener.remove();
      marker.setMap(null);
      markerRef.current = null;
    };
  }, [map, hasCoordinates, color, title]);

  return null;
}

function getCenter(
  coordinates: google.maps.LatLngLiteral[]
) {
  return coordinates.reduce(
    (total, coordinate) => ({
      lat:
        total.lat +
        coordinate.lat / coordinates.length,
      lng:
        total.lng +
        coordinate.lng / coordinates.length,
    }),
    { lat: 0, lng: 0 }
  );
}

function translateCoordinates(
  coordinates: google.maps.LatLngLiteral[],
  sourceCenter: google.maps.LatLngLiteral,
  destinationCenter: google.maps.LatLngLiteral
) {
  const latitudeDelta =
    destinationCenter.lat - sourceCenter.lat;
  const longitudeDelta =
    destinationCenter.lng - sourceCenter.lng;

  return coordinates.map((coordinate) => ({
    lat: coordinate.lat + latitudeDelta,
    lng: coordinate.lng + longitudeDelta,
  }));
}
