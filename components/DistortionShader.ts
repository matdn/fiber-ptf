import { ShaderMaterial, Vector2 } from 'three'
import gsap from 'gsap'

export const vertexShader = /* glsl */ `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const fragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 distortion;

  varying vec2 vUv;
  
  // convert uv range from 0 -> 1 to -1 -> 1
  vec2 getShiftedUv(vec2 uv) {
    return 2.0 * (uv - 0.5);
  }
  
  // convert uv range from -1 -> 1 to 0 -> 1
  vec2 getUnshiftedUv(vec2 shiftedUv) {
    return shiftedUv * 0.5 + 0.5;
  }

  void main() {
    vec2 shiftedUv = getShiftedUv(vUv);
    float distanceFromCenter = length(shiftedUv);
    
    // Masque avec transition douce pour éviter les artefacts
    float edgeMask = 1.0 - smoothstep(0.6, 1.0, distanceFromCenter);
    
    // Lens distortion effect avec rayon modéré
    float smoothDist = smoothstep(0.0, 1.0, distanceFromCenter);
    float distortionFactor = 1.0 + distortion.x * smoothDist * smoothDist * edgeMask;
    vec2 distortedUv = shiftedUv * distortionFactor;
    vec2 transformedUv = getUnshiftedUv(distortedUv);
    
    // Clamp les UVs pour éviter les artefacts sur les bords
    transformedUv = clamp(transformedUv, 0.0, 1.0);
    
    // Sample render texture and output fragment
    vec3 color = texture2D(tDiffuse, transformedUv).rgb;
    gl_FragColor = vec4(color, 1.0);
  }
`

export class DistortionShader extends ShaderMaterial {
  private distortionIntensity = 0

  constructor() {
    super({
      uniforms: {
        tDiffuse: { value: null },
        distortion: { value: new Vector2(0, 0) }
      },
      vertexShader,
      fragmentShader
    })
  }

  update() {
    const ratio = window.innerWidth / window.innerHeight
    this.uniforms.distortion.value.set(
      this.distortionIntensity * ratio,
      this.distortionIntensity
    )
  }

  setDistortion(value: number) {
    gsap.to(this, {
      distortionIntensity: value,
      duration: 1,
      ease: 'power2.out',
      onUpdate: () => this.update()
    })
  }
}
