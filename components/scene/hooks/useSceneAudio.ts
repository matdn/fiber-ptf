"use client";

import { useEffect } from "react";
import { useAudio } from "@/hooks/useAudio";

const DEFAULT_VOLUMES = {
  mainSceneBackSound: 0.3,
  mainScenePlusSound: 0.25,
  underwaterSceneBackSound: 0.2,
  spaceSceneBackSound: 0.25,
};

export function useSceneAudio({
  volumes,
  isMuted,
  isInSpace,
  isUnderwater,
}: {
  volumes?: { [key: string]: number };
  isMuted: boolean;
  isInSpace: boolean;
  isUnderwater: boolean;
}) {
  const { initAudio, playSound, stopSound, setVolume } = useAudio();

  const volumeSettings = {
    mainSceneBackSound:
      volumes?.mainSceneBackSound ?? DEFAULT_VOLUMES.mainSceneBackSound,
    mainScenePlusSound:
      volumes?.mainScenePlusSound ?? DEFAULT_VOLUMES.mainScenePlusSound,
    underwaterSceneBackSound:
      volumes?.underwaterSceneBackSound ??
      DEFAULT_VOLUMES.underwaterSceneBackSound,
    spaceSceneBackSound:
      volumes?.spaceSceneBackSound ?? DEFAULT_VOLUMES.spaceSceneBackSound,
  };

  useEffect(() => {
    initAudio("mainSceneBackSound", {
      url: "/sounds/mainSceneBackSound.mp3",
      volume: volumeSettings.mainSceneBackSound,
      loop: true,
    });
    initAudio("mainScenePlusSound", {
      url: "/sounds/mainScenePlusSound.mp3",
      volume: volumeSettings.mainScenePlusSound,
      loop: true,
    });
    initAudio("underwaterSceneBackSound", {
      url: "/sounds/underwaterSceneBackSound.mp3",
      volume: volumeSettings.underwaterSceneBackSound,
      loop: true,
    });
    initAudio("spaceSceneBackSound", {
      url: "/sounds/spaceSceneBackSound.mp3",
      volume: volumeSettings.spaceSceneBackSound,
      loop: true,
    });
  }, [
    initAudio,
    volumeSettings.mainSceneBackSound,
    volumeSettings.mainScenePlusSound,
    volumeSettings.spaceSceneBackSound,
    volumeSettings.underwaterSceneBackSound,
  ]);

  useEffect(() => {
    setVolume("mainSceneBackSound", volumeSettings.mainSceneBackSound);
    setVolume("mainScenePlusSound", volumeSettings.mainScenePlusSound);
    setVolume(
      "underwaterSceneBackSound",
      volumeSettings.underwaterSceneBackSound,
    );
    setVolume("spaceSceneBackSound", volumeSettings.spaceSceneBackSound);
  }, [
    setVolume,
    volumeSettings.mainSceneBackSound,
    volumeSettings.mainScenePlusSound,
    volumeSettings.spaceSceneBackSound,
    volumeSettings.underwaterSceneBackSound,
  ]);

  useEffect(() => {
    const handleFirstInteraction = () => {
      if (isMuted) return;
      playSound("mainSceneBackSound");
      playSound("mainScenePlusSound");
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };

    if (!isMuted) {
      playSound("mainSceneBackSound");
      playSound("mainScenePlusSound");
    }

    window.addEventListener("click", handleFirstInteraction);
    window.addEventListener("keydown", handleFirstInteraction);

    return () => {
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
  }, [isMuted, playSound]);

  useEffect(() => {
    if (isMuted) {
      stopSound("mainSceneBackSound");
      stopSound("mainScenePlusSound");
      stopSound("underwaterSceneBackSound");
      stopSound("spaceSceneBackSound");
      return;
    }

    if (isInSpace) {
      playSound("spaceSceneBackSound");
      return;
    }

    if (isUnderwater) {
      playSound("underwaterSceneBackSound");
      return;
    }

    playSound("mainSceneBackSound");
    playSound("mainScenePlusSound");
  }, [isMuted, isInSpace, isUnderwater, playSound, stopSound]);

  useEffect(() => {
    if (isMuted) return;

    if (isInSpace) {
      stopSound("mainSceneBackSound");
      stopSound("mainScenePlusSound");
      stopSound("underwaterSceneBackSound");
      playSound("spaceSceneBackSound");
      return;
    }

    if (isUnderwater) {
      stopSound("mainSceneBackSound");
      stopSound("mainScenePlusSound");
      stopSound("spaceSceneBackSound");
      playSound("underwaterSceneBackSound");
      return;
    }

    playSound("mainSceneBackSound");
    playSound("mainScenePlusSound");
    stopSound("underwaterSceneBackSound");
    stopSound("spaceSceneBackSound");
  }, [isUnderwater, isInSpace, isMuted, playSound, stopSound]);
}
