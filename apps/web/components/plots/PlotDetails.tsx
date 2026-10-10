"use client";

import { useEffect, useState } from "react";

import {
  Plot,
  PlotStatus,
  PlotType,
} from "../../types/plot";

import {
  calculatePlotMeasurements,
} from "../../lib/plotMeasurements";
import { FEET_TO_METERS } from "../../lib/plot";
import {
  PLOT_STATUS_LABELS,
  PLOT_STATUS_COLORS,
} from "../../lib/constants";

interface PlotDetailsProps {
  plot: Plot;

  onClose: () => void;

  onDelete: () => void;

  onRotate: (degrees: number) => void;

  isMoveMode: boolean;

  onMoveToggle: () => void;

  onCopy: () => void;

  onUpdate: (
    updates: Pick<
      Plot,
      "plotNo" | "status" | "plotType" | "color"
    >
  ) => boolean;

  onResizeSide: (
    sideIndex: number,
    lengthFeet: number
  ) => void;

  onHighlightSide: (
    sideIndex: number | null
  ) => void;
}

export default function PlotDetails({
  plot,
  onClose,
  onDelete,
  onRotate,
  isMoveMode,
  onMoveToggle,
  onCopy,
  onUpdate,
  onResizeSide,
  onHighlightSide,
}: PlotDetailsProps) {
  const [rotationDegrees, setRotationDegrees] =
    useState(15);
  const [isEditing, setIsEditing] = useState(false);
  const [plotNo, setPlotNo] = useState(plot.plotNo);
  const [status, setStatus] =
    useState<PlotStatus>(plot.status);
  const [plotType, setPlotType] =
    useState<PlotType>(plot.plotType);
  const [color, setColor] = useState(
    plot.color ?? PLOT_STATUS_COLORS[plot.status]
  );
  const [sideInputs, setSideInputs] = useState<string[]>(
    []
  );

  const measurements =
    calculatePlotMeasurements(
      plot.geometry
    );

  useEffect(() => {
    setSideInputs(
      calculatePlotMeasurements(
        plot.geometry
      ).sideLengths.map((length) =>
        (length / FEET_TO_METERS).toFixed(2)
      )
    );
  }, [plot.geometry]);

  useEffect(() => {
    return () => {
      onHighlightSide(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applySideLength(sideIndex: number) {
    const currentFeet =
      measurements.sideLengths[sideIndex] /
      FEET_TO_METERS;
    const value = Number(sideInputs[sideIndex]);

    if (
      !Number.isFinite(value) ||
      value <= 0 ||
      value.toFixed(2) === currentFeet.toFixed(2)
    ) {
      setSideInputs((values) => {
        const next = [...values];
        next[sideIndex] = currentFeet.toFixed(2);
        return next;
      });
      return;
    }

    onResizeSide(sideIndex, value);
  }

  return (
    <div className="absolute right-5 top-5 z-[200] max-h-[calc(100%-2.5rem)] w-[320px] overflow-y-auto rounded-2xl bg-black/80 p-5 text-white shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          Plot {plot.plotNo}
        </h2>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCopy}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isEditing) {
                setPlotNo(plot.plotNo);
                setStatus(plot.status);
                setPlotType(plot.plotType);
                setColor(
                  plot.color ??
                    PLOT_STATUS_COLORS[plot.status]
                );
              }

              setIsEditing((editing) => !editing);
            }}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20"
          >
            {isEditing ? "Cancel edit" : "Edit plot"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold hover:bg-red-700"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 px-3 py-1 text-lg hover:bg-white/20"
          >
            ×
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <p className="rounded-lg bg-white/10 p-3 text-sm text-white/80">
          Drag blue plus handles to move corners.
          Drag amber plus handles to move walls.
        </p>

        {isEditing && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (
                onUpdate({
                  plotNo,
                  status,
                  plotType,
                  color,
                })
              ) {
                setIsEditing(false);
              }
            }}
            className="space-y-3 rounded-lg bg-white/10 p-3"
          >
            <h3 className="font-semibold">
              Edit plot
            </h3>
            <label className="block text-sm">
              Plot number
              <input
                type="text"
                value={plotNo}
                onChange={(event) =>
                  setPlotNo(event.target.value)
                }
                className="mt-1 w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-white"
              />
            </label>
            <label className="block text-sm">
              Status
              <select
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target.value as PlotStatus
                  )
                }
                className="mt-1 w-full rounded-lg border border-white/30 bg-gray-900 px-3 py-2 text-white"
              >
                {Object.entries(PLOT_STATUS_LABELS).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </label>
            <label className="block text-sm">
              Plot type
              <select
                value={plotType}
                onChange={(event) =>
                  setPlotType(
                    event.target.value as PlotType
                  )
                }
                className="mt-1 w-full rounded-lg border border-white/30 bg-gray-900 px-3 py-2 text-white"
              >
                <option value="NORMAL">Normal</option>
                <option value="CORNER">Corner</option>
                <option value="PARK_FACING">
                  Park Facing
                </option>
                <option value="ROAD_FACING">
                  Road Facing
                </option>
                <option value="PARK">Park</option>
                <option value="FACILITY">
                  Facility
                </option>
                <option value="PU">
                  Public Utility (PU)
                </option>
                <option value="INSTITUTIONAL">
                  Institutional
                </option>
              </select>
            </label>
            <label className="block text-sm">
              Plot color
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(event) =>
                    setColor(event.target.value)
                  }
                  className="h-10 w-12 rounded border border-white/30 bg-transparent p-1"
                />
                <button
                  type="button"
                  onClick={() =>
                    setColor(
                      PLOT_STATUS_COLORS[status]
                    )
                  }
                  className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20"
                >
                  Use status color
                </button>
              </div>
            </label>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold hover:bg-blue-700"
            >
              Save changes
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={onMoveToggle}
          className={
            isMoveMode
              ? "w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold"
              : "w-full rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20"
          }
        >
          {isMoveMode
            ? "Moving: drag the blue plus"
            : "Move entire plot"}
        </button>

        <p className="rounded-lg bg-white/10 p-3 text-sm text-white/80">
          Use the arrow keys to move the selected plot by 1 inch.
        </p>

        <div>
          <div className="text-xs text-white/60">
            Rotate plot
          </div>

          <label className="mt-2 block text-sm">
            Rotation amount (degrees)
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={rotationDegrees}
              onChange={(event) => {
                const value =
                  event.currentTarget.valueAsNumber;

                if (Number.isFinite(value) && value > 0) {
                  setRotationDegrees(value);
                }
              }}
              className="mt-1 w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-white"
            />
          </label>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                onRotate(-rotationDegrees)
              }
              className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20"
            >
              Rotate left
            </button>
            <button
              type="button"
              onClick={() =>
                onRotate(rotationDegrees)
              }
              className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20"
            >
              Rotate right
            </button>
          </div>
        </div>

        <div>
          <div className="text-xs text-white/60">
            Status
          </div>

          <div className="font-semibold">
            {plot.status}
          </div>
        </div>

        <div>
          <div className="text-xs text-white/60">
            Plot Type
          </div>

          <div className="font-semibold">
            {formatPlotType(
              plot.plotType
            )}
          </div>
        </div>

        <div>
          <div className="text-xs text-white/60">
            Area
          </div>

          <div className="text-lg font-semibold">
            {measurements.areaSqm.toFixed(
              2
            )}{" "}
            m²
          </div>

          <div className="text-sm text-white/60">
            {measurements.areaSqft.toFixed(
              2
            )}{" "}
            sq.ft
          </div>
        </div>

        <div>
          <div className="text-xs text-white/60">
            Perimeter
          </div>

          <div className="font-semibold">
            {measurements.perimeterMeters.toFixed(
              2
            )}{" "}
            m
          </div>
        </div>

        <div>
          <div className="text-xs text-white/60">
            Side lengths (feet)
          </div>

          <p className="mt-1 text-xs text-white/50">
            Enter the exact length of each side in feet and
            press Enter to adjust the boundary.
          </p>

          <div className="mt-2 grid grid-cols-2 gap-2">
            {measurements.sideLengths.map(
              (
                length,
                index
              ) => (
                <label
                  key={index}
                  className="block text-xs text-white/70"
                >
                  Side {index + 1}
                  <input
                    type="number"
                    min="0.01"
                    step="0.1"
                    value={sideInputs[index] ?? ""}
                    onChange={(event) =>
                      setSideInputs((values) => {
                        const next = [...values];
                        next[index] = event.target.value;
                        return next;
                      })
                    }
                    onFocus={() =>
                      onHighlightSide(index)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        applySideLength(index);
                      }
                    }}
                    onBlur={() => {
                      applySideLength(index);
                      onHighlightSide(null);
                    }}
                    className="mt-1 w-full rounded-lg border border-white/30 bg-white/10 px-2 py-2 text-sm font-semibold text-white"
                  />
                  <span className="mt-1 block text-white/40">
                    now {(
                      length / FEET_TO_METERS
                    ).toFixed(2)}{" "}
                    ft
                  </span>
                </label>
              )
            )}
          </div>
        </div>

        {plot.facing && (
          <div>
            <div className="text-xs text-white/60">
              Facing
            </div>

            <div className="font-semibold">
              {plot.facing}
            </div>
          </div>
        )}

        {plot.roadWidthMeters && (
          <div>
            <div className="text-xs text-white/60">
              Road Width
            </div>

            <div className="font-semibold">
              {
                plot.roadWidthMeters
              }{" "}
              m
            </div>
          </div>
        )}

        {plot.price && (
          <div>
            <div className="text-xs text-white/60">
              Price
            </div>

            <div className="text-lg font-semibold">
              ₹
              {plot.price.toLocaleString(
                "en-IN"
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatPlotType(
  type: Plot["plotType"]
) {
  switch (type) {
    case "CORNER":
      return "Corner Plot";

    case "PARK_FACING":
      return "Park Facing";

    case "ROAD_FACING":
      return "Road Facing";

    case "PARK":
      return "Park";

    case "FACILITY":
      return "Facility";

    case "PU":
      return "Public Utility";

    case "INSTITUTIONAL":
      return "Institutional";

    default:
      return "Normal Plot";
  }
}