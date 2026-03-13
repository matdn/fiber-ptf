import * as THREE from 'three'
import gsap from 'gsap'
import { PROJECTS, type ProjectItem } from '@/lib/projectImages'

const EXCLUDED_GRID_PROJECT_TITLES = new Set(['altitude101'])

function normalizeProjectTitle(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

interface Card {
  id: number
  projectIndex: number
  gridX: number
  gridY: number
  position: [number, number, number]
  scale: number
  visible: boolean
  isPortrait: boolean
  mesh?: THREE.Mesh
}

type ProjectsGridOptions = {
  distortionMax?: number
  snapBackOnIdle?: boolean
  cursorOffsetStrength?: number
  viewPaddingX?: number
  viewPaddingY?: number
  pruneBuffer?: number
}

export class ProjectsGrid extends THREE.Group {
  private cards: Map<string, Card> = new Map()
  private nextCardId = 0
  private velocity = new THREE.Vector2(0, 0)
  private dragAction = new THREE.Vector2(0, 0)
  private isDragging = false
  private positionOffset = new THREE.Vector2(0, 0)
  private mouseUv = new THREE.Vector2(0.5, 0.5)
  private tmpVec2 = new THREE.Vector2(0, 0)
  private tmpVec2b = new THREE.Vector2(0, 0)
  private zeroVec2 = new THREE.Vector2(0, 0)
  private camera: THREE.Camera
  private cardSpacing = 8
  private cols = 7
  private rows = 5
  private viewPaddingX = 20
  private viewPaddingY = 15
  private pruneBuffer = 4
  private distortionIntensity = 0
  private distortionMax = 0.08
  private snapBackOnIdle = false
  private cursorOffsetStrength = 0.2
  private onDistortionChange: (intensity: number) => void
  private distortionTween: gsap.core.Tween | null = null
  private snapTween: gsap.core.Tween | null = null
  private lastWheelAtMs = 0
  private snapPending = false
  private snapIdleMs = 90
  private textureLoader = new THREE.TextureLoader()
  private textureCache: Map<string, THREE.Texture> = new Map()
  private textureCallbacks: Map<string, Array<(texture: THREE.Texture) => void>> = new Map()
  private projects: ProjectItem[] =
    PROJECTS.filter(
      (project) => !EXCLUDED_GRID_PROJECT_TITLES.has(normalizeProjectTitle(project.title)),
    )
  private imageUrls = this.projects.map((project) => project.imageUrl)

  private introTimeouts: number[] = []

  private raycaster = new THREE.Raycaster()
  private pointerNdc = new THREE.Vector2()

  constructor(
    camera: THREE.Camera,
    onDistortionChange: (intensity: number) => void,
    options?: ProjectsGridOptions,
  ) {
    super()
    this.camera = camera
    this.onDistortionChange = onDistortionChange
    this.distortionMax = options?.distortionMax ?? 0.08
    this.snapBackOnIdle = options?.snapBackOnIdle ?? false
    this.cursorOffsetStrength = options?.cursorOffsetStrength ?? 0.2
    this.viewPaddingX = options?.viewPaddingX ?? 20
    this.viewPaddingY = options?.viewPaddingY ?? 15
    this.pruneBuffer = options?.pruneBuffer ?? 4
    this.initializeGrid()
  }

  private getGridKey(gridX: number, gridY: number): string {
    return `${gridX},${gridY}`
  }

  private createCard(gridX: number, gridY: number): Card {
    const x = gridX * this.cardSpacing
    const y = gridY * this.cardSpacing
    
    // Orientation déterministe basée sur la position dans la grille
    // Utilise un pattern alternant pour une distribution cohérente
    const isPortrait = (gridX + gridY) % 2 === 0
    
    const id = this.nextCardId++
    const N = this.projects.length
    // Assign project deterministically by grid position so no two adjacent cells
    // (orthogonal or diagonal) ever share the same project, regardless of creation order.
    // b = vertical step (ceil(N/2) — scattered, confirmed good by user)
    // a = horizontal step: smallest a≥2 such that a, a+b, a-b are all non-zero mod N,
    //     giving a scattered horizontal sequence instead of the sequential 0,1,2,3,…
    const b = Math.ceil(N / 2)
    let a = 2
    while (a < N && (a % N === 0 || (a + b) % N === 0 || ((a - b) % N + N) % N === 0)) {
      a++
    }
    const projectIndex = N > 0 ? ((gridX * a + gridY * b) % N + N) % N : 0

    return {
      id,
      projectIndex,
      gridX,
      gridY,
      position: [x, y, 0],
      scale: 1,
      visible: false,
      isPortrait
    }
  }

  private initializeGrid() {
    // Créer la grille initiale centrée
    for (let x = -Math.floor(this.cols / 2); x <= Math.floor(this.cols / 2); x++) {
      for (let y = -Math.floor(this.rows / 2); y <= Math.floor(this.rows / 2); y++) {
        const card = this.createCard(x, y)
        const key = this.getGridKey(x, y)
        this.cards.set(key, card)
        this.createCardMesh(card)
      }
    }
  }

  private createCardMesh(card: Card) {
    // Image driven by the position-based projectIndex (no sequential id)
    const imageUrl = this.imageUrls[card.projectIndex]
    
    // Créer un mesh temporaire avec des dimensions par défaut
    const defaultWidth = card.isPortrait ? 3.5 : 4.5
    const defaultHeight = card.isPortrait ? 4.5 : 3.5
    const geometry = new THREE.PlaneGeometry(defaultWidth, defaultHeight)
    
    const material = new THREE.MeshBasicMaterial({
      side: THREE.FrontSide,
      transparent: true,
      opacity: 0
    })
    
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(...card.position)
    mesh.scale.set(1, 0, 1)
    mesh.visible = false
    mesh.userData.projectIndex = card.projectIndex
    
    card.mesh = mesh
    this.add(mesh)
    
    // Charger la texture (partagée) et ajuster les dimensions
    this.loadTexture(imageUrl, (texture) => {
      const image = texture.image as { width?: number; height?: number } | undefined
      const imgWidth = typeof image?.width === 'number' ? image.width : 1
      const imgHeight = typeof image?.height === 'number' ? image.height : 1
      const aspectRatio = imgHeight > 0 ? imgWidth / imgHeight : 1

      // Hauteur de référence pour toutes les cartes
      const targetHeight = 4
      const targetWidth = targetHeight * aspectRatio

      // Remplacer la géométrie avec les bonnes dimensions
      mesh.geometry.dispose()
      mesh.geometry = new THREE.PlaneGeometry(targetWidth, targetHeight)

      // Appliquer la texture (shared)
      material.map = texture
      material.needsUpdate = true
    })
  }

  pickProjectAt(clientX: number, clientY: number, width: number, height: number) {
    if (width <= 0 || height <= 0) return null

    // Convert to normalized device coords
    this.pointerNdc.set((clientX / width) * 2 - 1, -(clientY / height) * 2 + 1)
    // Raycast against current card meshes (children of this group)
    this.raycaster.setFromCamera(this.pointerNdc, this.camera as THREE.Camera)
    const hits = this.raycaster.intersectObjects(this.children, false)
    const hit = hits[0]?.object as THREE.Object3D | undefined
    const projectIndex = hit?.userData?.projectIndex
    if (typeof projectIndex !== 'number') return null
    return this.projects[projectIndex] ?? null
  }

  private loadTexture(url: string, onLoaded: (texture: THREE.Texture) => void) {
    const cached = this.textureCache.get(url)
    if (cached && cached.image) {
      onLoaded(cached)
      return
    }

    const existingCallbacks = this.textureCallbacks.get(url)
    if (existingCallbacks) {
      existingCallbacks.push(onLoaded)
      return
    }

    this.textureCallbacks.set(url, [onLoaded])
    this.textureLoader.load(url, (texture) => {
      this.textureCache.set(url, texture)
      const callbacks = this.textureCallbacks.get(url)
      this.textureCallbacks.delete(url)
      callbacks?.forEach((cb) => cb(texture))
    })
  }

  showCard(card: Card) {
    if (card?.mesh && !card.visible) {
      card.visible = true
      card.mesh.visible = true

      gsap.killTweensOf(card.mesh.scale)
      gsap.killTweensOf(card.mesh.material)

      // Start collapsed so it can "pop"
      card.mesh.scale.y = 0.001
      
      // Pop (fast) instead of a slow intro scale
      gsap.to(card.mesh.scale, {
        y: 1,
        duration: 0.26,
        ease: 'back.out(2.2)'
      })
      
      // Quick fade-in
      gsap.to((card.mesh.material as THREE.MeshBasicMaterial), {
        opacity: 1,
        duration: 0.18,
        ease: 'power1.out'
      })
    }
  }

  hideCard(card: Card) {
    if (card?.mesh && card.visible) {
      // Animer le scale Y vers 0
      gsap.to(card.mesh.scale, {
        y: 0,
        duration: 0.8,
        ease: "power2.in"
      })
      
      // Animer l'opacité pour un fade-out smooth
      gsap.to((card.mesh.material as THREE.MeshBasicMaterial), {
        opacity: 0,
        duration: 0.6,
        ease: "power2.in",
        onComplete: () => {
          if (card.mesh) {
            card.mesh.visible = false
            card.visible = false
          }
        }
      })
    }
  }

  showInitialCards(delayMs: number = 0) {
    // Clear any previous scheduled intro pops
    this.introTimeouts.forEach((t) => clearTimeout(t))
    this.introTimeouts = []

    const cardsArray = Array.from(this.cards.values())

    // Random pop spread window (ms)
    const spreadMs = 900
    const minDelayMs = Math.max(0, delayMs)

    for (const card of cardsArray) {
      const t = window.setTimeout(() => this.showCard(card), minDelayMs + Math.random() * spreadMs)
      this.introTimeouts.push(t)
    }
  }

  hideAllCards(delay: number = 0) {
    const cardsArray = Array.from(this.cards.values())
    const totalDuration = 2
    const delayBetweenCards = totalDuration / cardsArray.length
    
    cardsArray.forEach((card, i) => {
      setTimeout(() => {
        this.hideCard(card)
      }, delay + i * delayBetweenCards * 1000)
    })
  }

  onPointerMove(clientX: number, clientY: number, width: number, height: number) {
    // Update mouse UV for distortion
    this.mouseUv.set(clientX / width, 1 - clientY / height)

    if (this.isDragging) {
      const deltaX = clientX - this.lastMouseX
      const deltaY = clientY - this.lastMouseY
      
      this.drag(new THREE.Vector2(deltaX * 0.01, -deltaY * 0.01))
      
      this.lastMouseX = clientX
      this.lastMouseY = clientY
    }
  }

  private lastMouseX = 0
  private lastMouseY = 0

  onPointerDown(clientX: number, clientY: number) {
    this.isDragging = true

    if (this.snapTween) {
      this.snapTween.kill()
      this.snapTween = null
    }

    this.lastMouseX = clientX
    this.lastMouseY = clientY
    this.animateCameraZ(0.5, 1)
    
    // Animer l'intensité de distorsion
    this.setDistortionTarget(this.distortionMax, 0.8)
  }

  private drag(delta: THREE.Vector2) {
    this.dragAction.copy(delta)
    this.velocity.copy(delta.multiplyScalar(0.5))
  }

  onPointerUp() {
    if (this.isDragging) {
      this.isDragging = false
      this.animateCameraZ(0, 1)
      
      // Réduire la distorsion
      this.setDistortionTarget(0, 1)
    }
  }

  onWheel(deltaX: number, deltaY: number) {
    // Trackpads can scroll in both axes; map to the same drag feel.
    if (this.snapTween) {
      this.snapTween.kill()
      this.snapTween = null
    }
    this.drag(new THREE.Vector2(deltaX * 0.004, -deltaY * 0.004))
    this.pulseDistortion()

    this.lastWheelAtMs = performance.now()
    this.snapPending = this.snapBackOnIdle
  }

  private setDistortionTarget(target: number, duration: number) {
    if (this.distortionTween) {
      this.distortionTween.kill()
      this.distortionTween = null
    }
    this.distortionTween = gsap.to(this, {
      distortionIntensity: target,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        this.onDistortionChange(this.distortionIntensity)
      }
    })
  }

  private pulseDistortion() {
    // Kick distortion up quickly, then return to 0 after scrolling stops.
    this.setDistortionTarget(this.distortionMax, 0.35)
  }

  private returnToRest() {
    // Snap to the project (card) that is closest to the screen center *right now*.
    // Cards lie on a regular grid (cardSpacing), so we can round to the nearest.
    const cursorOffset = this.getAmbientCursorOffset(this.tmpVec2b)
    const effectiveX = this.positionOffset.x + cursorOffset.x
    const effectiveY = this.positionOffset.y + cursorOffset.y

    const targetGridX = Math.round(-effectiveX / this.cardSpacing)
    const targetGridY = Math.round(-effectiveY / this.cardSpacing)

    const targetX = -targetGridX * this.cardSpacing - cursorOffset.x
    const targetY = -targetGridY * this.cardSpacing - cursorOffset.y

    // Smoothly ease to the centered card to avoid a visible jump.
    if (this.snapTween) {
      this.snapTween.kill()
      this.snapTween = null
    }
    this.snapTween = gsap.to(this.positionOffset, {
      x: targetX,
      y: targetY,
      duration: 0.35,
      ease: 'power3.out',
      onComplete: () => {
        this.snapTween = null
      },
    })
  }

  private animateCameraZ(distance: number, duration: number) {
    gsap.to(this.camera.position, {
      z: 12 + distance,
      duration,
      ease: "power2.out"
    })
  }

  private getAmbientCursorOffset(out: THREE.Vector2): THREE.Vector2 {
    out.copy(this.mouseUv).subScalar(0.5).multiplyScalar(this.cursorOffsetStrength)
    return out
  }

  private expandGrid() {
    // Calculer les limites visibles de la grille avec la position actuelle
    const viewMinX = Math.floor((-this.positionOffset.x - this.viewPaddingX) / this.cardSpacing)
    const viewMaxX = Math.ceil((-this.positionOffset.x + this.viewPaddingX) / this.cardSpacing)
    const viewMinY = Math.floor((-this.positionOffset.y - this.viewPaddingY) / this.cardSpacing)
    const viewMaxY = Math.ceil((-this.positionOffset.y + this.viewPaddingY) / this.cardSpacing)
    
    // Ajouter des cartes dans les zones visibles qui n'existent pas encore
    for (let x = viewMinX; x <= viewMaxX; x++) {
      for (let y = viewMinY; y <= viewMaxY; y++) {
        const key = this.getGridKey(x, y)
        if (!this.cards.has(key)) {
          const card = this.createCard(x, y)
          this.cards.set(key, card)
          this.createCardMesh(card)
          
          // Afficher la carte immédiatement
          setTimeout(() => {
            this.showCard(card)
          }, 50)
        }
      }
    }

    return { viewMinX, viewMaxX, viewMinY, viewMaxY }
  }

  update() {
    // Snap to the closest centered card once scrolling truly stops.
    if (
      this.snapPending &&
      !this.isDragging &&
      performance.now() - this.lastWheelAtMs > this.snapIdleMs
    ) {
      this.snapPending = false
      this.velocity.set(0, 0)
      this.dragAction.set(0, 0)
      this.setDistortionTarget(0, 0.18)
      this.returnToRest()
    }

    // Apply cursor ambient offset
    const cursorOffset = this.getAmbientCursorOffset(this.tmpVec2)
    
    // Update position based on drag or velocity
    if (this.dragAction.length() > 0.001) {
      this.positionOffset.add(this.dragAction)
    } else {
      this.positionOffset.add(this.velocity)
    }
    
    this.dragAction.set(0, 0)
    this.velocity.lerp(this.zeroVec2, 0.1)
    
    // Apply position offset and cursor offset
    this.position.set(
      this.positionOffset.x + cursorOffset.x,
      this.positionOffset.y + cursorOffset.y,
      0
    )
    
    // Expand grid for infinite scrolling + prune far cards to keep perf stable
    const view = this.expandGrid()
    this.pruneGrid(view)
    
    // Floating animation for visible cards
    const time = Date.now() * 0.001
    this.cards.forEach((card) => {
      if (card.mesh && card.visible) {
        const baseY = card.position[1]
        card.mesh.position.y = baseY + Math.sin(time + card.id) * 0.001
      }
    })
  }

  private pruneGrid(view: { viewMinX: number; viewMaxX: number; viewMinY: number; viewMaxY: number }) {
    const buffer = this.pruneBuffer
    const minX = view.viewMinX - buffer
    const maxX = view.viewMaxX + buffer
    const minY = view.viewMinY - buffer
    const maxY = view.viewMaxY + buffer

    for (const [key, card] of this.cards) {
      if (card.gridX < minX || card.gridX > maxX || card.gridY < minY || card.gridY > maxY) {
        if (card.mesh) {
          card.mesh.geometry.dispose()
          ;(card.mesh.material as THREE.MeshBasicMaterial).dispose()
          this.remove(card.mesh)
          card.mesh = undefined
        }
        this.cards.delete(key)
      }
    }
  }

  dispose() {
    if (this.distortionTween) {
      this.distortionTween.kill()
      this.distortionTween = null
    }
    if (this.snapTween) {
      this.snapTween.kill()
      this.snapTween = null
    }
    this.snapPending = false

    this.introTimeouts.forEach((t) => clearTimeout(t))
    this.introTimeouts = []

    this.cards.forEach((card) => {
      if (card.mesh) {
        card.mesh.geometry.dispose()
        const mat = card.mesh.material as THREE.MeshBasicMaterial
        mat.map?.dispose()
        mat.dispose()
      }
    })
    this.cards.clear()
    this.clear()
  }
}
