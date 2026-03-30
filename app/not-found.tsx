"use client";

import { useEffect, useRef } from "react";
import Header from "@/components/Header";
import { CustomCursor } from "@/components/CustomCursor";
import { Canvas } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { Fluid } from "@whatisjery/react-fluid-distortion";
// import { Fluid } from "@whatisjery/react-fluid-distortion";
// import { EffectComposer } from "postprocessing";

// ─── Vertex shader ──────────────────────────────────────────────────────────────
const VERT = `
attribute vec2 aPos;
attribute vec2 aUV;

uniform vec2  uMouse;
uniform float uHover;
uniform float uTime;

varying vec2  vUV;
varying float vZ;

float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(h(i), h(i + vec2(1,0)), u.x),
    mix(h(i + vec2(0,1)), h(i + vec2(1,1)), u.x),
    u.y
  ) * 2.0 - 1.0;
}

void main(){
  vUV = aUV;
  float d    = length(aPos - uMouse);
  // Smooth bowl: sinks deepest at the cursor, fades out over radius ~0.8
  float sink = exp(-d * d * 1.6) * uHover;
  // Very light noise ripple on top
  float n    = noise(aPos * 1.0 + uTime * 0.3) * 0.08;
  float z    = -sink * 0.55 + n * sink;
  vZ = z;
  gl_Position = vec4(aPos, z * 0.25, 1.0);
}`;

// ─── Fragment shader (RGB shift) ────────────────────────────────────────────────
const FRAG = `
precision mediump float;

uniform sampler2D uTex;

varying vec2  vUV;
varying float vZ;

void main(){
  float s = abs(vZ) * 0.004;
  float r = texture2D(uTex, vUV + vec2( s, 0.0)).r;
  float g = texture2D(uTex, vUV               ).g;
  float b = texture2D(uTex, vUV - vec2( s, 0.0)).b;
  gl_FragColor = vec4(r, g, b, 1.0);
}`;

// ─── Subdivided plane geometry ──────────────────────────────────────────────────
function buildGrid(n: number) {
  const pos: number[] = [];
  const uv:  number[] = [];
  const idx: number[] = [];

  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const x = (i / n) * 2 - 1;
      const y = (j / n) * 2 - 1;
      pos.push(x, y);
      uv.push((x + 1) * 0.5, (y + 1) * 0.5);
    }
  }

  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * (n + 1) + i;
      idx.push(a, a + n + 1, a + 1, a + 1, a + n + 1, a + n + 2);
    }
  }

  return {
    pos: new Float32Array(pos),
    uv:  new Float32Array(uv),
    idx: new Uint16Array(idx),
  };
}

// ─── Canvas texture with "404" text ────────────────────────────────────────────
function make404Texture(gl: WebGLRenderingContext, sw: number, sh: number): WebGLTexture {
  const oc = document.createElement("canvas");
  oc.width  = sw;
  oc.height = sh;
  const ctx = oc.getContext("2d")!;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, sw, sh);

  // Scale font size so "404" spans ~68% of canvas width
  let fs = sh * 0.6;
  ctx.font = `normal ${fs}px Neopixel, 'Helvetica Neue', sans-serif`;
  const tw = ctx.measureText("404").width;
  if (tw > 0) fs *= (sw * 0.68) / tw;

  ctx.font         = `normal ${fs}px Neopixel, 'Helvetica Neue', sans-serif`;
  ctx.fillStyle    = "#000000";
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("404", sw / 2, sh / 2 - fs * 0.04);

  // Subtitle
  const subFs = Math.max(14, sw * 0.018);
  ctx.font      = `normal ${subFs}px 'Mabry Pro', 'Helvetica Neue', sans-serif`;
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.letterSpacing = "0.12em";
  ctx.fillText("PAGE INTROUVABLE", sw / 2, sh / 2 + fs * 0.54);

  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, oc);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

// ─── Shader compiler ────────────────────────────────────────────────────────────
function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

// ─── Component ──────────────────────────────────────────────────────────────────
export default function NotFound() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) return;

    // Program
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compileShader(gl, gl.VERTEX_SHADER,   VERT));
    gl.attachShader(prog, compileShader(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    // Geometry (80×80 grid for smooth deformation)
    const N   = 80;
    const geo = buildGrid(N);

    const posB = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, posB);
    gl.bufferData(gl.ARRAY_BUFFER, geo.pos, gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uvB = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, uvB);
    gl.bufferData(gl.ARRAY_BUFFER, geo.uv, gl.STATIC_DRAW);
    const aUV = gl.getAttribLocation(prog, "aUV");
    gl.enableVertexAttribArray(aUV);
    gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 0, 0);

    const idxB = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxB);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.idx, gl.STATIC_DRAW);

    // Uniforms
    const uMouse = gl.getUniformLocation(prog, "uMouse");
    const uHover = gl.getUniformLocation(prog, "uHover");
    const uTime  = gl.getUniformLocation(prog, "uTime");
    gl.uniform1i(gl.getUniformLocation(prog, "uTex"), 0);

    // Texture
    let tex = make404Texture(
      gl,
      canvas.offsetWidth  || window.innerWidth,
      canvas.offsetHeight || window.innerHeight,
    );

    // Resize handler
    const resize = () => {
      const w = canvas.offsetWidth  || window.innerWidth;
      const h = canvas.offsetHeight || window.innerHeight;
      canvas.width  = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.deleteTexture(tex);
      tex = make404Texture(gl, w, h);
    };
    resize();
    window.addEventListener("resize", resize);

    // Mouse tracking — on window so the R3F Fluid canvas on top doesn't block it
    let mx = 0, my = 0, hover = 0, tHover = 0;
    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mx = (e.clientX - r.left) / r.width  *  2 - 1;
      my = (e.clientY - r.top)  / r.height * -2 + 1;
      tHover = 1;
    };
    const onLeave = () => { tHover = 0; };
    window.addEventListener("mousemove", onMove);
    document.documentElement.addEventListener("mouseleave", onLeave);

    // Render loop
    let raf = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      hover += (tHover - hover) * 0.055;

      gl.clearColor(1, 1, 1, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform2f(uMouse, mx, my);
      gl.uniform1f(uHover, hover);
      gl.uniform1f(uTime, t * 0.001);
      gl.drawElements(gl.TRIANGLES, geo.idx.length, gl.UNSIGNED_SHORT, 0);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      gl.deleteTexture(tex);
    };
  }, []);

  return (
    <div style={{ width: "100vw", height: "100dvh", overflow: "hidden", position: "relative" }}>
      <CustomCursor enabled={true} />
      <Header />
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
      {/* R3F Fluid overlay — transparent background, captures mouse for fluid sim */}
      {/* <Canvas
        style={{ position: "absolute", inset: 0, zIndex: 2 }}
        gl={{ alpha: true, antialias: false }}
        onCreated={({ gl, scene }) => {
          scene.background = null;
          gl.setClearColor(0, 0, 0, 0);
        }}
      >
        <EffectComposer>
          <Fluid
            rainbow={false}
            intensity={0.6}
            fluidColor="#000000"
            radius={0.5}
          />
        </EffectComposer>
      </Canvas> */}
     
    </div>
  );
}
