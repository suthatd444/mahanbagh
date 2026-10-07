import { BadRequestException } from "@nestjs/common";

export type ToggleableStatus = "ACTIVE" | "INACTIVE";

export function normalizeUserStatus(value: unknown): ToggleableStatus {
  const next = String(value ?? "").toUpperCase();
  if (next === "ACTIVE" || next === "INACTIVE") return next;
  throw new BadRequestException("Status must be ACTIVE or INACTIVE");
}

export function statusToggleResponse(
  id: { toString(): string },
  status: ToggleableStatus,
  entity: string,
) {
  return {
    status: true,
    message: `${entity} marked as ${status === "ACTIVE" ? "active" : "inactive"}.`,
    data: { id: id.toString(), status },
  };
}
