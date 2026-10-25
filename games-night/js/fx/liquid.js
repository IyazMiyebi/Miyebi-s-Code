/*
 * "Hover water" effect: a picture that ripples like liquid, with a rainbow fringe on the
 * wave edges. The picture is painted by `paint(ctx, w, h)` on a hidden canvas, then
 * distorted on the GPU. Ripples follow the mouse; with no mouse (a TV), they fall on
 * their own like rain. With reduced motion the picture is shown still.
 */
(function () {
  GN.fx = GN.fx || {};

  const MAX_DROPS = 24;

  const VERT = `
    attribute vec2 p;
    varying vec2 uv;
    void main() { uv = p * 0.5 + 0.5; uv.y = 1.0 - uv.y; gl_Position = vec4(p, 0.0, 1.0); }`;

  const FRAG = `
    precision mediump float;
    varying vec2 uv;
    uniform sampler2D tex;
    uniform float aspect;
    uniform float time;
    uniform vec3 drops[${MAX_DROPS}];
    void main() {
      vec2 disp = vec2(0.0);
      float energy = 0.0;
      vec2 a = vec2(aspect, 1.0);
      for (int i = 0; i < ${MAX_DROPS}; i++) {
        vec3 d = drops[i];
        float age = time - d.z;
        if (age < 0.0 || age > 3.2) continue;
        vec2 dir = (uv - d.xy) * a;
        float dist = length(dir);
        float front = dist - age * 0.32;
        float ring = exp(-front * front * 260.0) * sin(front * 90.0);
        float fade = exp(-age * 1.15) * smoothstep(0.0, 0.12, age);
        float w = ring * fade;
        disp += normalize(dir + 1e-5) * w * 0.022 * min(1.0, aspect) / a; // gentler on tall phone screens
        energy += abs(w);
      }
      // A slow swell so the surface is never perfectly still.
      disp += vec2(sin(uv.y * 9.0 + time * 0.7), cos(uv.x * 7.0 + time * 0.5)) * 0.0016;
      float r = texture2D(tex, uv + disp * 1.5).r;
      float g = texture2D(tex, uv + disp).g;
      float b = texture2D(tex, uv + disp * 0.55).b;
      vec3 col = vec3(r, g, b);
      vec3 rainbow = 0.5 + 0.5 * cos(6.2831 * (energy * 1.6 + uv.x * 0.6 + vec3(0.0, 0.33, 0.67)));
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      col += rainbow * clamp(energy, 0.0, 1.0) * (0.12 + lum * 0.55);
      gl_FragColor = vec4(col, 1.0);
    }`;

  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  GN.fx.liquid = function (canvas, paint) {
    const src = document.createElement("canvas");
    const sctx = src.getContext("2d");
    let gl = null, prog, texture, uDrops, uTime, uAspect;
    try {
      gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false });
      if (gl) {
        prog = gl.createProgram();
        gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
        gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link failed");
        gl.useProgram(prog);
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(prog, "p");
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        uDrops = gl.getUniformLocation(prog, "drops");
        uTime = gl.getUniformLocation(prog, "time");
        uAspect = gl.getUniformLocation(prog, "aspect");
      }
    } catch (e) {
      gl = null;
    }
    // No WebGL: paint straight onto the visible canvas instead.
    const flat = gl ? null : canvas.getContext("2d");

    const drops = new Float32Array(MAX_DROPS * 3).fill(-99);
    let next = 0, raf = 0, start = performance.now(), lastPointer = -1e9, lastDrop = { x: -1, y: -1, t: 0 };
    let autoTimer = 0;
    const now = () => (performance.now() - start) / 1000;

    function drop(x, y) {
      drops[next * 3] = x;
      drops[next * 3 + 1] = y;
      drops[next * 3 + 2] = now();
      next = (next + 1) % MAX_DROPS;
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      canvas.width = src.width = w;
      canvas.height = src.height = h;
      sctx.setTransform(1, 0, 0, 1, 0, 0);
      paint(sctx, w, h, dpr);
      if (gl) {
        gl.viewport(0, 0, w, h);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
        gl.uniform1f(uAspect, w / h);
      } else {
        flat.drawImage(src, 0, 0);
      }
      render();
    }

    function render() {
      if (!gl) return;
      gl.uniform1f(uTime, now());
      gl.uniform3fv(uDrops, drops);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function loop() {
      render();
      raf = requestAnimationFrame(loop);
    }

    function onMove(e) {
      if (!GN.motionOK()) return;
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      const t = performance.now();
      lastPointer = t;
      const dx = (x - lastDrop.x) * r.width, dy = (y - lastDrop.y) * r.height;
      if (dx * dx + dy * dy > 1600 && t - lastDrop.t > 50) {
        drop(x, y);
        lastDrop = { x, y, t };
      }
    }

    // Rain when nobody is moving a mouse.
    function rain() {
      if (GN.motionOK() && performance.now() - lastPointer > 4000 && !document.hidden) {
        drop(0.15 + Math.random() * 0.7, 0.2 + Math.random() * 0.6);
      }
      autoTimer = setTimeout(rain, 1400 + Math.random() * 1800);
    }

    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });

    function play() {
      cancelAnimationFrame(raf);
      if (gl && GN.motionOK()) loop(); else render();
    }
    play();
    rain();

    return {
      drop,
      repaint: resize,
      play,
      destroy() {
        cancelAnimationFrame(raf);
        clearTimeout(autoTimer);
        ro.disconnect();
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerdown", onMove);
        const lose = gl && gl.getExtension("WEBGL_lose_context");
        if (lose) lose.loseContext();
      }
    };
  };
})();
