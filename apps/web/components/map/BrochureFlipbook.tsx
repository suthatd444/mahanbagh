"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { FlipbookViewer } from "flipbook-viewer";

interface BrochureFlipbookProps {
  url: string;
  title: string;
  onClose: () => void;
}

export default function BrochureFlipbook({
  url,
  title,
  onClose,
}: BrochureFlipbookProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<FlipbookViewer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [{ init: flipbook }, { createPdfBook }] = await Promise.all([
          import("flipbook-viewer"),
          import("../../lib/pdf-book"),
        ]);

        if (cancelled) return;

        const book = await createPdfBook(url);
        if (cancelled) return;

        const width = Math.max(320, Math.min(window.innerWidth - 96, 1100));
        const height = Math.max(320, Math.min(window.innerHeight - 180, 760));

        await new Promise<void>((resolve, reject) => {
          flipbook(
            book,
            container,
            { width, height, backgroundColor: "#111827" },
            (err, viewer) => {
              if (err || !viewer) {
                reject(err || "Unable to open the brochure.");
                return;
              }
              viewerRef.current = viewer;
              viewer.on("seen", (seenPage) => {
                setPage(Math.max(1, seenPage));
              });
              setTotalPages(viewer.page_count);
              resolve();
            },
          );
        });

        if (!cancelled) setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(
            typeof err === "string" ? err : "Unable to load the brochure.",
          );
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  const handlePrev = useCallback(() => {
    viewerRef.current?.flip_back();
  }, []);

  const handleNext = useCallback(() => {
    viewerRef.current?.flip_forward();
  }, []);

  const handleZoom = useCallback(() => {
    viewerRef.current?.zoom();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowLeft") handlePrev();
      else if (event.key === "ArrowRight") handleNext();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, handlePrev, handleNext]);

  const controlClass =
    "rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col bg-black/80">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 px-4 sm:px-6">
        <p className="truncate font-serif text-base font-semibold text-white">
          {title}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close brochure"
          className="shrink-0 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
        >
          Close
        </button>
      </header>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4">
        {loading && !error && (
          <p className="absolute text-sm text-white/70">
            Loading brochure...
          </p>
        )}

        {error && <p className="absolute text-sm text-red-300">{error}</p>}

        <div ref={containerRef} className="max-h-full max-w-full" />
      </div>

      {!error && (
        <footer className="flex h-16 shrink-0 items-center justify-center gap-3">
          <button
            type="button"
            onClick={handlePrev}
            disabled={loading || page <= 1}
            className={controlClass}
          >
            Prev
          </button>

          <span className="min-w-[110px] text-center text-sm text-white/80">
            {totalPages > 0 ? `Page ${page} of ${totalPages}` : ""}
          </span>

          <button
            type="button"
            onClick={handleNext}
            disabled={loading || (totalPages > 0 && page >= totalPages)}
            className={controlClass}
          >
            Next
          </button>

          <button
            type="button"
            onClick={handleZoom}
            disabled={loading}
            className={controlClass}
          >
            Zoom
          </button>
        </footer>
      )}
    </div>
  );
}
