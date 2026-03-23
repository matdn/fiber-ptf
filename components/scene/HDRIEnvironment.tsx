"use client";

import { Environment } from "@react-three/drei";
import { Component, type ReactNode, Suspense, useMemo } from "react";
import { type TimeSlot, TIME_SLOTS, getCurrentTimeSlot } from "@/lib/hdriSlots";

export type { TimeSlot };
export { TIME_SLOTS, getCurrentTimeSlot };

// ─── Error boundary – renders null if the HDR file fails to load ─────────────

class HDRIErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

// ─── Inner loader (inside Suspense) ─────────────────────────────────────────

function HDRILoader({ slot }: { slot: TimeSlot }) {
  return (
    <Environment
      files={slot.hdri}
      background
      backgroundBlurriness={slot.bgBlurriness}
      backgroundIntensity={slot.bgIntensity}
      environmentIntensity={slot.envIntensity}
    />
  );
}

// ─── Public component ────────────────────────────────────────────────────────

/**
 * Wraps drei's <Environment> so that:
 * - The HDR file is resolved by the current local hour.
 * - A missing file degrades gracefully (ErrorBoundary → null).
 * - The Suspense fallback is null so the scene stays visible while loading.
 *
 * Place the matching .hdr files in /public/hdri/ – see /public/hdri/README.md.
 */
export function HDRIEnvironment({ active, forcedSlotIndex }: { active: boolean; forcedSlotIndex?: number }) {
  const autoSlot = useMemo(() => getCurrentTimeSlot(), []);
  const slot = forcedSlotIndex !== undefined
    ? (TIME_SLOTS[forcedSlotIndex] ?? autoSlot)
    : autoSlot;

  if (!active) return null;

  return (
    <HDRIErrorBoundary>
      <Suspense fallback={null}>
        <HDRILoader slot={slot} />
      </Suspense>
    </HDRIErrorBoundary>
  );
}
