import * as THREE from 'three'
import gsap from 'gsap'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { PROJECTS } from '@/lib/projectImages'
import type { ProjectItem } from '@/lib/projectImages'

const EXCLUDED = new Set<string>([])
const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '')

interface Card {
  id: number; projectIndex: number; gridX: number; gridY: number
  position: [number, number, number]; scale: number; visible: boolean
  isPortrait: boolean; mesh?: THREE.Mesh
}

type GridOptions = {
  distortionMax?: number; snapBackOnIdle?: boolean; cursorOffsetStrength?: number
  viewPaddingX?: number; viewPaddingY?: number; pruneBuffer?: number
}

export class ProjectsGrid extends THREE.Group {
  private cards = new Map<string, Card>()
  private nextCardId = 0
  private velocity = new THREE.Vector2()
  private dragAction = new THREE.Vector2()
  private isDragging = false
  private positionOffset = new THREE.Vector2()
  private mouseUv = new THREE.Vector2(0.5, 0.5)
  private tmp = new THREE.Vector2()
  private tmpB = new THREE.Vector2()
  private zero = new THREE.Vector2()
  private camera: THREE.Camera
  private sx = 9; private sy = 6
  private cols = 7; private rows = 5
  private vpX = 20; private vpY = 15
  private pruneBuffer = 4
  private distortionIntensity = 0
  private distortionMax = 0.08
  private snapBackOnIdle = false
  private cursorStrength = 0.2
  private onDistortionChange: (i: number) => void
  private distortionTween: gsap.core.Tween | null = null
  private snapTween: gsap.core.Tween | null = null
  private snapTarget = new THREE.Vector2()
  private isSnapping = false
  private lastSnapMs = 0
  private snapPending = false
  private snapIdleMs = 90
  private snapLerp = 0.15
  private tLoader = new THREE.TextureLoader()
  private tCache = new Map<string, THREE.Texture>()
  private tCbs = new Map<string, Array<(t: THREE.Texture) => void>>()
  private projects = PROJECTS.filter(p => !EXCLUDED.has(norm(p.title)))
  private urls = this.projects.map(p => p.imageUrl)
  private introTimeouts: number[] = []
  private bgGrid: LineSegments2 | null = null
  private raycaster = new THREE.Raycaster()
  private ptrNdc = new THREE.Vector2()
  private lastMX = 0; private lastMY = 0

  constructor(camera: THREE.Camera, onDistortionChange: (i: number) => void, opts?: GridOptions) {
    super()
    this.camera = camera
    this.onDistortionChange = onDistortionChange
    this.distortionMax = opts?.distortionMax ?? 0.8
    this.snapBackOnIdle = opts?.snapBackOnIdle ?? false
    this.cursorStrength = opts?.cursorOffsetStrength ?? 0.2
    this.vpX = opts?.viewPaddingX ?? 20
    this.vpY = opts?.viewPaddingY ?? 15
    this.pruneBuffer = opts?.pruneBuffer ?? 4
    // this.initGrid()
    // this.createBgGrid()
  }

  private createBgGrid() {
    const [hw, hh] = [225, 180]
    const pos: number[] = []
    for (let x = -hw; x <= hw + 1; x += this.sx) pos.push(x, -hh, 0, x, hh, 0)
    for (let y = -hh; y <= hh + 1; y += this.sy) pos.push(-hw, y, 0, hw, y, 0)
    const geo = new LineSegmentsGeometry()
    geo.setPositions(pos)
    const mat = new LineMaterial({
      color: 0x1a1a1a,
      transparent: true,
      opacity: 1,
      linewidth: 1.5,
      resolution: new THREE.Vector2(typeof window !== 'undefined' ? window.innerWidth : 1920, typeof window !== 'undefined' ? window.innerHeight : 1080),
    })
    this.bgGrid = new LineSegments2(geo, mat)
    this.bgGrid.position.set(this.sx / 2, this.sy / 2, -0.05)
    this.add(this.bgGrid)
  }

  private key(x: number, y: number) { return `${x},${y}` }

  private createCard(gx: number, gy: number): Card {
    const N = this.projects.length, b = Math.ceil(N / 2)
    let a = 2
    while (a < N && (a % N === 0 || (a + b) % N === 0 || ((a - b) % N + N) % N === 0)) a++
    return {
      id: this.nextCardId++, projectIndex: N > 0 ? ((gx * a + gy * b) % N + N) % N : 0,
      gridX: gx, gridY: gy, position: [gx * this.sx, gy * this.sy, 0],
      scale: 1, visible: false, isPortrait: (gx + gy) % 2 === 0,
    }
  }

  private initGrid() {
    for (let x = -Math.floor(this.cols / 2); x <= Math.floor(this.cols / 2); x++)
      for (let y = -Math.floor(this.rows / 2); y <= Math.floor(this.rows / 2); y++) {
        const card = this.createCard(x, y)
        this.cards.set(this.key(x, y), card)
        this.mkMesh(card)
      }
  }

  private mkMesh(card: Card) {
    const mat = new THREE.MeshBasicMaterial({ side: THREE.FrontSide, transparent: true, opacity: 0 })
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(card.isPortrait ? 3.5 : 4.5, card.isPortrait ? 4.5 : 3.5), mat)
    mesh.position.set(...card.position)
    mesh.scale.set(1, 0, 1)
    mesh.visible = false
    mesh.userData.projectIndex = card.projectIndex
    card.mesh = mesh
    this.add(mesh)
    this.loadTex(this.urls[card.projectIndex], (tex) => {
      const { width: w = 1, height: h = 1 } = tex.image as { width?: number; height?: number }
      const tw = 4 * (w / (h || 1))
      mesh.geometry.dispose()
      mesh.geometry = new THREE.PlaneGeometry(tw, 4)
      mat.map = tex; mat.needsUpdate = true
    })
  }

  pickProjectAt(cx: number, cy: number, w: number, h: number): ProjectItem | null {
    if (!w || !h) return null
    this.ptrNdc.set((cx / w) * 2 - 1, -(cy / h) * 2 + 1)
    this.raycaster.setFromCamera(this.ptrNdc, this.camera as THREE.Camera)
    const hit = this.raycaster.intersectObjects(this.children, false)[0]?.object
    const idx = hit?.userData?.projectIndex
    return typeof idx === 'number' ? this.projects[idx] ?? null : null
  }

  private loadTex(url: string, cb: (t: THREE.Texture) => void) {
    const cached = this.tCache.get(url)
    if (cached?.image) return cb(cached)
    const cbs = this.tCbs.get(url)
    if (cbs) return void cbs.push(cb)
    this.tCbs.set(url, [cb])
    this.tLoader.load(url, (t) => {
      this.tCache.set(url, t)
      const fns = this.tCbs.get(url) ?? []
      this.tCbs.delete(url)
      for (const f of fns) f(t)
    })
  }

  showCard(card: Card) {
    if (!card?.mesh || card.visible) return
    card.visible = true; card.mesh.visible = true
    gsap.killTweensOf(card.mesh.scale); gsap.killTweensOf(card.mesh.material)
    card.mesh.scale.y = 0.001
    gsap.to(card.mesh.scale, { y: 1, duration: 0.26, ease: 'back.out(2.2)' })
    gsap.to(card.mesh.material as THREE.MeshBasicMaterial, { opacity: 1, duration: 0.18, ease: 'power1.out' })
  }

  hideCard(card: Card) {
    if (!card?.mesh || !card.visible) return
    gsap.to(card.mesh.scale, { y: 0, duration: 0.8, ease: 'power2.in' })
    gsap.to(card.mesh.material as THREE.MeshBasicMaterial, {
      opacity: 0, duration: 0.6, ease: 'power2.in',
      onComplete: () => { if (card.mesh) { card.mesh.visible = false; card.visible = false } },
    })
  }

  showInitialCards(delayMs = 0) {
    this.introTimeouts.forEach(clearTimeout)
    this.introTimeouts = []
    for (const card of this.cards.values())
      this.introTimeouts.push(window.setTimeout(() => this.showCard(card), Math.max(0, delayMs) + Math.random() * 900))
  }

  hideAllCards(delay = 0) {
    const cards = Array.from(this.cards.values())
    for (let i = 0; i < cards.length; i++)
      setTimeout(() => this.hideCard(cards[i]), delay + i * (2000 / cards.length))
  }

  onPointerMove(cx: number, cy: number, w: number, h: number) {
    this.mouseUv.set(cx / w, 1 - cy / h)
    if (!this.isDragging) return
    this.drag(new THREE.Vector2((cx - this.lastMX) * 0.01, -(cy - this.lastMY) * 0.01))
    this.lastMX = cx; this.lastMY = cy
  }

  onPointerDown(cx: number, cy: number) {
    this.isDragging = true; this.isSnapping = false
    this.snapTween?.kill(); this.snapTween = null
    this.lastMX = cx; this.lastMY = cy
    gsap.to(this.camera.position, { z: 12.5, duration: 1, ease: 'power2.out' })
    this.setDistortion(this.distortionMax, 0.8)
  }

  private drag(d: THREE.Vector2) { this.dragAction.copy(d); this.velocity.copy(d.multiplyScalar(0.5)) }

  onPointerUp() {
    if (!this.isDragging) return
    this.isDragging = false
    gsap.to(this.camera.position, { z: 12, duration: 1, ease: 'power2.out' })
    this.setDistortion(0, 1)
    this.lastSnapMs = performance.now()
    this.snapPending = this.snapBackOnIdle
  }

  onWheel(dx: number, dy: number) {
    this.isSnapping = false
    this.snapTween?.kill(); this.snapTween = null
    this.drag(new THREE.Vector2(dx * 0.004, -dy * 0.004))
    this.setDistortion(this.distortionMax, 0.35)
    this.lastSnapMs = performance.now()
    this.snapPending = this.snapBackOnIdle
  }

  private setDistortion(target: number, dur: number) {
    this.distortionTween?.kill()
    this.distortionTween = gsap.to(this, {
      distortionIntensity: target, duration: dur, ease: 'power2.out',
      onUpdate: () => this.onDistortionChange(this.distortionIntensity),
    })
  }

  private returnToRest() {
    const off = this.getOffset(this.tmpB)
    const ex = this.positionOffset.x + off.x, ey = this.positionOffset.y + off.y
    this.snapTween?.kill(); this.snapTween = null
    this.snapTarget.set(-Math.round(-ex / this.sx) * this.sx - off.x, -Math.round(-ey / this.sy) * this.sy - off.y)
    this.isSnapping = true
  }

  private getOffset(out: THREE.Vector2) {
    return out.copy(this.mouseUv).subScalar(0.5).multiplyScalar(this.cursorStrength)
  }

  private expand() {
    const { x, y } = this.positionOffset
    const x0 = Math.floor((-x - this.vpX) / this.sx), x1 = Math.ceil((-x + this.vpX) / this.sx)
    const y0 = Math.floor((-y - this.vpY) / this.sy), y1 = Math.ceil((-y + this.vpY) / this.sy)
    for (let gx = x0; gx <= x1; gx++)
      for (let gy = y0; gy <= y1; gy++) {
        const k = this.key(gx, gy)
        if (!this.cards.has(k)) {
          const card = this.createCard(gx, gy)
          this.cards.set(k, card); this.mkMesh(card)
          setTimeout(() => this.showCard(card), 50)
        }
      }
    return { viewMinX: x0, viewMaxX: x1, viewMinY: y0, viewMaxY: y1 }
  }

  update() {
    if (this.snapPending && !this.isDragging && performance.now() - this.lastSnapMs > this.snapIdleMs) {
      this.snapPending = false
      this.velocity.set(0, 0); this.dragAction.set(0, 0)
      this.setDistortion(0, 0.18); this.returnToRest()
    }
    if (this.isSnapping && !this.isDragging) {
      this.positionOffset.lerp(this.snapTarget, this.snapLerp)
      if (this.positionOffset.distanceToSquared(this.snapTarget) < 0.0004) {
        this.positionOffset.copy(this.snapTarget); this.isSnapping = false
      }
    }
    const off = this.getOffset(this.tmp)
    if (this.dragAction.length() > 0.001) this.positionOffset.add(this.dragAction)
    else if (!this.isSnapping) this.positionOffset.add(this.velocity)
    this.dragAction.set(0, 0)
    this.velocity.lerp(this.zero, 0.1)
    this.position.set(this.positionOffset.x + off.x, this.positionOffset.y + off.y, 0)
    const view = this.expand()
    this.prune(view)
    const t = Date.now() * 0.001
    this.cards.forEach(card => {
      if (card.mesh?.visible) card.mesh.position.y = card.position[1] + Math.sin(t + card.id) * 0.001
    })
  }

  private prune(v: { viewMinX: number; viewMaxX: number; viewMinY: number; viewMaxY: number }) {
    const b = this.pruneBuffer
    for (const [k, card] of this.cards) {
      if (card.gridX < v.viewMinX - b || card.gridX > v.viewMaxX + b || card.gridY < v.viewMinY - b || card.gridY > v.viewMaxY + b) {
        if (card.mesh) {
          card.mesh.geometry.dispose()
          ;(card.mesh.material as THREE.MeshBasicMaterial).dispose()
          this.remove(card.mesh); card.mesh = undefined
        }
        this.cards.delete(k)
      }
    }
  }

  dispose() {
    this.distortionTween?.kill(); this.snapTween?.kill()
    this.isSnapping = false; this.snapPending = false
    this.introTimeouts.forEach(clearTimeout); this.introTimeouts = []
    this.cards.forEach(card => {
      if (card.mesh) {
        card.mesh.geometry.dispose()
        const m = card.mesh.material as THREE.MeshBasicMaterial
        m.map?.dispose(); m.dispose()
      }
    })
    if (this.bgGrid) {
      this.bgGrid.geometry.dispose()
      ;(this.bgGrid.material as LineMaterial).dispose()
      this.bgGrid = null
    }
    this.cards.clear(); this.clear()
  }
}
