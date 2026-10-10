import { AppData } from "@/types/project";

export const STORAGE_KEY =
  "real-estate-plot-viewer";

const EMPTY_DATA: AppData = {
  version: 1,
  projects: [],
};

export function getAppData(): AppData {
  if (typeof window === "undefined") {
    return EMPTY_DATA;
  }

  const stored =
    localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return EMPTY_DATA;
  }

  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error(
      "Failed to parse application data:",
      error
    );

    return EMPTY_DATA;
  }
}

export function saveAppData(
  data: AppData
): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(data)
  );
}

export function clearAppData(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
}