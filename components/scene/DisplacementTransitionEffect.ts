import { Effect } from 'postprocessing'
import { Uniform, TextureLoader } from 'three'

const fragmentShader = `
  uniform float progress;
  uniform sampler2D displacementMap;
  uniform float intensity;
  
  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    if (progress <= 0.0 || progress >= 1.0) {
      outputColor = inputColor;
      return;
    }
    
    // Échantillonner la displacement map à différentes échelles
    vec4 disp = texture2D(displacementMap, uv);
    vec4 disp2 = texture2D(displacementMap, uv * 2.0);
    vec4 disp3 = texture2D(displacementMap, uv * 0.5 + vec2(progress * 0.1));
    
    // Combiner les différentes échelles pour un effet organique
    float displacement = (disp.r + disp2.g * 0.5 + disp3.b * 0.3) / 1.8;
    
    // Calculer la force de la distorsion (max au milieu de la transition)
    float distortionStrength = sin(progress * 3.14159) * intensity;
    
    // Créer des offsets organiques multi-directionnels
    vec2 offset = vec2(
      (displacement - 0.5) * distortionStrength * 2.0,
      (disp.g - 0.5) * distortionStrength * 1.5
    );
    
    // Ajouter une rotation organique basée sur le displacement
    float angle = (displacement - 0.5) * distortionStrength * 0.5;
    vec2 rotatedOffset = vec2(
      offset.x * cos(angle) - offset.y * sin(angle),
      offset.x * sin(angle) + offset.y * cos(angle)
    );
    
    // Ajouter une ondulation douce
    float wave = sin(uv.y * 10.0 + displacement * 6.28) * 0.5 + 0.5;
    rotatedOffset.x += (wave - 0.5) * distortionStrength * 0.3;
    
    // UV distordues
    vec2 distortedUV = uv + rotatedOffset;
    
    // Échantillonner avec UV distordues
    vec4 distortedColor = texture2D(inputBuffer, distortedUV);
    
    // Ajouter des aberrations chromatiques au pic de la transition
    if (progress > 0.3 && progress < 0.7) {
      float aberration = (1.0 - abs(progress - 0.5) * 2.0) * 0.008;
      vec2 rOffset = rotatedOffset + vec2(aberration * displacement, 0.0);
      vec2 bOffset = rotatedOffset - vec2(aberration * displacement, 0.0);
      
      float r = texture2D(inputBuffer, uv + rOffset).r;
      float g = distortedColor.g;
      float b = texture2D(inputBuffer, uv + bOffset).b;
      
      outputColor = vec4(r, g, b, inputColor.a);
    } else {
      outputColor = distortedColor;
    }
  }
`

export class DisplacementTransitionEffect extends Effect {
  constructor() {
    const textureLoader = new TextureLoader()
    
    super(
      'DisplacementTransitionEffect',
      fragmentShader,
      {
        uniforms: new Map<string, Uniform<number | THREE.Texture | null>>([
          ['progress', new Uniform(0)],
          ['displacementMap', new Uniform<THREE.Texture | null>(null)],
          ['intensity', new Uniform(0.3)]
        ])
      }
    )
    
    // Charger la displacement map
    textureLoader.load('/displacement-map.jpg', (texture) => {
      const uniforms = (this as { uniforms: Map<string, Uniform<number | THREE.Texture | null>> }).uniforms
      uniforms.get('displacementMap')!.value = texture
    })
  }
  
  setProgress(value: number) {
    const uniforms = (this as { uniforms: Map<string, Uniform<number | THREE.Texture | null>> }).uniforms
    uniforms.get('progress')!.value = value
  }
  
  setIntensity(value: number) {
    const uniforms = (this as { uniforms: Map<string, Uniform<number | THREE.Texture | null>> }).uniforms
    uniforms.get('intensity')!.value = value
  }
}
