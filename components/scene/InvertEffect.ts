import { Effect } from 'postprocessing'

export class InvertEffect extends Effect {
  constructor() {
    super(
      'InvertEffect',
      `
        void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
          outputColor = vec4(1.0 - inputColor.rgb, inputColor.a);
        }
      `,
      {}
    )
  }
}
