import * as THREE from 'three'
import gsap from 'gsap'

interface Card {
  id: number
  gridX: number
  gridY: number
  position: [number, number, number]
  scale: number
  visible: boolean
  isPortrait: boolean
  mesh?: THREE.Mesh
}

export class ProjectsGrid extends THREE.Group {
  private cards: Map<string, Card> = new Map()
  private nextCardId = 0
  private velocity = new THREE.Vector2(0, 0)
  private dragAction = new THREE.Vector2(0, 0)
  private isDragging = false
  private positionOffset = new THREE.Vector2(0, 0)
  private mouseUv = new THREE.Vector2(0.5, 0.5)
  private camera: THREE.Camera
  private cardSpacing = 8
  private cols = 7
  private rows = 5
  private distortionIntensity = 0
  private onDistortionChange: (intensity: number) => void
  private textureLoader = new THREE.TextureLoader()
  private imageUrls = [
    '/imagesProject/img1.png',
    '/imagesProject/img2.png',
    '/imagesProject/img3.png',
    '/imagesProject/img4.png',
    '/imagesProject/img5.png'
  ]

  constructor(camera: THREE.Camera, onDistortionChange: (intensity: number) => void) {
    super()
    this.camera = camera
    this.onDistortionChange = onDistortionChange
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
    
    return {
      id: this.nextCardId++,
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
    // Sélectionner une image de manière cyclique
    const imageIndex = card.id % this.imageUrls.length
    
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
    
    card.mesh = mesh
    this.add(mesh)
    
    // Charger la texture et ajuster les dimensions
    this.textureLoader.load(this.imageUrls[imageIndex], (texture) => {
      const imgWidth = texture.image.width
      const imgHeight = texture.image.height
      const aspectRatio = imgWidth / imgHeight
      
      // Hauteur de référence pour toutes les cartes
      const targetHeight = 4
      const targetWidth = targetHeight * aspectRatio
      
      // Remplacer la géométrie avec les bonnes dimensions
      mesh.geometry.dispose()
      mesh.geometry = new THREE.PlaneGeometry(targetWidth, targetHeight)
      
      // Appliquer la texture
      material.map = texture
      material.needsUpdate = true
    })
  }

  showCard(card: Card) {
    if (card?.mesh && !card.visible) {
      card.visible = true
      card.mesh.visible = true
      
      // Animer le scale Y
      gsap.to(card.mesh.scale, {
        y: 1,
        duration: 0.8,
        ease: "power2.out"
      })
      
      // Animer l'opacité pour un fade-in smooth
      gsap.to((card.mesh.material as THREE.MeshBasicMaterial), {
        opacity: 1,
        duration: 0.6,
        ease: "power2.out"
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

  showInitialCards(delay: number = 0) {
    const cardsArray = Array.from(this.cards.values())
    const totalDuration = 2
    const delayBetweenCards = totalDuration / cardsArray.length
    
    cardsArray.forEach((card, i) => {
      setTimeout(() => {
        this.showCard(card)
      }, delay + i * delayBetweenCards * 1000)
    })
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
    this.lastMouseX = clientX
    this.lastMouseY = clientY
    this.animateCameraZ(0.5, 1)
    
    // Animer l'intensité de distorsion
    gsap.to(this, {
      distortionIntensity: 0.08,
      duration: 0.8,
      ease: "power2.out",
      onUpdate: () => {
        this.onDistortionChange(this.distortionIntensity)
      }
    })
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
      gsap.to(this, {
        distortionIntensity: 0,
        duration: 1,
        ease: "power2.out",
        onUpdate: () => {
          this.onDistortionChange(this.distortionIntensity)
        }
      })
    }
  }

  private animateCameraZ(distance: number, duration: number) {
    gsap.to(this.camera.position, {
      z: 12 + distance,
      duration,
      ease: "power2.out"
    })
  }

  private getAmbientCursorOffset(): THREE.Vector2 {
    const offset = this.mouseUv.clone().subScalar(0.5).multiplyScalar(0.2)
    return offset
  }

  private expandGrid() {
    // Calculer les limites visibles de la grille avec la position actuelle
    const viewMinX = Math.floor((-this.positionOffset.x - 20) / this.cardSpacing)
    const viewMaxX = Math.ceil((-this.positionOffset.x + 20) / this.cardSpacing)
    const viewMinY = Math.floor((-this.positionOffset.y - 15) / this.cardSpacing)
    const viewMaxY = Math.ceil((-this.positionOffset.y + 15) / this.cardSpacing)
    
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
  }

  update() {
    // Apply cursor ambient offset
    const cursorOffset = this.getAmbientCursorOffset()
    
    // Update position based on drag or velocity
    if (this.dragAction.length() > 0.001) {
      this.positionOffset.add(this.dragAction.clone())
    } else {
      this.positionOffset.add(this.velocity)
    }
    
    this.dragAction.set(0, 0)
    this.velocity.lerp(new THREE.Vector2(0, 0), 0.1)
    
    // Apply position offset and cursor offset
    this.position.set(
      this.positionOffset.x + cursorOffset.x,
      this.positionOffset.y + cursorOffset.y,
      0
    )
    
    // Expand grid for infinite scrolling
    this.expandGrid()
    
    // Floating animation for visible cards
    const time = Date.now() * 0.001
    this.cards.forEach((card) => {
      if (card.mesh && card.visible) {
        const baseY = card.position[1]
        card.mesh.position.y = baseY + Math.sin(time + card.id) * 0.001
      }
    })
  }
}
