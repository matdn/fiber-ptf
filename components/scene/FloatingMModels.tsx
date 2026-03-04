"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

type AnchorInput = THREE.Vector3 | [number, number, number];

type PointerRef = { current: { x: number; y: number } };

type BodySeed = {
  anchor: [number, number, number];
  rotation: [number, number, number];
  angularVelocity: [number, number, number];
  baseScale: number;
  seed: number;
  exitDir: [number, number, number];
};

const BODY_SEED_CACHE = new Map<string, BodySeed[]>();

function hashStringToUint32(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seeded01(seed: number) {
  // xorshift32
  let x = seed >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return ((x >>> 0) % 1_000_000) / 1_000_000;
}

function toAnchorTuple(anchor: AnchorInput): [number, number, number] {
  if (anchor instanceof THREE.Vector3) return [anchor.x, anchor.y, anchor.z];
  return [anchor[0], anchor[1], anchor[2]];
}

function anchorsEqual(
  a: [number, number, number],
  b: [number, number, number],
  eps = 1e-6,
) {
  return (
    Math.abs(a[0] - b[0]) <= eps &&
    Math.abs(a[1] - b[1]) <= eps &&
    Math.abs(a[2] - b[2]) <= eps
  );
}

function sameAnchorList(a: BodySeed[], anchors: Array<[number, number, number]>) {
  if (a.length !== anchors.length) return false;
  for (let i = 0; i < anchors.length; i++) {
    if (!anchorsEqual(a[i]!.anchor, anchors[i]!)) return false;
  }
  return true;
}

type Body = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Euler;
  angularVelocity: THREE.Vector3;
  scale: number;
  seed: number;
  anchor: THREE.Vector3;
  exitDir: THREE.Vector3;
};

export function FloatingMModels({
  count = 3,
  scaleMultiplier = 1,
  attachToCamera = true,
  outProgressTarget = 0,
  outProgressRef,
  anchors,
  cacheKey = "floating-m-models",
  preset = "corners-center",
  pointerRef,
  color,
}: {
  count?: number;
  scaleMultiplier?: number;
  attachToCamera?: boolean;
  outProgressTarget?: number;
  outProgressRef?: { current: number };
  anchors?: Array<AnchorInput>;
  cacheKey?: string | false;
  preset?: "corners-center" | "random";
  pointerRef?: PointerRef;
  color?: THREE.ColorRepresentation;
}) {
  const gltf = useGLTF("/m.glb");
  const groupRef = useRef<THREE.Group>(null);
  const itemRefs = useRef<Array<THREE.Group | null>>([]);

  const { viewport } = useThree();

  const resolvedCount = anchors?.length ?? count;

  const anchorTuples = useMemo(() => {
    if (anchors) return anchors.map(toAnchorTuple);
    if (preset !== "corners-center") return undefined;

    const x = viewport.width * 0.38;
    const y = viewport.height * 0.38;
    const jitterX = viewport.width * 0.03;
    const jitterY = viewport.height * 0.03;
    const keySeed = hashStringToUint32(String(cacheKey ?? "floating-m-models"));

    const base: Array<[number, number, number]> = [
      [-x, y, 0.18],
      [x, y, -0.18],
      [-x, -y, -0.12],
      [x, -y, 0.12],
      [0, 0, 0.28],
    ];

    return Array.from({ length: resolvedCount }, (_, i) => {
      const b = base[i % base.length]!;
      // Deterministic extra depth so duplicates don't overlap perfectly.
      const extraZ = i >= base.length ? (i - base.length + 1) * 0.12 : 0;
      const seed = keySeed ^ ((i + 1) * 0x9e3779b9);
      const jx = (seeded01(seed) * 2 - 1) * jitterX;
      const jy = (seeded01(seed ^ 0x85ebca6b) * 2 - 1) * jitterY;
      return [b[0] + jx, b[1] + jy, b[2] + extraZ] as [number, number, number];
    });
  }, [anchors, cacheKey, preset, resolvedCount, viewport.height, viewport.width]);

  const bodySeeds = useMemo<BodySeed[]>(() => {
    const cacheId = cacheKey === false ? null : cacheKey;
    if (cacheId) {
      const cached = BODY_SEED_CACHE.get(cacheId);
      const canReuse =
        cached &&
        cached.length === resolvedCount &&
        (!anchorTuples || sameAnchorList(cached, anchorTuples));

      if (canReuse) return cached;
    }

    const rand = (min: number, max: number) => min + Math.random() * (max - min);
    const spreadX = viewport.width * 0.55;
    const spreadY = viewport.height * 0.55;

    const next = Array.from({ length: resolvedCount }, (_, index) => {
      const anchor = anchorTuples?.[index]
        ? anchorTuples[index]!
        : ([
            rand(-spreadX, spreadX),
            rand(-spreadY, spreadY),
            rand(-2.2, 2.2),
          ] as [number, number, number]);

      const exitDirVec = new THREE.Vector3(
        rand(-1, 1),
        rand(-1, 1),
        rand(-0.2, 1.2),
      ).normalize();

      return {
        anchor,
        rotation: [
          rand(0, Math.PI),
          rand(0, Math.PI),
          rand(0, Math.PI),
        ] as [number, number, number],
        angularVelocity: [
          rand(-0.7, 0.7),
          rand(-0.7, 0.7),
          rand(-0.5, 0.5),
        ] as [number, number, number],
        baseScale: rand(0.7, 1.25),
        seed: Math.random() * 1000,
        exitDir: [exitDirVec.x, exitDirVec.y, exitDirVec.z] as [
          number,
          number,
          number,
        ],
      };
    });

    if (cacheKey !== false) {
      BODY_SEED_CACHE.set(cacheKey ?? "floating-m-models", next);
    }

    return next;
  }, [anchorTuples, cacheKey, resolvedCount, viewport.height, viewport.width]);

  const bodies = useMemo<Body[]>(() => {
    return bodySeeds.map((seed) => {
      const anchor = new THREE.Vector3(seed.anchor[0], seed.anchor[1], seed.anchor[2]);

      return {
        anchor,
        position: anchor.clone(),
        velocity: new THREE.Vector3(0, 0, 0),
        rotation: new THREE.Euler(seed.rotation[0], seed.rotation[1], seed.rotation[2]),
        angularVelocity: new THREE.Vector3(
          seed.angularVelocity[0],
          seed.angularVelocity[1],
          seed.angularVelocity[2],
        ),
        scale: seed.baseScale * scaleMultiplier,
        seed: seed.seed,
        exitDir: new THREE.Vector3(seed.exitDir[0], seed.exitDir[1], seed.exitDir[2]),
      };
    });
  }, [bodySeeds, scaleMultiplier]);

  const instanceObjects = useMemo(() => {
    return Array.from({ length: resolvedCount }, () => {
      const root = gltf.scene.clone(true);

      // Ensure each instance has unique materials so per-project tint doesn't leak
      // to other FloatingMModels usages.
      root.traverse((child) => {
        const mesh = child as unknown as THREE.Mesh;
        if (!(mesh as unknown as { isMesh?: boolean }).isMesh) return;

        const mat = (mesh as unknown as { material?: unknown }).material as
          | THREE.Material
          | THREE.Material[]
          | undefined;
        if (!mat) return;

        if (Array.isArray(mat)) {
          (mesh as unknown as { material: THREE.Material[] }).material = mat.map((m) => m.clone());
        } else {
          (mesh as unknown as { material: THREE.Material }).material = mat.clone();
        }
      });

      return root;
    });
  }, [gltf.scene, resolvedCount]);

  useEffect(() => {
    if (!color) return;

    const next = new THREE.Color(color);
    for (const root of instanceObjects) {
      root.traverse((child) => {
        const mesh = child as unknown as THREE.Mesh;
        if (!(mesh as unknown as { isMesh?: boolean }).isMesh) return;

        const mat = (mesh as unknown as { material?: unknown }).material as
          | THREE.Material
          | THREE.Material[]
          | undefined;
        if (!mat) return;

        const apply = (m: THREE.Material) => {
          const maybe = m as unknown as { color?: THREE.Color };
          if (maybe.color) maybe.color.set(next);
        };

        if (Array.isArray(mat)) mat.forEach(apply);
        else apply(mat);
      });
    }
  }, [color, instanceObjects]);

  const forward = useMemo(() => new THREE.Vector3(), []);
  const tmpVec = useMemo(() => new THREE.Vector3(), []);
  const floatOffset = useMemo(() => new THREE.Vector3(), []);
  const outProgressInternalRef = useRef(1);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    // Smoothly approach the desired out-of-view progress.
    const desired =
      typeof outProgressRef?.current === "number"
        ? outProgressRef.current
        : outProgressTarget;
    const clampedTarget = Math.min(1, Math.max(0, desired));
    const t = 1 - Math.exp(-6.0 * delta);
    outProgressInternalRef.current +=
      (clampedTarget - outProgressInternalRef.current) * t;
    const out = outProgressInternalRef.current;
    const outEased = out * out * (3 - 2 * out);

    // Optionally keep objects in view by attaching them to the camera.
    if (attachToCamera) {
      forward.set(0, 0, -1).applyQuaternion(state.camera.quaternion);
      group.position.copy(state.camera.position).addScaledVector(forward, 14);
      group.quaternion.copy(state.camera.quaternion);
    } else {
      group.position.set(0, 0, 0);
      group.quaternion.identity();
    }

    // Global exit scale (keep visible but smaller as it leaves).
    group.scale.setScalar(Math.max(0.15, 1 - outEased * 0.75));

    // Cursor target in the camera-attached local space.
    const pointer = pointerRef?.current ?? state.pointer;
    const targetX = pointer.x * viewport.width * 0.5;
    const targetY = pointer.y * viewport.height * 0.5;

    const repelRadius = 1.65;
    const repelStrength = 7.2 * (1 - outEased);

    // Keep an anchored layout, but add a gentle drift so the set feels alive.
    const tClock = state.clock.elapsedTime;
    const floatAmpX = viewport.width * 0.012;
    const floatAmpY = viewport.height * 0.012;
    const floatAmpZ = 0.06;

    const springStrength = 1.05;
    const velocityDamp = Math.exp(-2.6 * delta);
    const maxSpeed = 3.2;
    const exitDistance = Math.max(viewport.width, viewport.height) * 2.2;

    for (let i = 0; i < bodies.length; i++) {
      const body = bodies[i];
      const node = itemRefs.current[i];
      if (!node) continue;

      // Spring back toward each instance's anchor (keeps them spread out),
      // with a small animated drift around that anchor.
      floatOffset.set(
        Math.sin(tClock * 0.55 + body.seed * 0.9) * floatAmpX,
        Math.cos(tClock * 0.48 + body.seed * 1.1) * floatAmpY,
        Math.sin(tClock * 0.35 + body.seed * 1.7) * floatAmpZ,
      );

      const targetAx = body.anchor.x + floatOffset.x;
      const targetAy = body.anchor.y + floatOffset.y;
      const targetAz = body.anchor.z + floatOffset.z;

      body.velocity.x += (targetAx - body.position.x) * springStrength * delta;
      body.velocity.y += (targetAy - body.position.y) * springStrength * delta;
      body.velocity.z += (targetAz - body.position.z) * springStrength * delta;

      // Cursor repulsion (gentle): push away when close.
      tmpVec.set(body.position.x - targetX, body.position.y - targetY, 0);
      const dist = tmpVec.length();
      if (dist > 1e-4 && dist < repelRadius) {
        tmpVec.multiplyScalar(1 / dist);
        const t = 1 - dist / repelRadius;
        const force = repelStrength * t * t;
        body.velocity.x += tmpVec.x * force * delta;
        body.velocity.y += tmpVec.y * force * delta;
      }
      body.velocity.multiplyScalar(velocityDamp);

      const speed = body.velocity.length();
      if (speed > maxSpeed) body.velocity.multiplyScalar(maxSpeed / speed);
      body.position.addScaledVector(body.velocity, delta);

      body.rotation.x += body.angularVelocity.x * delta;
      body.rotation.y += body.angularVelocity.y * delta;
      body.rotation.z += body.angularVelocity.z * delta;

      node.position
        .copy(body.position)
        .addScaledVector(body.exitDir, outEased * exitDistance);
      node.rotation.copy(body.rotation);
      node.scale.setScalar(body.scale);
    }
  });

  return (
    <group ref={groupRef} raycast={() => null}>
      {bodies.map((_, i) => (
        <group
          // biome-ignore lint/suspicious/noArrayIndexKey: stable, small list
          key={i}
          ref={(node) => {
            itemRefs.current[i] = node;
          }}
        >
          <primitive object={instanceObjects[i]!} />
        </group>
      ))}
    </group>
  );
}

useGLTF.preload("/m.glb");
