import { Plot } from "../types/plot";

export function plotsToGeoJSON(
  plots: Plot[]
) {

  return {
    type: "FeatureCollection" as const,

    features: plots.map(
      (plot) => ({
        type: "Feature" as const,

        properties: {
          id: plot.id,

          plotNo:
            plot.plotNo,

          status:
            plot.status,

          areaSqft:
            plot.areaSqft,

          areaSqyd:
            plot.areaSqft
              ? Math.round(
                  plot.areaSqft / 9
                )
              : undefined,

          frontage:
            plot.frontageMeters,

          depth:
            plot.depthMeters,

          facing:
            plot.facing,

          roadWidth:
            plot.roadWidthMeters,

          price:
            plot.price,
        },

        geometry:
          plot.geometry,
      })
    ),
  };
}