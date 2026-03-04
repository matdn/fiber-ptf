"use client";

export function TransitionFlashOverlay({
  show,
  flashOverlayRef,
}: {
  show: boolean;
  flashOverlayRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (!show) return null;

  return (
    <div
      ref={flashOverlayRef}
      className="absolute inset-0 pointer-events-none bg-black"
      style={{ opacity: 0, zIndex: 10 }}
    />
  );
}
