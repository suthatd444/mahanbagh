import { PlotStatus } from "../types/plot";
import { EnquiryStatus } from "../types/project";

export const PLOT_STATUS_COLORS: Record<
  PlotStatus,
  string
> = {
  AVAILABLE: "#22c55e",
  RESERVED: "#f59e0b",
  SOLD: "#ef4444",
  BLOCKED: "#6b7280",
  HOLD: "#f97316",
  NOT_FOR_SALE: "#374151",
};

export const PLOT_STATUS_LABELS: Record<
  PlotStatus,
  string
> = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  SOLD: "Sold",
  BLOCKED: "Blocked",
  HOLD: "Hold",
  NOT_FOR_SALE: "Not For Sale",
};

export const ENQUIRY_STATUSES: EnquiryStatus[] = [
  "NEW",
  "CONTACTED",
  "VISITED",
  "NEGOTIATION",
  "WON",
  "LOST",
];

export const ENQUIRY_STATUS_LABELS: Record<EnquiryStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  VISITED: "Visited",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

export const ENQUIRY_STATUS_COLORS: Record<EnquiryStatus, string> = {
  NEW: "bg-blue-100 text-blue-700",
  CONTACTED: "bg-amber-100 text-amber-700",
  VISITED: "bg-purple-100 text-purple-700",
  NEGOTIATION: "bg-orange-100 text-orange-700",
  WON: "bg-green-100 text-green-700",
  LOST: "bg-gray-200 text-gray-600",
};

export const ENQUIRY_STATUS_OPTIONS = ENQUIRY_STATUSES.map((status) => ({
  value: status,
  label: ENQUIRY_STATUS_LABELS[status],
}));

export const PLOT_STATUS_OPTIONS = (
  Object.keys(PLOT_STATUS_LABELS) as PlotStatus[]
).map((status) => ({
  value: status,
  label: PLOT_STATUS_LABELS[status],
}));