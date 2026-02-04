import { Effect } from 'postprocessing'
import { Uniform } from 'three'

export class UnderwaterRaysEffect extends Effect {
  constructor() {
    super(
      'UnderwaterRaysEffect',
      `
        uniform float time;
        uniform vec2 resolution;
        
        // Fonction de bruit simplex 2D
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        
        float snoise(vec2 v) {
          const vec4 C = vec4(0.211324865405187,
                              0.366025403784439,
                             -0.577350269189626,
                              0.024390243902439);
          vec2 i  = floor(v + dot(v, C.yy) );
          vec2 x0 = v -   i + dot(i, C.xx);
          vec2 i1;
          i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
          vec4 x12 = x0.xyxy + C.xxzz;
          x12.xy -= i1;
          i = mod289(i);
          vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
            + i.x + vec3(0.0, i1.x, 1.0 ));
          vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
          m = m*m ;
          m = m*m ;
          vec3 x = 2.0 * fract(p * C.www) - 1.0;
          vec3 h = abs(x) - 0.5;
          vec3 ox = floor(x + 0.5);
          vec3 a0 = x - ox;
          m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
          vec3 g;
          g.x  = a0.x  * x0.x  + h.x  * x0.y;
          g.yz = a0.yz * x12.xz + h.yz * x12.yw;
          return 130.0 * dot(m, g);
        }
        
        void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
          vec2 st = uv * 2.0;
          
          // Créer des rayons animés avec plusieurs couches de bruit
          float rays = 0.0;
          
          // Premier layer de rayons
          float angle1 = time * 0.05;
          vec2 dir1 = vec2(cos(angle1), sin(angle1)) * 0.3;
          float noise1 = snoise(st * 3.0 + dir1 + time * 0.1);
          rays += max(0.0, noise1) * 0.5;
          
          // Deuxième layer de rayons
          float angle2 = time * 0.08 + 1.5;
          vec2 dir2 = vec2(cos(angle2), sin(angle2)) * 0.2;
          float noise2 = snoise(st * 2.5 + dir2 + time * 0.15);
          rays += max(0.0, noise2) * 0.3;
          
          // Troisième layer pour plus de complexité
          float noise3 = snoise(st * 4.0 + time * 0.08);
          rays += max(0.0, noise3) * 0.2;
          
          // Créer un gradient vertical (plus de lumière en haut)
          float verticalGradient = smoothstep(0.3, 1.0, uv.y);
          rays *= verticalGradient;
          
          // Ajouter une légère teinte bleue aux rayons
          vec3 rayColor = vec3(0.7, 0.85, 1.0) * rays * 0.3;
          
          // Mélanger avec la couleur d'origine
          outputColor = vec4(inputColor.rgb + rayColor, inputColor.a);
        }
      `,
      {
        uniforms: new Map([
          ['time', new Uniform(0)],
          ['resolution', new Uniform([1024, 1024])]
        ])
      }
    )
  }
  
  update(renderer: any, inputBuffer: any, deltaTime: number) {
    const uniforms = (this as any).uniforms
    uniforms.get('time').value += deltaTime
  }
}
