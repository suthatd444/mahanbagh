"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import PlotMap from "../../../components/map/PlotMap";
import AdminLayout from "../../../components/admin/AdminLayout";

import MapLegend from "../../../components/map/MapLegend";

import PlotDetails from "../../../components/plots/PlotDetails";
import {
  DimensionInput,
  formatTemplateDimensions,
  getNextPlotNumber,
} from "./plot-library";

import { api } from "../../../lib/api";
import { extractSvgPlotCandidates } from "../../../lib/svgPlots";
import {
  getSideCoordinates,
  resizePolygonSide,
} from "../../../lib/plot";
import {
  createTemplateCoordinates,
  validatePlotTemplate,
} from "../../../lib/plotTemplates";

import {
  FacilityLabel,
  MapCoordinate,
  Project,
} from "../../../types/project";

import { Plot } from "../../../types/plot";
import type { PlotTemplate } from "../../../types/plotTemplate";

type Coordinate = MapCoordinate;
type PlotMoveDirection =
  | "up"
  | "down"
  | "left"
  | "right";

interface Props {
  params: Promise<{
    projectId: string;
  }>;
}

function createPolygonGeometry(
  coordinates: Coordinate[]
): GeoJSON.Polygon {
  const firstCoordinate = coordinates[0];

  return {
    type: "Polygon",
    coordinates: [[
      ...coordinates.map(({ lat, lng }) => [
        lng,
        lat,
      ]),
      [
        firstCoordinate.lng,
        firstCoordinate.lat,
      ],
    ]],
  };
}

export default function ProjectPage({
  params,
}: Props) {
  const [
    project,
    setProject,
  ] =
    useState<Project | null>(
      null
    );
  const [
    loadingProject,
    setLoadingProject,
  ] = useState(true);
  const [user, setUser] = useState<{
    name?: string | null;
    role?: string | null;
  } | null>(null);

  const [
    selectedPlot,
    setSelectedPlot,
  ] =
    useState<Plot | null>(
      null
    );

  const [
    draftCoordinates,
    setDraftCoordinates,
  ] = useState<Coordinate[]>([]);

  const [
    societyBoundaryDraftCoordinates,
    setSocietyBoundaryDraftCoordinates,
  ] = useState<Coordinate[]>([]);

  const [
    boundaryDrawingMode,
    setBoundaryDrawingMode,
  ] = useState(false);

  const [
    boundaryColor,
    setBoundaryColor,
  ] = useState("#ffffff");

  const [
    detectedPlotCoordinates,
    setDetectedPlotCoordinates,
  ] = useState<Coordinate[][]>([]);

  const [
    drawingMode,
    setDrawingMode,
  ] = useState(false);

  const [
    cursorCoordinate,
    setCursorCoordinate,
  ] = useState<Coordinate | null>(
    null
  );

  const [
    imageMoveMode,
    setImageMoveMode,
  ] = useState(false);

  const [
    plotMoveMode,
    setPlotMoveMode,
  ] = useState(false);

  const [
    copiedPlot,
    setCopiedPlot,
  ] = useState<Plot | null>(null);

  const [
    pasteMode,
    setPasteMode,
  ] = useState(false);

  const [
    facilityPlacementMode,
    setFacilityPlacementMode,
  ] = useState(false);

  const [
    facilityName,
    setFacilityName,
  ] = useState("");

  const [
    facilityColor,
    setFacilityColor,
  ] = useState("#facc15");

  const [
    selectedFacilityId,
    setSelectedFacilityId,
  ] = useState<string | null>(null);

  const [
    imageRotation,
    setImageRotation,
  ] = useState(0);

  const [
    imageScale,
    setImageScale,
  ] = useState(1);

  const [
    societyImageSource,
    setSocietyImageSource,
  ] = useState<string | null>(
    null
  );

  const [
    showSocietyPlan,
    setShowSocietyPlan,
  ] = useState(true);

  const [
    planZoomRequest,
    setPlanZoomRequest,
  ] = useState(0);

  const [
    editorMessage,
    setEditorMessage,
  ] = useState<string | null>(
    null
  );

  const [
    plotNumber,
    setPlotNumber,
  ] = useState("");

  const [
    highlightedSideIndex,
    setHighlightedSideIndex,
  ] = useState<number | null>(null);
  const nudgeSelectedPlotRef = useRef<
    (direction: PlotMoveDirection) => void
  >(() => {});
  const saveTimerRef = useRef<number | null>(null);
  const pendingProjectRef = useRef<Project | null>(null);

  const [
    plotLibrary,
    setPlotLibrary,
  ] = useState<PlotTemplate[]>([]);

  const [
    templateShape,
    setTemplateShape,
  ] = useState<PlotTemplate["shape"]>(
    "RECTANGLE"
  );

  const [
    templateName,
    setTemplateName,
  ] = useState("");

  const [
    frontageFeet,
    setFrontageFeet,
  ] = useState(30);

  const [
    depthFeet,
    setDepthFeet,
  ] = useState(50);

  const [
    frontFeet,
    setFrontFeet,
  ] = useState(30);

  const [
    backFeet,
    setBackFeet,
  ] = useState(40);

  const [
    leftFeet,
    setLeftFeet,
  ] = useState(50);

  const [
    rightFeet,
    setRightFeet,
  ] = useState(50);

  const [
    placingTemplate,
    setPlacingTemplate,
  ] = useState<PlotTemplate | null>(
    null
  );

  const [
    templatePlacementMode,
    setTemplatePlacementMode,
  ] = useState(false);

  const [
    templatePreviewCoordinates,
    setTemplatePreviewCoordinates,
  ] = useState<Coordinate[] | null>(
    null
  );

  useEffect(() => {
    api
      .get<{ data?: { name?: string | null; role?: string | null } }>(
        "/auth/me"
      )
      .then(({ data }) => setUser(data.data ?? null))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    api
      .get<{ data?: PlotTemplate[] }>("/admin/plot-templates")
      .then(({ data }) => setPlotLibrary(data.data ?? []))
      .catch(() => setPlotLibrary([]));
  }, []);

  useEffect(() => {
    async function loadProject() {
      const { projectId } = await params;

      try {
        const { data } = await api.get<{
          data?: Project;
        }>(`/admin/projects/${projectId}`);

        const found = data.data ?? null;

        setProject(found);
        setImageRotation(
          found?.societyDrawing?.rotation ?? 0
        );
        setImageScale(
          found?.societyDrawing?.scale ?? 1
        );
        setBoundaryColor(
          found?.societyBoundary?.color ?? "#ffffff"
        );
        if (
          found?.societyDrawing ||
          found?.societyBoundary
        ) {
          setPlanZoomRequest((request) => request + 1);
        }

        if (found?.societyDrawing?.imageUrl) {
          setSocietyImageSource(
            `/api/v1${found.societyDrawing.imageUrl}`
          );
        } else {
          setSocietyImageSource(
            found?.societyDrawing?.imageDataUrl ?? null
          );
        }
      } catch (error) {
        setEditorMessage(
          error instanceof Error
            ? `Could not load the project: ${error.message}`
            : "Could not load the project."
        );
      } finally {
        setLoadingProject(false);
      }
    }

    loadProject();
  }, [params]);

  useEffect(() => {
    return () => {
      if (
        societyImageSource?.startsWith("blob:")
      ) {
        URL.revokeObjectURL(societyImageSource);
      }
    };
  }, [societyImageSource]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
      const pending = pendingProjectRef.current;
      if (pending) void persistProject(pending);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const currentProject = project;
    const drawing =
      currentProject?.societyDrawing;

    if (
      !imageMoveMode ||
      !currentProject ||
      !drawing
    ) {
      return;
    }

    const movableProject = currentProject;
    const movableDrawing = drawing;

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;

      if (
        target?.matches(
          "input, textarea, select, [contenteditable='true']"
        )
      ) {
        return;
      }

      const stepMeters =
        event.shiftKey ? 10 : 1;
      let northMeters = 0;
      let eastMeters = 0;

      switch (event.key) {
        case "ArrowUp":
          northMeters = stepMeters;
          break;
        case "ArrowDown":
          northMeters = -stepMeters;
          break;
        case "ArrowLeft":
          eastMeters = -stepMeters;
          break;
        case "ArrowRight":
          eastMeters = stepMeters;
          break;
        default:
          return;
      }

      event.preventDefault();

      const latitudeDelta =
        northMeters / 111_320;
      const longitudeDelta =
        eastMeters /
        (111_320 *
          Math.cos(
            movableProject.latitude *
              (Math.PI / 180)
          ));
      const updatedProject: Project = {
        ...movableProject,
        societyDrawing: {
          ...movableDrawing,
          corners: movableDrawing.corners.map(
            (corner) => ({
              lat: corner.lat + latitudeDelta,
              lng: corner.lng + longitudeDelta,
            })
          ),
        },
        updatedAt: new Date().toISOString(),
      };

      try {
        saveProject(updatedProject);
        setDetectedPlotCoordinates([]);
      } catch (error) {
        setEditorMessage(
          error instanceof Error
            ? `Could not move the image: ${error.message}`
            : "Could not move the image."
        );
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [imageMoveMode, project]);

  useEffect(() => {
    if (
      !project ||
      !selectedPlot ||
      drawingMode ||
      imageMoveMode ||
      templatePlacementMode ||
      pasteMode ||
      boundaryDrawingMode ||
      facilityPlacementMode
    ) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;

      if (
        target?.matches(
          "input, textarea, select, [contenteditable='true']"
        )
      ) {
        return;
      }

      const directions = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
      } as const;
      const direction = directions[
        event.key as keyof typeof directions
      ];

      if (!direction) {
        return;
      }

      event.preventDefault();
      nudgeSelectedPlotRef.current(direction);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    project,
    selectedPlot,
    drawingMode,
    imageMoveMode,
    templatePlacementMode,
    pasteMode,
    boundaryDrawingMode,
    facilityPlacementMode,
  ]);

  if (loadingProject) {
    return (
      <AdminLayout user={user}>
        <div className="flex min-h-[calc(100vh-9rem)] items-center justify-center">
          <div className="text-center">
            <h1 className="text-xl font-bold">
              Loading project...
            </h1>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!project) {
    return (
      <AdminLayout user={user}>
        <div className="flex min-h-[calc(100vh-9rem)] items-center justify-center">
          <div className="text-center">
            <h1 className="text-xl font-bold">
              Project not found
            </h1>

            <p className="mt-2 text-gray-500">
              This project may have been removed.
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const activeProject = project;
  const facilities =
    activeProject.facilityLabels ?? [];
  const selectedFacility =
    facilities.find(
      (facility) =>
        facility.id === selectedFacilityId
    ) ?? null;
  const highlightedSideCoordinates =
    selectedPlot && highlightedSideIndex !== null
      ? getSideCoordinates(
          selectedPlot.geometry,
          highlightedSideIndex
        )
      : null;

  function handlePlotClick(
    plotId: string
  ) {
    const plot =
      activeProject.plots.find(
        (item) =>
          item.id === plotId
      );

    if (plot) {
      setSelectedPlot(
        plot
      );
    }
  }

  function handlePlotGeometryChange(
    coordinates: Coordinate[]
  ) {
    if (!selectedPlot || coordinates.length < 3) {
      return;
    }

    const updatedPlot: Plot = {
      ...selectedPlot,
      geometry: createPolygonGeometry(coordinates),
    };
    const updatedProject: Project = {
      ...activeProject,
      plots: activeProject.plots.map(
        (plot) =>
          plot.id === updatedPlot.id
            ? updatedPlot
            : plot
      ),
      updatedAt: new Date().toISOString(),
    };

    if (saveProject(updatedProject)) {
      setSelectedPlot(updatedPlot);
      setEditorMessage(
        `Plot ${updatedPlot.plotNo} geometry saved.`
      );
    }
  }

  function togglePlotMoveMode() {
    setPlotMoveMode((isMoving) => !isMoving);
    setDrawingMode(false);
    setImageMoveMode(false);
    setPasteMode(false);
    cancelTemplatePlacement();
    setEditorMessage(null);
  }

  function handlePlotMove(
    coordinates: Coordinate[]
  ) {
    handlePlotGeometryChange(coordinates);
    setPlotMoveMode(false);
  }

  function nudgeSelectedPlot(
    direction: PlotMoveDirection
  ) {
    if (!selectedPlot) {
      return;
    }

    const ring =
      selectedPlot.geometry.coordinates[0];
    const vertices =
      ring[0][0] === ring[ring.length - 1][0] &&
      ring[0][1] === ring[ring.length - 1][1]
        ? ring.slice(0, -1)
        : ring;
    const coordinates = vertices.map(
      ([lng, lat]) => ({ lat, lng })
    );

    if (coordinates.length < 3) {
      return;
    }

    const centerLatitude =
      coordinates.reduce(
        (total, coordinate) => total + coordinate.lat,
        0
      ) / coordinates.length;
    const inchInMeters = 0.0254;
    const latitudeDelta =
      direction === "up"
        ? inchInMeters / 111_320
        : direction === "down"
          ? -inchInMeters / 111_320
          : 0;
    const longitudeDelta =
      direction === "right"
        ? inchInMeters /
          (111_320 *
            Math.cos(
              centerLatitude * (Math.PI / 180)
            ))
        : direction === "left"
          ? -inchInMeters /
            (111_320 *
              Math.cos(
                centerLatitude * (Math.PI / 180)
              ))
          : 0;

    handlePlotGeometryChange(
      coordinates.map((coordinate) => ({
        lat: coordinate.lat + latitudeDelta,
        lng: coordinate.lng + longitudeDelta,
      }))
    );
  }

  nudgeSelectedPlotRef.current =
    nudgeSelectedPlot;

  function previewPlotMove(
    coordinates: Coordinate[]
  ) {
    if (!selectedPlot || coordinates.length < 3) {
      return;
    }

    const updatedPlot: Plot = {
      ...selectedPlot,
      geometry: createPolygonGeometry(coordinates),
    };

    setSelectedPlot(updatedPlot);
    setProject((currentProject) =>
      currentProject
        ? {
            ...currentProject,
            plots: currentProject.plots.map(
              (plot) =>
                plot.id === updatedPlot.id
                  ? updatedPlot
                  : plot
            ),
          }
        : currentProject
    );
  }

  function copySelectedPlot() {
    if (!selectedPlot) {
      return;
    }

    setCopiedPlot(selectedPlot);
    setPasteMode(true);
    setPlotMoveMode(false);
    setDrawingMode(false);
    setImageMoveMode(false);
    cancelTemplatePlacement();
    setEditorMessage(
      `Click the map to paste a copy of plot ${selectedPlot.plotNo}.`
    );
  }

  function pasteCopiedPlot(
    coordinate: Coordinate
  ) {
    if (!copiedPlot) {
      return;
    }

    const ring = copiedPlot.geometry.coordinates[0];
    const vertices =
      ring[0][0] === ring[ring.length - 1][0] &&
      ring[0][1] === ring[ring.length - 1][1]
        ? ring.slice(0, -1)
        : ring;
    const sourceCoordinates = vertices.map(
      ([lng, lat]) => ({ lat, lng })
    );

    if (sourceCoordinates.length < 3) {
      setEditorMessage(
        "The copied plot does not have enough corners to paste."
      );
      return;
    }

    const center = sourceCoordinates.reduce(
      (total, sourceCoordinate) => ({
        lat:
          total.lat +
          sourceCoordinate.lat /
            sourceCoordinates.length,
        lng:
          total.lng +
          sourceCoordinate.lng /
            sourceCoordinates.length,
      }),
      { lat: 0, lng: 0 }
    );
    const pastedCoordinates = sourceCoordinates.map(
      (sourceCoordinate) => ({
        lat:
          sourceCoordinate.lat +
          coordinate.lat -
          center.lat,
        lng:
          sourceCoordinate.lng +
          coordinate.lng -
          center.lng,
      })
    );
    const pastedPlot: Plot = {
      ...copiedPlot,
      id: crypto.randomUUID(),
      projectId: activeProject.id,
      plotNo: getNextPlotNumber(activeProject.plots),
      geometry: createPolygonGeometry(
        pastedCoordinates
      ),
    };
    const updatedProject: Project = {
      ...activeProject,
      plots: [
        ...activeProject.plots,
        pastedPlot,
      ],
      updatedAt: new Date().toISOString(),
    };

    if (saveProject(updatedProject)) {
      setSelectedPlot(pastedPlot);
      setPasteMode(false);
      setEditorMessage(
        `Plot ${pastedPlot.plotNo} pasted.`
      );
    }
  }

  function startFacilityPlacement() {
    if (!facilityName.trim()) {
      setEditorMessage("Enter a facility name.");
      return;
    }

    setFacilityPlacementMode(true);
    setDrawingMode(false);
    setImageMoveMode(false);
    setPlotMoveMode(false);
    setPasteMode(false);
    setBoundaryDrawingMode(false);
    cancelTemplatePlacement();
    setSelectedPlot(null);
    setCursorCoordinate(null);
    setEditorMessage(
      `Click the map to place ${facilityName.trim()}.`
    );
  }

  function placeFacility(coordinate: Coordinate) {
    const facility: FacilityLabel = {
      id: crypto.randomUUID(),
      name: facilityName.trim(),
      color: facilityColor,
      position: coordinate,
      rotation: 0,
    };
    const updatedProject: Project = {
      ...activeProject,
      facilityLabels: [
        ...facilities,
        facility,
      ],
      updatedAt: new Date().toISOString(),
    };

    if (saveProject(updatedProject)) {
      setSelectedFacilityId(facility.id);
      setFacilityPlacementMode(false);
      setFacilityName("");
      setEditorMessage(
        `${facility.name} facility label added.`
      );
    }
  }

  function updateFacility(
    facilityId: string,
    updates: Partial<
      Pick<FacilityLabel, "position" | "rotation" | "color">
    >
  ) {
    const facility = facilities.find(
      (item) => item.id === facilityId
    );

    if (!facility) {
      return;
    }

    const updatedFacility: FacilityLabel = {
      ...facility,
      ...updates,
    };
    const updatedProject: Project = {
      ...activeProject,
      facilityLabels: facilities.map((item) =>
        item.id === facilityId
          ? updatedFacility
          : item
      ),
      updatedAt: new Date().toISOString(),
    };

    saveProject(updatedProject);
  }

  function deleteSelectedFacility() {
    if (
      !selectedFacility ||
      !window.confirm(
        `Delete ${selectedFacility.name} facility label?`
      )
    ) {
      return;
    }

    const updatedProject: Project = {
      ...activeProject,
      facilityLabels: facilities.filter(
        (facility) =>
          facility.id !== selectedFacility.id
      ),
      updatedAt: new Date().toISOString(),
    };

    if (saveProject(updatedProject)) {
      setSelectedFacilityId(null);
      setEditorMessage(
        `${selectedFacility.name} facility label deleted.`
      );
    }
  }

  function deleteSelectedPlot() {
    if (!selectedPlot) {
      return;
    }

    if (
      !window.confirm(
        `Delete plot ${selectedPlot.plotNo}? This cannot be undone.`
      )
    ) {
      return;
    }

    const deletedPlot = selectedPlot;
    const updatedProject: Project = {
      ...activeProject,
      plots: activeProject.plots.filter(
        (plot) => plot.id !== deletedPlot.id
      ),
      updatedAt: new Date().toISOString(),
    };

    if (saveProject(updatedProject)) {
      setSelectedPlot(null);
      setEditorMessage(
        `Plot ${deletedPlot.plotNo} deleted.`
      );
    }
  }

  function updateSelectedPlotDetails(
    updates: Pick<
      Plot,
      "plotNo" | "status" | "plotType" | "color"
    >
  ): boolean {
    if (!selectedPlot) {
      return false;
    }

    const plotNo = updates.plotNo.trim();

    if (!plotNo) {
      setEditorMessage("Enter a plot number.");
      return false;
    }

    if (
      activeProject.plots.some(
        (plot) =>
          plot.id !== selectedPlot.id &&
          plot.plotNo === plotNo
      )
    ) {
      setEditorMessage(
        `Plot ${plotNo} already exists. Choose another plot number.`
      );
      return false;
    }

    const updatedPlot: Plot = {
      ...selectedPlot,
      ...updates,
      plotNo,
    };
    const updatedProject: Project = {
      ...activeProject,
      plots: activeProject.plots.map((plot) =>
        plot.id === updatedPlot.id
          ? updatedPlot
          : plot
      ),
      updatedAt: new Date().toISOString(),
    };

    if (saveProject(updatedProject)) {
      setSelectedPlot(updatedPlot);
      setEditorMessage(
        `Plot ${updatedPlot.plotNo} details saved.`
      );
      return true;
    }

    return false;
  }

  function rotateSelectedPlot(
    degrees: number
  ) {
    if (!selectedPlot) {
      return;
    }

    const ring =
      selectedPlot.geometry.coordinates[0];
    const firstRingCoordinate = ring[0];
    const lastRingCoordinate = ring[ring.length - 1];
    const vertices =
      firstRingCoordinate[0] === lastRingCoordinate[0] &&
      firstRingCoordinate[1] === lastRingCoordinate[1]
        ? ring.slice(0, -1)
        : ring;
    const coordinates = vertices
      .map(([lng, lat]) => ({
        lat,
        lng,
      }));

    if (coordinates.length < 3) {
      setEditorMessage(
        "This plot does not have enough corners to rotate."
      );
      return;
    }

    const center = coordinates.reduce(
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
    const radians =
      degrees * (Math.PI / 180);
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    const longitudeScale =
      111_320 *
      Math.cos(center.lat * (Math.PI / 180));
    const rotatedCoordinates = coordinates.map(
      (coordinate) => {
        const eastMeters =
          (coordinate.lng - center.lng) *
          longitudeScale;
        const northMeters =
          (coordinate.lat - center.lat) *
          111_320;

        return {
          lat:
            center.lat +
            (eastMeters * sine +
              northMeters * cosine) /
              111_320,
          lng:
            center.lng +
            (eastMeters * cosine -
              northMeters * sine) /
              longitudeScale,
        };
      }
    );

    handlePlotGeometryChange(rotatedCoordinates);
  }

  function resizeSelectedPlotSide(
    sideIndex: number,
    lengthFeet: number
  ) {
    if (!selectedPlot) {
      return;
    }

    const resized = resizePolygonSide(
      selectedPlot.geometry,
      sideIndex,
      lengthFeet
    );

    if (!resized) {
      setEditorMessage(
        "Enter a valid side length greater than zero."
      );
      return;
    }

    handlePlotGeometryChange(resized);
  }

  function handleCoordinateSelect(
    coordinate: Coordinate
  ) {
    setCursorCoordinate(coordinate);
    setDraftCoordinates(
      (coordinates) => [
        ...coordinates,
        coordinate,
      ]
    );
  }

  function handleBoundaryCoordinateSelect(
    coordinate: Coordinate
  ) {
    setCursorCoordinate(coordinate);
    setSocietyBoundaryDraftCoordinates(
      (coordinates) => [
        ...coordinates,
        coordinate,
      ]
    );
  }

  function startBoundaryDrawing() {
    setBoundaryDrawingMode(true);
    setSocietyBoundaryDraftCoordinates([]);
    setDrawingMode(false);
    setImageMoveMode(false);
    setPlotMoveMode(false);
    setPasteMode(false);
    cancelTemplatePlacement();
    setSelectedPlot(null);
    setCursorCoordinate(null);
    setEditorMessage(
      "Click the map to add each society boundary corner."
    );
  }

  function saveSocietyBoundary() {
    if (societyBoundaryDraftCoordinates.length < 3) {
      setEditorMessage(
        "Add at least three boundary corners before saving."
      );
      return;
    }

    const updatedProject: Project = {
      ...activeProject,
      societyBoundary: {
        coordinates: societyBoundaryDraftCoordinates,
        color: boundaryColor,
      },
      updatedAt: new Date().toISOString(),
    };

    if (saveProject(updatedProject)) {
      setBoundaryDrawingMode(false);
      setSocietyBoundaryDraftCoordinates([]);
      setCursorCoordinate(null);
      setPlanZoomRequest((request) => request + 1);
      setEditorMessage("Society boundary saved.");
    }
  }

  function saveBoundaryColor() {
    if (!activeProject.societyBoundary) {
      return;
    }

    const updatedProject: Project = {
      ...activeProject,
      societyBoundary: {
        ...activeProject.societyBoundary,
        color: boundaryColor,
      },
      updatedAt: new Date().toISOString(),
    };

    if (saveProject(updatedProject)) {
      setEditorMessage(
        "Society background color saved."
      );
    }
  }

  function clearSocietyBoundary() {
    if (
      !activeProject.societyBoundary ||
      !window.confirm(
        "Remove the saved society boundary and its background color?"
      )
    ) {
      return;
    }

    const updatedProject: Project = {
      ...activeProject,
      societyBoundary: undefined,
      updatedAt: new Date().toISOString(),
    };

    if (saveProject(updatedProject)) {
      setSocietyBoundaryDraftCoordinates([]);
      setBoundaryDrawingMode(false);
      setEditorMessage("Society boundary removed.");
    }
  }

  async function persistProject(project: Project) {
    try {
      await api.put(`/admin/projects/${project.id}/layout`, {
        name: project.name,
        description: project.description,
        address: project.address,
        city: project.city,
        state: project.state,
        latitude: project.latitude,
        longitude: project.longitude,
        blocks: project.blocks ?? [],
        plots: project.plots ?? [],
        societyDrawing: project.societyDrawing ?? null,
        societyBoundary: project.societyBoundary ?? null,
        facilityLabels: project.facilityLabels ?? [],
      });

      if (pendingProjectRef.current === project) {
        pendingProjectRef.current = null;
      }
    } catch (error) {
      setEditorMessage(
        error instanceof Error
          ? `Could not save changes to the server: ${error.message}`
          : "Could not save changes to the server."
      );
    }
  }

  function saveProject(
    updatedProject: Project
  ): boolean {
    setProject(updatedProject);
    pendingProjectRef.current = updatedProject;

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      const pending = pendingProjectRef.current;
      if (pending) void persistProject(pending);
    }, 500);

    return true;
  }

  function savePlotLibrary(
      updatedLibrary: PlotTemplate[]
    ): boolean {
      setPlotLibrary(updatedLibrary);

      api
        .put<{ data?: PlotTemplate[] }>("/admin/plot-templates", {
          templates: updatedLibrary,
        })
        .then(({ data }) => {
          if (data.data) setPlotLibrary(data.data);
        })
        .catch((error) => {
          setEditorMessage(
            error instanceof Error
              ? `Could not save the plot library: ${error.message}`
              : "Could not save the plot library."
          );
        });

      return true;
    }

    function addPlotTemplate() {
      const name = templateName.trim();
      const template: PlotTemplate =
        templateShape === "RECTANGLE"
          ? {
              id: crypto.randomUUID(),
              name:
                name ||
                `${frontageFeet} x ${depthFeet} ft`,
              shape: "RECTANGLE",
              frontageFeet,
              depthFeet,
            }
          : {
              id: crypto.randomUUID(),
              name:
                name ||
                `${frontFeet}/${backFeet} ft trapezoid`,
              shape: "TRAPEZOID",
              frontFeet,
              backFeet,
              leftFeet,
              rightFeet,
            };

      try {
        validatePlotTemplate(template);
      } catch (error) {
        setEditorMessage(
          error instanceof Error
            ? error.message
            : "Enter valid plot dimensions."
        );
        return;
      }

      if (
        savePlotLibrary([
          ...plotLibrary,
          template,
        ])
      ) {
        setTemplateName("");
        setEditorMessage(
          `${template.name} added to the plot library.`
        );
      }
    }

    function startTemplatePlacement(
      template: PlotTemplate
    ) {
      setPlacingTemplate(template);
      setTemplatePlacementMode(true);
      setFacilityPlacementMode(false);
      setTemplatePreviewCoordinates(null);
      setDrawingMode(false);
      setImageMoveMode(false);
      setSelectedPlot(null);
      setPlotMoveMode(false);
      setCursorCoordinate(null);
      setDetectedPlotCoordinates([]);
      setEditorMessage(
        `Click the map to place ${template.name}.`
      );
    }

    function handleTemplatePlace(
      coordinate: Coordinate
    ) {
      if (!placingTemplate) {
        return;
      }

      try {
        setTemplatePreviewCoordinates(
          createTemplateCoordinates(
            placingTemplate,
            coordinate
          )
        );
        setTemplatePlacementMode(false);
        setEditorMessage(
          "Drag the orange plus to position the plot, then save it."
        );
      } catch (error) {
        setEditorMessage(
          error instanceof Error
            ? `Could not place the template: ${error.message}`
            : "Could not place the template."
        );
      }
    }

    function cancelTemplatePlacement() {
      setPlacingTemplate(null);
      setTemplatePlacementMode(false);
      setTemplatePreviewCoordinates(null);
      setEditorMessage(null);
    }

    function saveTemplatePlot() {
      if (
        !placingTemplate ||
        !templatePreviewCoordinates ||
        templatePreviewCoordinates.length < 3
      ) {
        return;
      }

      const plotNo = getNextPlotNumber(
        activeProject.plots
      );
      const firstCoordinate =
        templatePreviewCoordinates[0];
      const plot: Plot = {
        id: crypto.randomUUID(),
        projectId: activeProject.id,
        plotNo,
        status: "AVAILABLE",
        plotType: "NORMAL",
        geometry: {
          type: "Polygon",
          coordinates: [[
            ...templatePreviewCoordinates.map(
              ({ lat, lng }) => [lng, lat]
            ),
            [
              firstCoordinate.lng,
              firstCoordinate.lat,
            ],
          ]],
        },
      };
      const updatedProject: Project = {
        ...activeProject,
        plots: [
          ...activeProject.plots,
          plot,
        ],
        updatedAt: new Date().toISOString(),
      };

      if (saveProject(updatedProject)) {
        setSelectedPlot(plot);
        setPlacingTemplate(null);
        setTemplatePreviewCoordinates(null);
        setEditorMessage(
          `Library plot ${plotNo} saved.`
        );
      }
    }

    function deletePlotTemplate(
      templateId: string
    ) {
      const template = plotLibrary.find(
        (item) => item.id === templateId
      );

      if (
        template &&
        window.confirm(
          `Delete ${template.name} from the plot library?`
        )
      ) {
        savePlotLibrary(
          plotLibrary.filter(
            (item) => item.id !== templateId
          )
        );

        if (placingTemplate?.id === templateId) {
          cancelTemplatePlacement();
        }
      }
    }

  async function clearAllData() {
    const confirmed = window.confirm(
      "Clear all saved society data? This permanently removes the drawing, boundary, facilities and every plot."
    );

    if (!confirmed) {
      return;
    }

    try {
      const updatedProject: Project = {
        ...activeProject,
        societyDrawing: undefined,
        societyBoundary: undefined,
        facilityLabels: [],
        plots: [],
        updatedAt: new Date().toISOString(),
      };

      if (saveProject(updatedProject)) {
        setSocietyImageSource(null);
        setDetectedPlotCoordinates([]);
        setEditorMessage("Project layout cleared.");
      }
    } catch (error) {
      setEditorMessage(
        error instanceof Error
          ? `Could not clear the project: ${error.message}`
          : "Could not clear the project."
      );
    }
  }

  async function detectSvgPlots() {
    const drawing = activeProject.societyDrawing;

    if (!drawing) {
      setEditorMessage(
        "Upload an SVG society drawing first."
      );
      return;
    }

    try {
      let svgSource: string;

      if (drawing.imageUrl) {
        const response = await fetch(
          `/api/v1${drawing.imageUrl}`
        );

        if (!response.ok) {
          throw new Error(
            "The saved society image could not be found."
          );
        }

        if (
          !response.headers
            .get("content-type")
            ?.includes("svg")
        ) {
          throw new Error(
            "Automatic detection is available for SVG drawings only."
          );
        }

        svgSource = await response.text();
      } else if (
        drawing.imageDataUrl?.startsWith(
          "data:image/svg+xml"
        )
      ) {
        const response = await fetch(
          drawing.imageDataUrl
        );

        svgSource = await response.text();
      } else {
        throw new Error(
          "Automatic detection is available for SVG drawings only."
        );
      }

      const candidates = extractSvgPlotCandidates(
        svgSource,
        drawing
      );

      setDetectedPlotCoordinates(candidates);
      setEditorMessage(
        candidates.length > 0
          ? `${candidates.length} SVG plot candidates found. Review the green shapes, then save them.`
          : "No supported closed SVG plot shapes were found."
      );
    } catch (error) {
      setEditorMessage(
        error instanceof Error
          ? `Could not detect SVG plots: ${error.message}`
          : "Could not detect SVG plots."
      );
    }
  }

  function saveDetectedPlots() {
    if (detectedPlotCoordinates.length === 0) {
      return;
    }

    const usedPlotNumbers = new Set(
      activeProject.plots.map(
        (plot) => plot.plotNo
      )
    );
    let nextPlotNumber =
      activeProject.plots.length + 1;
    const detectedPlots: Plot[] =
      detectedPlotCoordinates.map(
        (coordinates) => {
          let plotNo = `P-${String(
            nextPlotNumber
          ).padStart(3, "0")}`;

          while (usedPlotNumbers.has(plotNo)) {
            nextPlotNumber += 1;
            plotNo = `P-${String(
              nextPlotNumber
            ).padStart(3, "0")}`;
          }

          usedPlotNumbers.add(plotNo);
          nextPlotNumber += 1;

          const ring = coordinates.map(
            ({ lat, lng }) => [lng, lat]
          );
          const firstCoordinate = coordinates[0];

          ring.push([
            firstCoordinate.lng,
            firstCoordinate.lat,
          ]);

          return {
            id: crypto.randomUUID(),
            projectId: activeProject.id,
            plotNo,
            status: "AVAILABLE",
            plotType: "NORMAL",
            geometry: {
              type: "Polygon",
              coordinates: [ring],
            },
          };
        }
      );
    const updatedProject: Project = {
      ...activeProject,
      plots: [
        ...activeProject.plots,
        ...detectedPlots,
      ],
      updatedAt: new Date().toISOString(),
    };

    if (saveProject(updatedProject)) {
      setDetectedPlotCoordinates([]);
      setEditorMessage(
        `${detectedPlots.length} detected plots saved.`
      );
    }
  }

  function saveDraftPlot() {
    if (draftCoordinates.length < 3) {
      return;
    }

    const firstCoordinate =
      draftCoordinates[0];
    const polygonCoordinates =
      draftCoordinates.map(
        ({ lat, lng }) => [lng, lat]
      );

    polygonCoordinates.push([
      firstCoordinate.lng,
      firstCoordinate.lat,
    ]);

    const name =
      plotNumber.trim() ||
      getNextPlotNumber(activeProject.plots);

    if (
      activeProject.plots.some(
        (plot) => plot.plotNo === name
      )
    ) {
      setEditorMessage(
        `Plot ${name} already exists. Choose another plot number.`
      );
      return;
    }

    const plot: Plot = {
      id: crypto.randomUUID(),
      projectId: activeProject.id,
      plotNo: name,
      status: "AVAILABLE",
      plotType: "NORMAL",
      geometry: {
        type: "Polygon",
        coordinates: [
          polygonCoordinates,
        ],
      },
    };
    const updatedProject: Project = {
      ...activeProject,
      plots: [
        ...activeProject.plots,
        plot,
      ],
      updatedAt: new Date().toISOString(),
    };

    if (saveProject(updatedProject)) {
      setSelectedPlot(plot);
      setDraftCoordinates([]);
      setDrawingMode(false);
      setPlotNumber("");
      setEditorMessage(
        `Plot ${name} saved.`
      );
    }
  }

  async function handleImageUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";

    if (!file) return;

    const isSupportedImage =
      file.type === "image/png" ||
      file.type === "image/svg+xml" ||
      file.name.toLowerCase().endsWith(".svg");

    if (!isSupportedImage) {
      setEditorMessage(
        "Select a PNG or SVG society drawing."
      );
      return;
    }

    setEditorMessage("Uploading society drawing...");

    let document: { id: string; url: string };

    try {
      const body = new FormData();
      body.append("kind", "SOCIETY_DRAWING");
      body.append("file", file);
      const { data } = await api.post<{
        data?: { id: string; url: string };
      }>(`/admin/projects/${activeProject.id}/documents`, body);

      if (!data.data) throw new Error("Upload failed");
      document = data.data;
    } catch (error) {
      setEditorMessage(
        error instanceof Error
          ? `Could not upload the image: ${error.message}`
          : "Could not upload the image."
      );
      return;
    }

    const image = new Image();

    image.onload = () => {
      const aspectRatio =
        image.naturalWidth > 0 &&
        image.naturalHeight > 0
          ? image.naturalWidth /
            image.naturalHeight
          : 1;
      const widthMeters = 600;
      const heightMeters =
        widthMeters / aspectRatio;
      const latitudeDelta =
        heightMeters / 111_320 / 2;
      const longitudeDelta =
        widthMeters /
        (111_320 *
          Math.cos(
            activeProject.latitude *
              (Math.PI / 180)
          )) /
        2;
      const corners = [
        {
          lat:
            activeProject.latitude +
            latitudeDelta,
          lng:
            activeProject.longitude -
            longitudeDelta,
        },
        {
          lat:
            activeProject.latitude +
            latitudeDelta,
          lng:
            activeProject.longitude +
            longitudeDelta,
        },
        {
          lat:
            activeProject.latitude -
            latitudeDelta,
          lng:
            activeProject.longitude +
            longitudeDelta,
        },
        {
          lat:
            activeProject.latitude -
            latitudeDelta,
          lng:
            activeProject.longitude -
            longitudeDelta,
        },
      ];
      const updatedProject: Project = {
        ...activeProject,
        societyDrawing: {
          documentId: document.id,
          imageUrl: document.url,
          opacity: 0.85,
          corners,
          rotation: 0,
          scale: 1,
        },
        updatedAt: new Date().toISOString(),
      };

      if (saveProject(updatedProject)) {
        setSocietyImageSource(`/api/v1${document.url}`);
        setShowSocietyPlan(true);
        setPlanZoomRequest((request) => request + 1);
        setImageRotation(0);
        setImageScale(1);
        setDetectedPlotCoordinates([]);
        setEditorMessage(
          "Image uploaded. Drag, resize, or rotate it as needed."
        );
      }
    };

    image.onerror = () => {
      setEditorMessage(
        "Could not determine the image dimensions."
      );
    };

    image.src =
      file.type === "image/svg+xml"
        ? URL.createObjectURL(file)
        : `/api/v1${document.url}`;
  }

  function handleImageMove(
    corners: Coordinate[]
  ) {
    if (!activeProject.societyDrawing) {
      return;
    }

    const updatedProject: Project = {
      ...activeProject,
      societyDrawing: {
        ...activeProject.societyDrawing,
        corners,
        rotation: imageRotation,
        scale: imageScale,
      },
      updatedAt: new Date().toISOString(),
    };

    if (saveProject(updatedProject)) {
      setImageMoveMode(false);
      setPlotMoveMode(false);
      setPasteMode(false);
      setDetectedPlotCoordinates([]);
      setEditorMessage(
        "Image position saved."
      );
    }
  }

  function saveImageRotation() {
    if (!activeProject.societyDrawing) {
      return;
    }

    const updatedProject: Project = {
      ...activeProject,
      societyDrawing: {
        ...activeProject.societyDrawing,
        rotation: imageRotation,
        scale: imageScale,
      },
      updatedAt: new Date().toISOString(),
    };

    if (saveProject(updatedProject)) {
      setDetectedPlotCoordinates([]);
      setEditorMessage(
        "Image rotation saved."
      );
    }
  }

  function saveImageScale() {
    if (!activeProject.societyDrawing) {
      return;
    }

    const updatedProject: Project = {
      ...activeProject,
      societyDrawing: {
        ...activeProject.societyDrawing,
        rotation: imageRotation,
        scale: imageScale,
      },
      updatedAt: new Date().toISOString(),
    };

    if (saveProject(updatedProject)) {
      setDetectedPlotCoordinates([]);
      setEditorMessage(
        "Image size saved."
      );
    }
  }

  const previewDrawing =
    activeProject.societyDrawing && {
      ...activeProject.societyDrawing,
      rotation: imageRotation,
      scale: imageScale,
    };

  return (
    <AdminLayout user={user}>
      <div className="relative h-[calc(100vh-9rem)] w-full overflow-hidden rounded-xl border border-amber-900/10">
        <PlotMap
        latitude={
          activeProject.latitude
        }
        longitude={
          activeProject.longitude
        }
        plots={
          activeProject.plots
        }
        selectedPlotId={
          selectedPlot?.id ??
          null
        }
        onPlotClick={
          handlePlotClick
        }
        onPlotGeometryChange={
          handlePlotGeometryChange
        }
        drawingMode={drawingMode}
        boundaryCoordinates={
          draftCoordinates
        }
        societyBoundary={
          activeProject.societyBoundary
        }
        boundaryDrawingMode={
          boundaryDrawingMode
        }
        societyBoundaryDraftCoordinates={
          societyBoundaryDraftCoordinates
        }
        detectedPlotCoordinates={
          detectedPlotCoordinates
        }
        templatePlacementMode={
          templatePlacementMode
        }
        templatePreviewCoordinates={
          templatePreviewCoordinates
        }
        plotMoveMode={plotMoveMode}
        pasteMode={pasteMode}
        facilityPlacementMode={
          facilityPlacementMode
        }
        cursorCoordinate={cursorCoordinate}
        imageMoveMode={imageMoveMode}
        societyDrawing={previewDrawing}
        societyImageSource={
          societyImageSource ?? undefined
        }
        showSocietyPlan={showSocietyPlan}
        planZoomRequest={planZoomRequest}
        onCoordinateSelect={
          handleCoordinateSelect
        }
        onBoundaryCoordinateSelect={
          handleBoundaryCoordinateSelect
        }
        onCursorMove={setCursorCoordinate}
        onCursorExit={() =>
          setCursorCoordinate(null)
        }
        onTemplatePlace={handleTemplatePlace}
        onTemplateMove={
          setTemplatePreviewCoordinates
        }
        onPlotMove={handlePlotMove}
        onPlotMovePreview={previewPlotMove}
        onPaste={pasteCopiedPlot}
        onFacilityPlace={placeFacility}
        onFacilityMove={(facilityId, position) =>
          updateFacility(facilityId, { position })
        }
        onPlotRotate={() => rotateSelectedPlot(15)}
        highlightedSideCoordinates={
          highlightedSideCoordinates
        }
        facilities={facilities}
        selectedFacilityId={selectedFacilityId}
        onImageMove={handleImageMove}
      />

      <MapLegend />

      {pasteMode && (
        <div className="absolute left-5 top-5 z-[200] rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-lg">
          Click the map to paste the copied plot.
          <button
            type="button"
            onClick={() => setPasteMode(false)}
            className="ml-3 rounded-md bg-white/20 px-2 py-1 hover:bg-white/30"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() =>
              setPlanZoomRequest(
                (request) => request + 1
              )
            }
            disabled={
              !activeProject.societyDrawing &&
              !activeProject.societyBoundary
            }
            className="mt-2 rounded-lg border border-gray-700 px-3 py-2 text-sm font-semibold text-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Zoom to plan & boundary
          </button>
        </div>
      )}

      <section className="absolute right-5 bottom-5 z-[200] max-h-[calc(100vh-11rem)] w-[320px] overflow-y-auto rounded-2xl bg-white p-5 text-gray-900 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold">
            Plot editor
          </h2>

          <button
            type="button"
            onClick={() => {
              const nextDrawingMode =
                !drawingMode;

              setDrawingMode(nextDrawingMode);
                setFacilityPlacementMode(false);
                setPasteMode(false);
              setCursorCoordinate(null);
              setImageMoveMode(false);
              setPlotMoveMode(false);
              setFacilityPlacementMode(false);
              cancelTemplatePlacement();
              setSelectedPlot(null);
              setEditorMessage(null);
            }}
            className={
              drawingMode
                ? "rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white"
                : "rounded-lg bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-900"
            }
          >
            {drawingMode
              ? "Drawing enabled"
              : "Draw plot"}
          </button>
        </div>

        <p className="mt-3 text-sm text-gray-600">
          {drawingMode
            ? "Click the map to add each plot corner."
            : "Upload an image, adjust it, then draw a plot on top of it."}
        </p>

        <div className="mt-4 border-t border-gray-200 pt-4">
          <h3 className="text-sm font-bold">
            Society boundary
          </h3>
          <p className="mt-1 text-xs text-gray-600">
            Draw an area and fill it with a solid background beneath the plan image.
          </p>

          <label className="mt-3 flex items-center justify-between gap-3 text-sm font-medium">
            Background color
            <input
              type="color"
              value={boundaryColor}
              onChange={(event) =>
                setBoundaryColor(event.target.value)
              }
              className="h-9 w-12 rounded border border-gray-300 p-1"
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startBoundaryDrawing}
              className="rounded-lg bg-violet-700 px-3 py-2 text-sm font-semibold text-white"
            >
              Draw boundary
            </button>
            <button
              type="button"
              onClick={saveBoundaryColor}
              disabled={!activeProject.societyBoundary}
              className="rounded-lg border border-violet-700 px-3 py-2 text-sm font-semibold text-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save color
            </button>
            <button
              type="button"
              onClick={clearSocietyBoundary}
              disabled={!activeProject.societyBoundary}
              className="rounded-lg border border-red-700 px-3 py-2 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Remove boundary
            </button>
          </div>

          {boundaryDrawingMode && (
            <div className="mt-3 rounded-lg bg-violet-50 p-3">
              <p className="text-sm font-medium text-violet-900">
                {societyBoundaryDraftCoordinates.length} corner
                {societyBoundaryDraftCoordinates.length === 1
                  ? ""
                  : "s"} selected
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSocietyBoundaryDraftCoordinates(
                      (coordinates) =>
                        coordinates.slice(0, -1)
                    )
                  }
                  disabled={
                    societyBoundaryDraftCoordinates.length ===
                    0
                  }
                  className="rounded-lg border border-violet-700 px-3 py-2 text-sm font-semibold text-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Remove last
                </button>
                <button
                  type="button"
                  onClick={saveSocietyBoundary}
                  disabled={
                    societyBoundaryDraftCoordinates.length <
                    3
                  }
                  className="rounded-lg bg-violet-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save boundary
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBoundaryDrawingMode(false);
                    setSocietyBoundaryDraftCoordinates([]);
                    setCursorCoordinate(null);
                  }}
                  className="rounded-lg border border-violet-700 px-3 py-2 text-sm font-semibold text-violet-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 border-t border-gray-200 pt-4">
          <h3 className="text-sm font-bold">
            Facilities
          </h3>
          <p className="mt-1 text-xs text-gray-600">
            Add colored facility labels, then drag and rotate them on the map.
          </p>
          <label className="mt-3 block text-sm font-medium">
            Facility name
            <input
              type="text"
              value={facilityName}
              onChange={(event) =>
                setFacilityName(event.target.value)
              }
              placeholder="Park, clubhouse, temple"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="mt-2 flex items-center justify-between text-sm font-medium">
            Label color
            <input
              type="color"
              value={facilityColor}
              onChange={(event) =>
                setFacilityColor(event.target.value)
              }
              className="h-9 w-12 rounded border border-gray-300 p-1"
            />
          </label>
          <button
            type="button"
            onClick={startFacilityPlacement}
            className="mt-3 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-gray-950"
          >
            Place facility
          </button>

          {facilityPlacementMode && (
            <div className="mt-3 rounded-lg bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-900">
                Click the map to place the facility label.
              </p>
              <button
                type="button"
                onClick={() =>
                  setFacilityPlacementMode(false)
                }
                className="mt-2 rounded-lg border border-amber-700 px-3 py-2 text-sm font-semibold text-amber-800"
              >
                Cancel
              </button>
            </div>
          )}

          {facilities.length > 0 && (
            <ul className="mt-3 space-y-2">
              {facilities.map((facility) => (
                <li
                  key={facility.id}
                  className={
                    facility.id === selectedFacilityId
                      ? "rounded-lg border-2 border-amber-500 bg-amber-50 p-3"
                      : "rounded-lg bg-gray-50 p-3"
                  }
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedFacilityId(facility.id)
                    }
                    className="w-full text-left text-sm font-semibold"
                  >
                    {facility.name}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selectedFacility && (
            <div className="mt-3 rounded-lg bg-amber-50 p-3">
              <p className="text-sm font-semibold text-amber-950">
                {selectedFacility.name}
              </p>
              <p className="mt-1 text-xs text-amber-900">
                Drag this label directly on the map to move it.
              </p>
              <label className="mt-3 block text-sm font-medium text-amber-950">
                Rotate: {selectedFacility.rotation}°
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={selectedFacility.rotation}
                  onChange={(event) =>
                    updateFacility(
                      selectedFacility.id,
                      {
                        rotation: Number(
                          event.target.value
                        ),
                      }
                    )
                  }
                  className="mt-1 block w-full"
                />
              </label>
              <label className="mt-3 flex items-center justify-between gap-3 text-sm font-medium text-amber-950">
                Color
                <input
                  type="color"
                  value={selectedFacility.color}
                  onChange={(event) =>
                    updateFacility(
                      selectedFacility.id,
                      { color: event.target.value }
                    )
                  }
                  className="h-9 w-12 rounded border border-amber-700 p-1"
                />
              </label>
              <button
                type="button"
                onClick={deleteSelectedFacility}
                className="mt-3 rounded-lg border border-red-700 px-3 py-2 text-sm font-semibold text-red-700"
              >
                Delete facility
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 border-t border-gray-200 pt-4">
          <h3 className="text-sm font-bold">
            Plot library
          </h3>
          <p className="mt-1 text-xs text-gray-600">
            Create reusable sizes in feet, then place them on the map.
          </p>

          <label className="mt-3 block text-sm font-medium">
            Shape
            <select
              value={templateShape}
              onChange={(event) =>
                setTemplateShape(
                  event.target.value as PlotTemplate["shape"]
                )
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="RECTANGLE">
                Rectangle
              </option>
              <option value="TRAPEZOID">
                Trapezoid
              </option>
            </select>
          </label>

          <label className="mt-2 block text-sm font-medium">
            Template name (optional)
            <input
              type="text"
              value={templateName}
              onChange={(event) =>
                setTemplateName(event.target.value)
              }
              placeholder="30 x 50 residential"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>

          {templateShape === "RECTANGLE" ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <DimensionInput
                label="Frontage (ft)"
                value={frontageFeet}
                onChange={setFrontageFeet}
              />
              <DimensionInput
                label="Depth (ft)"
                value={depthFeet}
                onChange={setDepthFeet}
              />
            </div>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <DimensionInput
                label="Front (ft)"
                value={frontFeet}
                onChange={setFrontFeet}
              />
              <DimensionInput
                label="Back (ft)"
                value={backFeet}
                onChange={setBackFeet}
              />
              <DimensionInput
                label="Left side (ft)"
                value={leftFeet}
                onChange={setLeftFeet}
              />
              <DimensionInput
                label="Right side (ft)"
                value={rightFeet}
                onChange={setRightFeet}
              />
            </div>
          )}

          <button
            type="button"
            onClick={addPlotTemplate}
            className="mt-3 rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white"
          >
            Add to library
          </button>

          {plotLibrary.length > 0 && (
            <ul className="mt-3 space-y-2">
              {plotLibrary.map((template) => (
                <li
                  key={template.id}
                  className="rounded-lg bg-gray-50 p-3"
                >
                  <p className="text-sm font-semibold">
                    {template.name}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    {formatTemplateDimensions(template)}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        startTemplatePlacement(template)
                      }
                      className="rounded-md bg-orange-600 px-2 py-1 text-xs font-semibold text-white"
                    >
                      Place
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        deletePlotTemplate(template.id)
                      }
                      className="rounded-md border border-red-700 px-2 py-1 text-xs font-semibold text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {(templatePlacementMode ||
            templatePreviewCoordinates) && (
            <div className="mt-3 rounded-lg bg-orange-50 p-3">
              <p className="text-sm font-medium text-orange-900">
                {templatePlacementMode
                  ? "Click the map to place this template."
                  : "Drag the orange plus to move the template."}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={saveTemplatePlot}
                  disabled={!templatePreviewCoordinates}
                  className="rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save library plot
                </button>
                <button
                  type="button"
                  onClick={cancelTemplatePlacement}
                  className="rounded-lg border border-orange-700 px-3 py-2 text-sm font-semibold text-orange-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-3 text-sm font-medium">
          {draftCoordinates.length} point
          {draftCoordinates.length === 1
            ? ""
            : "s"} in the draft
        </p>

        <label className="mt-3 block text-sm font-medium">
          Society drawing (PNG or SVG)
          <input
            type="file"
            accept="image/png,image/svg+xml,.svg"
            onChange={handleImageUpload}
            className="mt-1 block w-full text-sm"
          />
        </label>

        {activeProject.societyDrawing && (
          <p className="mt-2 text-xs text-gray-600">
            Drag, resize, and rotate the image before drawing plots.
          </p>
        )}

        <button
          type="button"
          onClick={() => {
            setShowSocietyPlan((isVisible) => !isVisible);
            setImageMoveMode(false);
          }}
          disabled={!activeProject.societyDrawing}
          className="mt-2 rounded-lg border border-gray-700 px-3 py-2 text-sm font-semibold text-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {showSocietyPlan
            ? "Hide society plan"
            : "Show society plan"}
        </button>

        <button
          type="button"
          onClick={detectSvgPlots}
          disabled={!activeProject.societyDrawing}
          className="mt-3 rounded-lg border border-green-700 px-3 py-2 text-sm font-semibold text-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Detect SVG plots
        </button>

        {detectedPlotCoordinates.length > 0 && (
          <div className="mt-2 rounded-lg bg-green-50 p-3">
            <p className="text-sm font-medium text-green-900">
              {detectedPlotCoordinates.length} green
              {" "}candidate
              {detectedPlotCoordinates.length === 1
                ? ""
                : "s"} ready for review
            </p>

            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={saveDetectedPlots}
                className="rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white"
              >
                Save detected plots
              </button>
              <button
                type="button"
                onClick={() =>
                  setDetectedPlotCoordinates([])
                }
                className="rounded-lg border border-green-700 px-3 py-2 text-sm font-semibold text-green-800"
              >
                Clear candidates
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={
            !activeProject.societyDrawing ||
            activeProject.societyDrawing.corners.length !== 4 ||
            !showSocietyPlan
          }
          onClick={() => {
            setImageMoveMode(
              (isMoving) => !isMoving
            );
            setDrawingMode(false);
            setPlotMoveMode(false);
            setPasteMode(false);
            setFacilityPlacementMode(false);
            cancelTemplatePlacement();
            setEditorMessage(null);
          }}
          className="mt-2 rounded-lg border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {imageMoveMode
            ? "Drag image to move it"
            : "Move image"}
        </button>

        {imageMoveMode && (
          <p className="mt-2 text-xs text-gray-600">
            Drag the image directly on the map. Its
            new position is saved when you release it.
            Use arrow keys for 1 m movement or
            Shift + arrow keys for 10 m movement.
          </p>
        )}

        <label className="mt-3 block text-sm font-medium">
          Rotate image: {imageRotation}°
          <input
            type="range"
            min="-180"
            max="180"
            step="1"
            value={imageRotation}
            onChange={(event) =>
              setImageRotation(
                Number(event.target.value)
              )
            }
            disabled={
              !activeProject.societyDrawing ||
              activeProject.societyDrawing.corners.length !== 4
            }
            className="mt-1 block w-full"
          />
        </label>

        <button
          type="button"
          onClick={saveImageRotation}
          disabled={
            !activeProject.societyDrawing ||
            activeProject.societyDrawing.corners.length !== 4
          }
          className="mt-2 rounded-lg border border-amber-700 px-3 py-2 text-sm font-semibold text-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save rotation
        </button>

        <label className="mt-3 block text-sm font-medium">
          Resize image
          <input
            type="number"
            min="25"
            max="300"
            step="1"
            value={Math.round(imageScale * 100)}
            onChange={(event) => {
              const percent =
                event.target.valueAsNumber;

              if (Number.isFinite(percent)) {
                setImageScale(
                  Math.min(
                    3,
                    Math.max(0.25, percent / 100)
                  )
                );
              }
            }}
            disabled={!activeProject.societyDrawing}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
          <input
            type="range"
            min="0.25"
            max="3"
            step="0.01"
            value={imageScale}
            onChange={(event) =>
              setImageScale(
                Number(event.target.value)
              )
            }
            disabled={!activeProject.societyDrawing}
            className="mt-1 block w-full"
          />
        </label>

        <button
          type="button"
          onClick={saveImageScale}
          disabled={!activeProject.societyDrawing}
          className="mt-2 rounded-lg border border-sky-700 px-3 py-2 text-sm font-semibold text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save size
        </button>

        <button
          type="button"
          onClick={clearAllData}
          className="mt-4 w-full rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800"
        >
          Clear all data
        </button>

        {draftCoordinates.length > 0 && (
          <ol className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded-lg bg-gray-50 p-3 font-mono text-xs">
            {draftCoordinates.map(
              (coordinate, index) => (
                <li key={`${coordinate.lat}-${coordinate.lng}-${index}`}>
                  {index + 1}. {coordinate.lat.toFixed(6)},{" "}
                  {coordinate.lng.toFixed(6)}
                </li>
              )
            )}
          </ol>
        )}

        <label className="mt-3 block text-sm font-medium">
          Plot number
          <input
            type="text"
            value={plotNumber}
            onChange={(event) =>
              setPlotNumber(
                event.target.value
              )
            }
            placeholder={`P-${String(
              activeProject.plots.length + 1
            ).padStart(3, "0")}`}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() =>
              setDraftCoordinates(
                (coordinates) =>
                  coordinates.slice(0, -1)
              )
            }
            disabled={
              draftCoordinates.length === 0
            }
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Remove last
          </button>
          <button
            type="button"
            onClick={() => {
              setDraftCoordinates([]);
              setEditorMessage(null);
            }}
            disabled={
              draftCoordinates.length === 0
            }
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={saveDraftPlot}
            disabled={
              draftCoordinates.length < 3
            }
            className="rounded-lg bg-black px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save plot
          </button>
        </div>

        {editorMessage && (
          <p className="mt-3 text-sm text-gray-600">
            {editorMessage}
          </p>
        )}
      </section>

      {selectedPlot && (
        <PlotDetails
          key={selectedPlot.id}
          plot={
            selectedPlot
          }
          onClose={() =>
            setSelectedPlot(
              null
            )
          }
          onDelete={deleteSelectedPlot}
          onRotate={rotateSelectedPlot}
          isMoveMode={plotMoveMode}
          onMoveToggle={togglePlotMoveMode}
          onCopy={copySelectedPlot}
          onUpdate={updateSelectedPlotDetails}
          onResizeSide={resizeSelectedPlotSide}
          onHighlightSide={setHighlightedSideIndex}
        />
      )}
      </div>
    </AdminLayout>
  );
}