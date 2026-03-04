import { wrapEffect } from '@react-three/postprocessing'
import { Effect } from 'postprocessing'

class InvertEffectImpl extends Effect {
  constructor() {
    super(
      'InvertEffect',
      `
        void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
          float luma = dot(inputColor.rgb, vec3(0.2126, 0.7152, 0.0722));
          outputColor = vec4(vec3(luma), inputColor.a);
        }
      `,
      {}
    )
  }
}

export const InvertEffect = wrapEffect(InvertEffectImpl)
