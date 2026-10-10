import { Plot } from "./plot";
import { PlotTemplate } from "./plotTemplate";

export interface Block {
  id: string;
  projectId: string;

  name: string;
  code: string;
}

export interface SocietyDrawing {
  imageId?: string;
  documentId?: string;
  imageUrl?: string;
  imageDataUrl?: string;
  opacity: number;
  corners: MapCoordinate[];
  rotation?: number;
  scale?: number;
}

export interface SocietyBoundary {
  coordinates: MapCoordinate[];
  color: string;
}

export interface FacilityLabel {
  id: string;
  name: string;
  color: string;
  position: MapCoordinate;
  rotation: number;
}

export interface MapCoordinate {
  lat: number;
  lng: number;
}

export interface ProjectDocument {
  id: string;
  originalName: string;
  url: string;
}

export type EnquiryStatus =
  | "NEW"
  | "CONTACTED"
  | "VISITED"
  | "NEGOTIATION"
  | "WON"
  | "LOST";

export interface PlotEnquiry {
  id: string;
  plotId?: string;
  plotNo?: string;
  customerName: string;
  phone: string;
  email?: string;
  message?: string;
  status: EnquiryStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;

  name: string;
  code?: string | null;

  description?: string;

  address?: string;
  city?: string;
  state?: string;

  latitude: number;
  longitude: number;

  blocks: Block[];

  plots: Plot[];

  societyDrawing?: SocietyDrawing;

  societyBoundary?: SocietyBoundary;

  facilityLabels?: FacilityLabel[];

  brochure?: ProjectDocument | null;

  photos?: ProjectDocument[];

  createdAt: string;
  updatedAt: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  code: string | null;
  description?: string | null;
  city?: string | null;
  state?: string | null;
  latitude: number;
  longitude: number;
  plotCount: number;
  photoCount: number;
  hasBrochure: boolean;
  coverPhotoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  version: number;

  projects: Project[];

  plotLibrary?: PlotTemplate[];
}