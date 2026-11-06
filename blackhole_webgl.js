/**
 * BlackHoleWebGL - Real-time Schwarzschild Black Hole Raymarcher (Gargantua Style)
 * 
 * Pure WebGL2 implementation with 2-pass rendering:
 *  - Pass 1: Schwarzschild Geodesic Ray Marching (adaptive dt, Doppler beaming,
 *            accretion disk with 5-octave seamless FBM, lensed moon with rim light)
 *            rendered into an offscreen RGBA8 texture with mipmap generation.
 *  - Pass 2: Post-processing (multi-level mipmap bloom, vignette, film grain,
 *            smooth 2.5s fade-in) onto the screen.
 *
 * Standalone component - No external libraries required.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.initBlackHoleBackground = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  // ─── SHADER SOURCES ───────────────────────────────────────────────

  // Fullscreen triangle vertex shader (uses gl_VertexID, no buffers required)
  const VS_SOURCE = `#version 300 es
  precision highp float;
  out vec2 v_uv;
  void main() {
    float x = float((gl_VertexID & 1) << 2);
    float y = float((gl_VertexID & 2) << 1);
    v_uv = vec2(x * 0.5, y * 0.5);
    gl_Position = vec4(x - 1.0, y - 1.0, 0.0, 1.0);
  }`;

  // Pass 1: Schwarzschild Ray Marching Fragment Shader
  const FS_RAYMARCH = `#version 300 es
  precision highp float;

  in vec2 v_uv;
  out vec4 fragColor;

  uniform vec2  u_resolution;
  uniform float u_time;
  uniform float u_spin;            // Accretion disk spin speed multiplier
  uniform float u_diskBrightness;  // Accretion disk brightness scale
  uniform float u_bloomStrength;   // Bloom tuning parameter

  // 3D hash for value noise and starry background
  float hash3D(vec3 p) {
    p = fract(p * vec3(443.897, 441.423, 437.195));
    p += dot(p, p.yxz + 19.19);
    return fract((p.x + p.y) * p.z);
  }

  // Smooth 3D value noise
  float valueNoise3D(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);

    float n000 = hash3D(i + vec3(0.0, 0.0, 0.0));
    float n100 = hash3D(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash3D(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash3D(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash3D(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash3D(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash3D(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash3D(i + vec3(1.0, 1.0, 1.0));

    float x00 = mix(n000, n100, u.x);
    float x10 = mix(n010, n110, u.x);
    float x01 = mix(n001, n101, u.x);
    float x11 = mix(n011, n111, u.x);

    float y0 = mix(x00, x10, u.y);
    float y1 = mix(x01, x11, u.y);

    return mix(y0, y1, u.z);
  }

  // 5-Octave Fractional Brownian Motion (FBM)
  float fbm5(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    vec3 shift = vec3(100.0);
    for (int i = 0; i < 5; ++i) {
      v += a * valueNoise3D(p);
      p = p * 2.02 + shift;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    // Portrait normalized coordinates: origin at center, -0.5 to 0.5 along height
    vec2 fragCoord = gl_FragCoord.xy;
    vec2 uv = (fragCoord - 0.5 * u_resolution) / u_resolution.y;

    float t = u_time;

    // Automated subtle drifting camera motions (no interaction required)
    float yaw   = 0.14 * sin(t * 0.07);
    float pitch = 0.12 + 0.03 * sin(t * 0.11);
    float roll  = -0.32 + 0.03 * sin(t * 0.09); // Negative roll tilts disk diagonally down-left

    // Camera at distance 17.0 looking along +Z
    float R_cam = 17.0;
    vec3 camPos = vec3(
      R_cam * sin(yaw) * cos(pitch),
      R_cam * sin(pitch),
      -R_cam * cos(yaw) * cos(pitch)
    );

    // Target slightly shifted down-right to place BH in upper quadrant
    vec3 target = vec3(0.1, -1.85, 0.0);
    vec3 forward = normalize(target - camPos);
    vec3 worldUp = vec3(0.0, 1.0, 0.0);
    vec3 right = normalize(cross(forward, worldUp));
    vec3 up = cross(right, forward);

    // Apply camera roll
    float cr = cos(roll);
    float sr = sin(roll);
    vec3 rRight = right * cr + up * sr;
    vec3 rUp    = -right * sr + up * cr;

    // Primary ray direction (FOV factor 0.8)
    vec3 rayDir = normalize(forward * 0.8 + uv.x * rRight + uv.y * rUp);

    // ─── Schwarzschild Ray Marching Loop ───
    vec3 pos = camPos;
    vec3 vel = rayDir;
    float transmittance = 1.0;
    vec3 accumColor = vec3(0.0);

    // Moon parameters: orbiting at radius ~15.0
    // Starts at angle 1.2 in lower-right of viewport
    float moonAngle = 1.2 + t * 0.045;
    vec3 moonPos = vec3(15.0 * cos(moonAngle), -2.2 * sin(moonAngle), 15.0 * sin(moonAngle));
    float moonRadius = 0.45;
    bool hitMoon = false;

    vec3 p_prev = pos;

    for (int step = 0; step < 320; ++step) {
      float r = length(pos);

      // Event horizon (Rs = 1.0 in geometric units): captured by black hole
      if (r < 1.0) {
        transmittance = 0.0;
        break;
      }

      // Early exit if medium is opaque
      if (transmittance < 0.02) {
        break;
      }

      // Ray escaped outer boundary
      if (r > 40.0 && dot(pos, vel) > 0.0) {
        break;
      }

      // Adaptive step size: dt = clamp(0.05 * (r - 0.7), 0.012, 0.8)
      float dt = clamp(0.05 * (r - 0.7), 0.012, 0.8);

      p_prev = pos;

      // Schwarzschild gravitational deflection:
      // acc = -1.5 * dot(h, h) * pos / r^5 where h = cross(pos, vel)
      vec3 h = cross(pos, vel);
      float h2 = dot(h, h);
      vec3 acc = -1.5 * h2 * pos / (r * r * r * r * r);

      pos += vel * dt;
      vel = normalize(vel + acc * dt);

      // 1. Moon intersection check on segment [p_prev, pos]
      if (!hitMoon) {
        vec3 seg = pos - p_prev;
        float segLen2 = dot(seg, seg);
        if (segLen2 > 0.000001) {
          float tMoon = clamp(dot(moonPos - p_prev, seg) / segLen2, 0.0, 1.0);
          vec3 pClose = p_prev + seg * tMoon;
          float dMoon = length(pClose - moonPos);
          if (dMoon < moonRadius) {
            hitMoon = true;
            vec3 nMoon = normalize(pClose - moonPos);
            vec3 toCenter = normalize(-moonPos); // Central luminous disk direction
            vec3 viewDir = -vel;
            // Rim light on the surface facing the accretion disk
            float rim = pow(1.0 - max(0.0, dot(nMoon, viewDir)), 3.0) * max(0.0, dot(nMoon, toCenter));
            vec3 moonCol = vec3(rim * 2.2);
            accumColor += transmittance * moonCol;
            transmittance = 0.0;
            break;
          }
        }
      }

      // 2. Accretion Disk intersection: plane y = 0 between r = 2.9 and 13.0
      if (p_prev.y * pos.y <= 0.0 && abs(pos.y - p_prev.y) > 0.00001) {
        float tCross = -p_prev.y / (pos.y - p_prev.y);
        vec3 pDisk = mix(p_prev, pos, clamp(tCross, 0.0, 1.0));
        float rDisk = length(pDisk.xz);

        if (rDisk >= 2.9 && rDisk <= 13.0) {
          float phi = atan(pDisk.z, pDisk.x);
          // Differential rotation: inner matter spins faster
          float phiRot = phi - (u_spin * 2.4 / pow(rDisk, 1.5)) * t;

          // 3D value noise mapping with cos/sin to eliminate seams
          // Layer 1: orbital streaks (k=1.3, freq=5.0)
          // Layer 2: fine filaments (k=4.5, freq=26.0)
          vec3 pNoise1 = vec3(cos(phiRot) * 1.3, sin(phiRot) * 1.3, rDisk * 5.0);
          vec3 pNoise2 = vec3(cos(phiRot) * 4.5, sin(phiRot) * 4.5, rDisk * 26.0);

          float n1 = fbm5(pNoise1);
          float n2 = fbm5(pNoise2);
          float n = mix(n1, n2, 0.38);

          // Streak contrast: 0.25 + 2.2 * pow(n, 2.7)
          float streak = 0.25 + 2.2 * pow(n, 2.7);

          // Radial profile: smoothstep(2.9, 3.7, r) * (3.2/r)^1.7 * (1 - smoothstep(8.5, 13.0, r))
          float rad = smoothstep(2.9, 3.7, rDisk) * pow(3.2 / rDisk, 1.7) * (1.0 - smoothstep(8.5, 13.0, rDisk));

          float intensity = rad * streak * u_diskBrightness;

          // Relativistic Doppler beaming
          // Orbital velocity: vm = 0.6 * sqrt(3.0 / rDisk)
          float vm = 0.6 * sqrt(3.0 / rDisk);
          vec3 tangent = normalize(vec3(-sin(phi), 0.0, cos(phi)));
          float g = 1.0 / max(0.01, 1.0 - vm * dot(tangent, -vel));
          float beam = pow(clamp(g, 0.3, 2.5), 3.4);
          intensity *= beam;

          // Translucent accumulation (shows warped Einstein ring arches above & below)
          float alpha = clamp(intensity * 0.75, 0.0, 0.95);
          accumColor += transmittance * vec3(intensity) * alpha;
          transmittance *= (1.0 - alpha);
        }
      }
    }

    // Outer space background if ray escaped
    if (transmittance > 0.0) {
      float diskGlow = exp(-abs(vel.y) * 4.0) * 0.035;
      float starVal = step(0.9985, hash3D(floor(vel * 180.0)));
      float twinkle = 0.5 + 0.5 * sin(dot(vel, vec3(12.3, 45.6, 78.9)) + t * 2.0);
      vec3 bg = vec3(diskGlow + starVal * twinkle * 0.4);
      accumColor += transmittance * bg;
    }

    // Tone map: L = 1 - exp(-L * 1.15) and output grayscale
    float L = accumColor.r;
    L = 1.0 - exp(-L * 1.15);
    fragColor = vec4(vec3(L), 1.0);
  }`;

  // Pass 2: Post-Processing Fragment Shader (Bloom, Vignette, Film Grain, Fade-in)
  const FS_POSTPROCESS = `#version 300 es
  precision highp float;

  in vec2 v_uv;
  out vec4 fragColor;

  uniform sampler2D u_mainTex;
  uniform vec2      u_resolution;
  uniform float     u_time;
  uniform float     u_bloomStrength; // default 0.9

  void main() {
    vec3 base = texture(u_mainTex, v_uv).rgb;

    // Multi-scale bloom sampled from mipmap levels 2 to 6
    // Weights: .30, .28, .24, .20, .16, pow: 1.6, scale: 0.9
    vec3 b2 = textureLod(u_mainTex, v_uv, 2.0).rgb;
    vec3 b3 = textureLod(u_mainTex, v_uv, 3.0).rgb;
    vec3 b4 = textureLod(u_mainTex, v_uv, 4.0).rgb;
    vec3 b5 = textureLod(u_mainTex, v_uv, 5.0).rgb;
    vec3 b6 = textureLod(u_mainTex, v_uv, 6.0).rgb;

    vec3 bloom = 0.30 * pow(b2, vec3(1.6))
               + 0.28 * pow(b3, vec3(1.6))
               + 0.24 * pow(b4, vec3(1.6))
               + 0.20 * pow(b5, vec3(1.6))
               + 0.16 * pow(b6, vec3(1.6));

    vec3 col = base + bloom * (u_bloomStrength * 0.9);

    // Vignette: c *= 1 - dot(d, d) * 0.9
    vec2 d = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
    col *= max(0.0, 1.0 - dot(d, d) * 0.9);

    // Film grain: strength 0.022 (hash from gl_FragCoord + time)
    float grain = fract(sin(dot(gl_FragCoord.xy + vec2(u_time * 17.13, u_time * 43.71), vec2(12.9898, 78.233))) * 43758.5453);
    col += (grain - 0.5) * 0.022;

    // Fade-in from black in 2.5 seconds
    float fadeIn = clamp(u_time / 2.5, 0.0, 1.0);
    col *= fadeIn;

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }`;

  // ─── SHADER COMPILER HELPER ───────────────────────────────────────
  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`[BlackHoleWebGL] Shader compilation failed:\\n${info}`);
    }
    return shader;
  }

  function createProgram(gl, vsSource, fsSource) {
    const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`[BlackHoleWebGL] Program link failed:\\n${info}`);
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return program;
  }

  // ─── MAIN EXPORT FUNCTION ─────────────────────────────────────────
  /**
   * Initializes real-time Schwarzschild Black Hole WebGL2 background on given canvas.
   *
   * @param {HTMLCanvasElement} canvas The canvas element to render into.
   * @param {Object} [options] Optional uniform overrides & configuration.
   * @returns {Object} Control handle { destroy, pause, resume, setUniforms, getStats }
   */
  function initBlackHoleBackground(canvas, options = {}) {
    if (!canvas) {
      console.error('[BlackHoleWebGL] No canvas element provided.');
      return null;
    }

    // Set canvas styles for full-screen fixed non-interactive background
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '0';

    // 1. Obtain WebGL2 context
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      depth: false,
      stencil: false,
      antialias: false,
      powerPreference: 'high-performance'
    });

    if (!gl) {
      console.warn('[BlackHoleWebGL] WebGL2 not supported. Falling back to CSS dark gradient.');
      canvas.style.background = 'radial-gradient(ellipse at 70% 30%, #15151c 0%, #060608 70%)';
      return {
        destroy: () => {},
        pause: () => {},
        resume: () => {},
        setUniforms: () => {},
        getStats: () => ({ fps: 0, scale: 1, fallback: true })
      };
    }

    // 2. Uniform settings with defaults
    const state = {
      spinSpeed: options.spinSpeed !== undefined ? options.spinSpeed : 1.0,
      diskBrightness: options.diskBrightness !== undefined ? options.diskBrightness : 1.15,
      bloomStrength: options.bloomStrength !== undefined ? options.bloomStrength : 0.9,
      resolutionScale: 1.0, // starts at 1.0, dynamically adapts between 0.70 and 1.0
      paused: false,
      destroyed: false,
      startTime: performance.now(),
      pausedTime: 0,
      lastFrameTime: performance.now(),
      frameTimeEma: 16.6, // EMA in ms
      lastScaleCheck: performance.now()
    };

    // 3. Compile programs
    let pass1Program = null;
    let pass2Program = null;
    let vao = null;

    try {
      pass1Program = createProgram(gl, VS_SOURCE, FS_RAYMARCH);
      pass2Program = createProgram(gl, VS_SOURCE, FS_POSTPROCESS);
      vao = gl.createVertexArray();
    } catch (err) {
      console.error(err);
      canvas.style.background = 'radial-gradient(ellipse at 70% 30%, #15151c 0%, #060608 70%)';
      return null;
    }

    // Uniform locations for Pass 1
    const p1Uniforms = {
      u_resolution:     gl.getUniformLocation(pass1Program, 'u_resolution'),
      u_time:           gl.getUniformLocation(pass1Program, 'u_time'),
      u_spin:           gl.getUniformLocation(pass1Program, 'u_spin'),
      u_diskBrightness: gl.getUniformLocation(pass1Program, 'u_diskBrightness'),
      u_bloomStrength:  gl.getUniformLocation(pass1Program, 'u_bloomStrength')
    };

    // Uniform locations for Pass 2
    const p2Uniforms = {
      u_mainTex:       gl.getUniformLocation(pass2Program, 'u_mainTex'),
      u_resolution:    gl.getUniformLocation(pass2Program, 'u_resolution'),
      u_time:          gl.getUniformLocation(pass2Program, 'u_time'),
      u_bloomStrength: gl.getUniformLocation(pass2Program, 'u_bloomStrength')
    };

    // 4. Create FBO & RGBA8 Texture with Mipmapping
    let fbo = gl.createFramebuffer();
    let fboTexture = gl.createTexture();
    let curWidth = 0;
    let curHeight = 0;

    function resizeBuffers() {
      if (state.destroyed) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
      const w = Math.max(64, Math.floor(window.innerWidth * dpr * state.resolutionScale));
      const h = Math.max(64, Math.floor(window.innerHeight * dpr * state.resolutionScale));

      if (w === curWidth && h === curHeight) return;
      curWidth = w;
      curHeight = h;

      canvas.width = w;
      canvas.height = h;

      // Reallocate FBO texture
      gl.bindTexture(gl.TEXTURE_2D, fboTexture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA8,
        w,
        h,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.generateMipmap(gl.TEXTURE_2D);

      // Attach texture to framebuffer
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        fboTexture,
        0
      );

      const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      if (status !== gl.FRAMEBUFFER_COMPLETE) {
        console.error('[BlackHoleWebGL] Framebuffer incomplete:', status);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    const onResize = () => resizeBuffers();
    window.addEventListener('resize', onResize);
    resizeBuffers();

    // 5. Tab Visibility Handling (document.hidden)
    const onVisibilityChange = () => {
      if (document.hidden) {
        state.paused = true;
      } else {
        if (!state.destroyed) {
          state.paused = false;
          state.lastFrameTime = performance.now();
          requestAnimationFrame(render);
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // 6. Animation & Render Loop
    let animId = null;

    function render(now) {
      if (state.destroyed) return;
      if (state.paused) return;

      const dt = now - state.lastFrameTime;
      state.lastFrameTime = now;

      // Update frame time EMA
      state.frameTimeEma = state.frameTimeEma * 0.9 + dt * 0.1;

      // Dynamic resolution scaler check every ~1.2 seconds
      if (now - state.lastScaleCheck > 1200) {
        state.lastScaleCheck = now;
        let scaleChanged = false;
        if (state.frameTimeEma > 30.0 && state.resolutionScale > 0.70) {
          state.resolutionScale = Math.max(0.70, state.resolutionScale * 0.92);
          scaleChanged = true;
        } else if (state.frameTimeEma < 20.0 && state.resolutionScale < 1.0) {
          state.resolutionScale = Math.min(1.0, state.resolutionScale * 1.05);
          scaleChanged = true;
        }
        if (scaleChanged) {
          resizeBuffers();
          if (options.onPerformanceScale) {
            options.onPerformanceScale(state.resolutionScale);
          }
        }
      }

      const elapsedSec = (now - state.startTime) * 0.001;

      // ─── PASS 1: Schwarzschild Ray Marching to FBO ───
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.viewport(0, 0, curWidth, curHeight);

      gl.useProgram(pass1Program);
      gl.bindVertexArray(vao);

      gl.uniform2f(p1Uniforms.u_resolution, curWidth, curHeight);
      gl.uniform1f(p1Uniforms.u_time, elapsedSec);
      gl.uniform1f(p1Uniforms.u_spin, state.spinSpeed);
      gl.uniform1f(p1Uniforms.u_diskBrightness, state.diskBrightness);
      gl.uniform1f(p1Uniforms.u_bloomStrength, state.bloomStrength);

      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // Generate mipmaps on FBO texture for bloom sampling in Pass 2
      gl.bindTexture(gl.TEXTURE_2D, fboTexture);
      gl.generateMipmap(gl.TEXTURE_2D);

      // ─── PASS 2: Post-Processing to Screen ───
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, curWidth, curHeight);

      gl.useProgram(pass2Program);
      gl.bindVertexArray(vao);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fboTexture);
      gl.uniform1i(p2Uniforms.u_mainTex, 0);

      gl.uniform2f(p2Uniforms.u_resolution, curWidth, curHeight);
      gl.uniform1f(p2Uniforms.u_time, elapsedSec);
      gl.uniform1f(p2Uniforms.u_bloomStrength, state.bloomStrength);

      gl.drawArrays(gl.TRIANGLES, 0, 3);

      animId = requestAnimationFrame(render);
    }

    // Start render loop
    animId = requestAnimationFrame(render);

    // 7. Return Controller API
    return {
      destroy: () => {
        state.destroyed = true;
        if (animId) cancelAnimationFrame(animId);
        window.removeEventListener('resize', onResize);
        document.removeEventListener('visibilitychange', onVisibilityChange);

        if (fbo) gl.deleteFramebuffer(fbo);
        if (fboTexture) gl.deleteTexture(fboTexture);
        if (vao) gl.deleteVertexArray(vao);
        if (pass1Program) gl.deleteProgram(pass1Program);
        if (pass2Program) gl.deleteProgram(pass2Program);
      },
      pause: () => {
        state.paused = true;
        if (animId) cancelAnimationFrame(animId);
      },
      resume: () => {
        if (!state.paused || state.destroyed) return;
        state.paused = false;
        state.lastFrameTime = performance.now();
        animId = requestAnimationFrame(render);
      },
      setUniforms: (newUniforms = {}) => {
        if (newUniforms.spinSpeed !== undefined) state.spinSpeed = newUniforms.spinSpeed;
        if (newUniforms.diskBrightness !== undefined) state.diskBrightness = newUniforms.diskBrightness;
        if (newUniforms.bloomStrength !== undefined) state.bloomStrength = newUniforms.bloomStrength;
      },
      getStats: () => ({
        fps: Math.round(1000 / Math.max(1, state.frameTimeEma)),
        frameTime: state.frameTimeEma.toFixed(1),
        resolutionScale: state.resolutionScale.toFixed(2),
        width: curWidth,
        height: curHeight
      })
    };
  }

  return initBlackHoleBackground;
}));
