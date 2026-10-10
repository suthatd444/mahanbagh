import { Project } from "@/types/project";
import { getAppData, saveAppData } from "./storage";

const DEMO_DATA_VERSION = 4;

export function createDemoProject(): Project {

  const projectId = "project-demo-001";

  return {
    id: projectId,

    name:
      "My Society",

    code:
      "MY-SOCIETY",

    description:
      "Create your plot layout by uploading a society drawing.",

    address:
      "Jodhpur, Rajasthan",

    city:
      "Jodhpur",

    state:
      "Rajasthan",

    latitude: 26.014865,

    longitude: 73.840739,

    blocks: [],

    plots: [],

    createdAt:
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString(),
  };
}



export function initializeDemoData() {

  const existing =
    getAppData();

  const existingDemoProject =
    existing.projects.find(
      (project) => project.id === "project-demo-001"
    );

  if (
    existing.version >= DEMO_DATA_VERSION &&
    existingDemoProject
  ) {
    return;
  }

  const project =
    existing.version >= 3 &&
    existingDemoProject
      ? {
          ...existingDemoProject,
          latitude: 26.014865,
          longitude: 73.840739,
          updatedAt: new Date().toISOString(),
        }
      : createDemoProject();

  saveAppData({
    version: DEMO_DATA_VERSION,

    projects: [
      ...existing.projects.filter(
        (existingProject) =>
          existingProject.id !== project.id
      ),
      project,
    ],
  });
}