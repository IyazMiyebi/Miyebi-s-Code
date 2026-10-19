"use client";

import { useEffect, useRef } from "react";

// Water ripple over an image, from the reference reel's "hover water effect".
//
// A small height field (about 128 cells across) is simulated on the CPU with
// the classic two-buffer wave equation, uploaded as a texture each frame, and
// a WebGL shader bends the photo along the slopes of the waves and adds a
// soft highlight. The <img> underneath stays in place: it's what loads first,
// what search engines and screen readers see, and the fallback when WebGL or
// motion isn't available. The canvas fades in over it once it's ready.

const GRID = 128; // simulation cells across; rows follow the aspect ratio
const DAMPING = 0.975;
const STEP_MS = 1000 / 60;
const CALM = 0.004; // below this the surface counts as still, and drawing pauses
const IDLE_DELAY = 4000; // ms after load before the idle drops begin

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
uniform sampler2D u_image;
uniform sampler2D u_height;
uniform vec2 u_texel;
uniform vec2 u_scale;
uniform vec2 u_offset;
varying vec2 v_uv;
float h(vec2 uv) { return texture2D(u_height, uv).r * 2.0 - 1.0; }
void main() {
  vec2 grad = vec2(
    h(v_uv + vec2(u_texel.x, 0.0)) - h(v_uv - vec2(u_texel.x, 0.0)),
    h(v_uv + vec2(0.0, u_texel.y)) - h(v_uv - vec2(0.0, u_texel.y))
  );
  vec2 uv = (v_uv + grad * 0.08) * u_scale + u_offset;
  vec3 color = texture2D(u_image, clamp(uv, 0.0, 1.0)).rgb;
  vec3 normal = normalize(vec3(-grad * 5.0, 1.0));
  float light = pow(max(dot(normal, normalize(vec3(-0.35, -0.55, 1.0))), 0.0), 60.0);
  float shade = dot(normal.xy, vec2(0.35, 0.55)) * 0.35;
  gl_FragColor = vec4(color * (1.0 - shade) + light * 0.45, 1.0);
}`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "shader");
  return shader;
}

function texture(gl: WebGLRenderingContext) {
  const t = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, t);
  // Photos aren't power-of-two sized, so WebGL 1 needs clamp + no mipmaps.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return t;
}

/** Same-origin, resized copy via the Next.js image optimiser (q=75 is the only quality it allows by default). */
export function optimisedSrc(src: string, width = 1080) {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;
}

export function WaterRipple({ src, className = "" }: { src: string; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) return;

    let disposed = false;
    let raf = 0;
    let visible = true;
    let last = performance.now();
    let acc = 0;
    let lastPointer = 0;
    let nextDrop = performance.now() + IDLE_DELAY;
    let still = false;
    let cols = GRID;
    let rows = GRID;
    let prev = new Float32Array(0);
    let curr = new Float32Array(0);
    let bytes = new Uint8Array(0);
    let pointer: { x: number; y: number } | null = null;

    const program = gl.createProgram()!;
    try {
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    } catch {
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uni = (name: string) => gl.getUniformLocation(program, name);
    const imageTex = texture(gl);
    const heightTex = texture(gl);
    gl.uniform1i(uni("u_image"), 0);
    gl.uniform1i(uni("u_height"), 1);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

    let imageAspect = 1;

    function resize() {
      if (!canvas || !gl) return;
      // 1x is plenty: the source photo is ~930px wide and the waves are soft.
      const dpr = 1;
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);

      cols = GRID;
      rows = Math.max(8, Math.round((GRID * height) / width));
      prev = new Float32Array(cols * rows);
      curr = new Float32Array(cols * rows);
      bytes = new Uint8Array(cols * rows);
      still = false; // resizing clears the canvas, so draw at least once more
      gl.uniform2f(uni("u_texel"), 1 / cols, 1 / rows);

      // object-fit: cover, to line up exactly with the <img> underneath.
      const canvasAspect = width / height;
      if (canvasAspect > imageAspect) {
        const s = imageAspect / canvasAspect;
        gl.uniform2f(uni("u_scale"), 1, s);
        gl.uniform2f(uni("u_offset"), 0, (1 - s) / 2);
      } else {
        const s = canvasAspect / imageAspect;
        gl.uniform2f(uni("u_scale"), s, 1);
        gl.uniform2f(uni("u_offset"), (1 - s) / 2, 0);
      }
    }

    /** Push the surface down around (x, y), in 0..1 coordinates. */
    function disturb(x: number, y: number, radius: number, strength: number) {
      const cx = x * cols;
      const cy = y * rows;
      const r = Math.ceil(radius);
      for (let j = -r; j <= r; j++) {
        for (let i = -r; i <= r; i++) {
          const gx = Math.round(cx + i);
          const gy = Math.round(cy + j);
          if (gx < 1 || gy < 1 || gx >= cols - 1 || gy >= rows - 1) continue;
          const d2 = (i * i + j * j) / (radius * radius);
          if (d2 > 1) continue;
          curr[gy * cols + gx] -= strength * (1 - d2);
        }
      }
      still = false;
    }

    function step() {
      for (let y = 1; y < rows - 1; y++) {
        for (let x = 1; x < cols - 1; x++) {
          const i = y * cols + x;
          prev[i] = ((curr[i - 1] + curr[i + 1] + curr[i - cols] + curr[i + cols]) / 2 - prev[i]) * DAMPING;
        }
      }
      [prev, curr] = [curr, prev];
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!visible || !gl) return;
      acc = Math.min(acc + (now - last), STEP_MS * 4);
      last = now;

      // With nobody touching it, the surface gets the odd gentle drop so
      // it never looks frozen (and phones see the effect too).
      if (now - lastPointer > 2500 && now > nextDrop) {
        disturb(0.2 + Math.random() * 0.6, 0.25 + Math.random() * 0.5, 3, 0.9);
        nextDrop = now + 1800 + Math.random() * 1800;
      }

      if (still) return;
      while (acc >= STEP_MS) {
        step();
        acc -= STEP_MS;
      }

      let energy = 0;
      for (let i = 0; i < curr.length; i++) {
        const h = curr[i];
        energy = Math.max(energy, h < 0 ? -h : h);
        const v = h * 0.5 + 0.5;
        bytes[i] = v <= 0 ? 0 : v >= 1 ? 255 : v * 255;
      }
      // Flat water: draw this last frame, then sleep until the next disturbance.
      if (energy < CALM) {
        curr.fill(0);
        prev.fill(0);
        bytes.fill(128);
        still = true;
      }
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, heightTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, cols, rows, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, bytes);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function onMove(e: PointerEvent) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      // Fill in the path between events so fast strokes leave a smooth wake.
      const from = pointer ?? { x, y };
      const dist = Math.hypot((x - from.x) * cols, (y - from.y) * rows);
      const steps = Math.max(1, Math.ceil(dist / 2));
      const strength = Math.min(0.25 + dist * 0.04, 0.9);
      for (let s = 1; s <= steps; s++) {
        disturb(from.x + ((x - from.x) * s) / steps, from.y + ((y - from.y) * s) / steps, 2.5, strength);
      }
      pointer = { x, y };
      lastPointer = performance.now();
    }
    const onLeave = () => (pointer = null);
    const onDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      disturb((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height, 4, 1.4);
      lastPointer = performance.now();
    };

    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (disposed) return;
      imageAspect = image.naturalWidth / image.naturalHeight;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, imageTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
      resize();
      last = performance.now();
      raf = requestAnimationFrame(frame);
      canvas.style.opacity = "1";
    };
    // Set up once the page has finished its own loading work, so the
    // effect never competes with the first paint or with hydration.
    const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 200));
    const idleHandle = idle(() => (image.src = optimisedSrc(src)), { timeout: 2500 });

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    io.observe(canvas);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerleave", onLeave);
    const onLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(raf);
      canvas.style.opacity = "0";
    };
    canvas.addEventListener("webglcontextlost", onLost);

    return () => {
      disposed = true;
      (window.cancelIdleCallback ?? clearTimeout)(idleHandle);
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      io.disconnect();
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("webglcontextlost", onLost);
    };
  }, [src]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`absolute inset-0 size-full touch-pan-y opacity-0 transition-opacity duration-1000 ${className}`}
    />
  );
}
