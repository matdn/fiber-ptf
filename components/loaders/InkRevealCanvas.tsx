'use client'

import { useEffect, useRef } from 'react'

// ─── Shared vignette color palette ────────────────────────────────────────
// Matches SceneVignetteOverlay — re-used by loader + page transitions

export type RGB = [number, number, number]

export const VIGNETTE_RGB: Record<string, RGB> = {
  morning:   [0/255, 0/255, 0/255],
  middleday: [0/255, 0/255, 0/255],
  sunset:    [0/255, 0/255, 0/255],
  night:     [0, 0, 0],
}

export function getVignetteColor(slotName: string): RGB {
  return VIGNETTE_RGB[slotName] ?? VIGNETTE_RGB.night
}

// ─── Mist-reveal GLSL shader ──────────────────────────────────────────────────
//
//  • Shape: circle in aspect-corrected UV space → top/bottom fill before corners
//  • Edge:  low-frequency fBm → soft cloud/mist boundary (not ink splatter)
//  • uP 1  = fully black (screen covered)
//  • uP 0  = fully transparent (screen revealed)

export const VERT = `attribute vec2 pos;void main(){gl_Position=vec4(pos,0.,1.);}` as const

export const FRAG = `
precision highp float;
uniform float uP;
uniform vec2  uR;
uniform vec3  uColor;
float h(vec2 p){p=fract(p*vec2(127.1,311.7));p+=dot(p,p+17.5);return fract(p.x*p.y);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=n(p)*a;p*=2.1;a*=.52;}return s;}
void main(){
  vec2  uv  = gl_FragCoord.xy / uR;
  float ar  = uR.x / uR.y;
  vec2  p   = (uv - 0.5) * vec2(ar, 1.0);
  float maxR = length(vec2(ar * 0.5, 0.5)) + 0.35;
  // Domain warp: distort p itself before computing the distance field
  // → breaks the circular shape into something organic and asymmetric
  vec2  warp = vec2(
    fbm(p * 1.1 + vec2(0.3, 1.7)),
    fbm(p * 1.1 + vec2(2.4, -0.9))
  );
  vec2  wp   = p + (warp - 0.5) * 0.55;
  float dist = length(wp) + fbm(wp * 2.8 + 1.3) * 0.08;
  float revealR = (1.0 - uP) * maxR;
  float alpha   = smoothstep(revealR - 0.20, revealR + 0.06, dist);
  gl_FragColor  = vec4(uColor, alpha);
}` as const

// ─── WebGL canvas component ───────────────────────────────────────────────────
// progress: 1.0 = fully covered, 0.0 = fully transparent
// color: RGB 0-1 fill color (defaults to black)

export function InkRevealCanvas({ progress, color = [0, 0, 0] }: { progress: number; color?: [number, number, number] }) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const progressRef = useRef(progress)
  const colorRef    = useRef(color)
  const rafRef      = useRef(0)
  const glRef = useRef<{ gl: WebGLRenderingContext; uP: WebGLUniformLocation; uR: WebGLUniformLocation; uColor: WebGLUniformLocation } | null>(null)

  useEffect(() => { progressRef.current = progress }, [progress])
  useEffect(() => { colorRef.current = color }, [color])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false })
    if (!gl) return

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type) as WebGLShader
      gl.shaderSource(s, src); gl.compileShader(s); return s
    }
    const prog = gl.createProgram() as WebGLProgram
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
    // biome-ignore lint/correctness/useHookAtTopLevel: gl.useProgram is a WebGL method, not a React hook
    gl.linkProgram(prog); gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,-1, 1,1, -1,1]), gl.STATIC_DRAW)
    const posLoc = gl.getAttribLocation(prog, 'pos')
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    glRef.current = { gl, uP: gl.getUniformLocation(prog, 'uP') as WebGLUniformLocation, uR: gl.getUniformLocation(prog, 'uR') as WebGLUniformLocation, uColor: gl.getUniformLocation(prog, 'uColor') as WebGLUniformLocation }

    const resize = () => {
      canvas.width = window.innerWidth; canvas.height = window.innerHeight
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    const render = () => {
      rafRef.current = requestAnimationFrame(render)
      const s = glRef.current; if (!s) return
      s.gl.uniform1f(s.uP, progressRef.current)
      s.gl.uniform2f(s.uR, canvas.width, canvas.height)
      s.gl.uniform3f(s.uColor, colorRef.current[0], colorRef.current[1], colorRef.current[2])
      s.gl.clear(s.gl.COLOR_BUFFER_BIT)
      s.gl.drawArrays(s.gl.TRIANGLES, 0, 6)
    }
    rafRef.current = requestAnimationFrame(render)

    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
}
