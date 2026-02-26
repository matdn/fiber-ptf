import type { DisplacementTransitionEffect } from "./DisplacementTransitionEffect";
import type { UnderwaterRaysEffect } from "./UnderwaterRaysEffect";

export type SceneTransitionState = {
  isTransitioning: boolean;
  bloomIntensity: number;
  underwaterFog: {
    near: number;
    far: number;
  };
  showFluidEffect: boolean;
  showUnderwaterEffects: boolean;
  scrollOffset: number;
};

export type SceneEffects = {
  underwaterRaysEffect: UnderwaterRaysEffect;
  displacementEffect: DisplacementTransitionEffect;
};
