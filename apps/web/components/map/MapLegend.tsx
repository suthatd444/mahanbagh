"use client";

import {
  PLOT_STATUS_COLORS,
  PLOT_STATUS_LABELS,
} from "../../lib/constants";

export default function MapLegend() {

  return (
    <div className="absolute bottom-4 left-4 z-10 rounded-lg bg-white p-4 shadow-lg">

      <h3 className="mb-3 font-semibold">
        Plot Status
      </h3>

      <div className="space-y-2">

        {Object.entries(
          PLOT_STATUS_COLORS
        ).map(
          ([status, color]) => (

            <div
              key={status}
              className="flex items-center gap-2"
            >

              <span
                className="h-4 w-4 rounded"
                style={{
                  backgroundColor:
                    color,
                }}
              />

              <span className="text-sm">
                {
                  PLOT_STATUS_LABELS[
                    status as keyof typeof PLOT_STATUS_LABELS
                  ]
                }
              </span>

            </div>

          )
        )}

      </div>

    </div>
  );
}