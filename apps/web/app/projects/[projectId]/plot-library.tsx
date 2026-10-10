import type { Plot } from "../../../types/plot";
import type { PlotTemplate } from "../../../types/plotTemplate";

interface DimensionInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

export function DimensionInput({
  label,
  value,
  onChange,
}: DimensionInputProps) {
  return (
    <label className="block text-xs font-medium">
      {label}
      <input
        type="number"
        min="0.01"
        step="0.01"
        value={value}
        onChange={(event) =>
          onChange(event.currentTarget.valueAsNumber)
        }
        className="mt-1 w-full rounded-lg border border-gray-300 px-2 py-2 text-sm"
      />
    </label>
  );
}

export function formatTemplateDimensions(
  template: PlotTemplate
) {
  return template.shape === "RECTANGLE"
    ? `Rectangle: ${template.frontageFeet} ft x ${template.depthFeet} ft`
    : `Trapezoid: front ${template.frontFeet} ft, back ${template.backFeet} ft, left ${template.leftFeet} ft, right ${template.rightFeet} ft`;
}

export function getNextPlotNumber(plots: Plot[]) {
  const usedPlotNumbers = new Set(
    plots.map((plot) => plot.plotNo)
  );
  let nextPlotNumber = plots.length + 1;
  let plotNo = "";

  do {
    plotNo = `P-${String(nextPlotNumber).padStart(
      3,
      "0"
    )}`;
    nextPlotNumber += 1;
  } while (usedPlotNumbers.has(plotNo));

  return plotNo;
}
