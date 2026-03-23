# HDRI Environment Maps

Place one `.hdr` file per time slot in this folder.  
The scene will automatically pick the matching file based on the **user's local clock** at page load.

---

## File mapping

| Slot        | Local hours | Filename          |
|-------------|-------------|-------------------|
| **night**   | 00 h – 05 h | `night.hdr`       |
| **dawn**    | 05 h – 08 h | `dawn.hdr`        |
| **morning** | 08 h – 12 h | `morning.hdr`     |
| **noon**    | 12 h – 15 h | `noon.hdr`        |
| **afternoon**| 15 h – 18 h| `afternoon.hdr`   |
| **dusk**    | 18 h – 21 h | `dusk.hdr`        |
| **night**   | 21 h – 24 h | `night.hdr`       |

> `night.hdr` is reused for both night slots — you only need one file.

---

## Recommended sources

- [Poly Haven](https://polyhaven.com/hdris) — free, CC0 HDRIs
- Resolution: **2 K** is plenty for backgrounds; use 4 K only if you need sharp reflections.
- Format: **`.hdr`** (Radiance). EXR is also supported by drei but HDR is lighter.

---

## Behaviour when files are missing

If a `.hdr` file is absent the scene falls back silently to the solid black background  
(an `ErrorBoundary` swallows the load error — see `components/scene/HDRIEnvironment.tsx`).

---

## Tuning per slot

Open `components/scene/HDRIEnvironment.tsx` and adjust the `TIME_SLOTS` array:

```ts
{
  name: "dusk",
  hourStart: 18,
  hourEnd: 21,
  hdri: "/hdri/dusk.hdr",
  envIntensity: 0.8,      // IBL lighting contribution (0 – 2)
  bgBlurriness: 0.12,     // background blur (0 = sharp)
  bgIntensity: 1,         // background brightness multiplier
}
```
