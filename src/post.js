// Final screen-space pass: barrel/fisheye, chromatic aberration, glitch rows, TV static, grain, vignette.
// Background snow goes on last, unwarped and unvignetted, wherever tMask (scene alpha) is empty.

export const CRTShader = {
  uniforms: {
    tDiffuse: { value: null },
    tMask: { value: null },      // scene render saved before trails/bloom, alpha = something drawn
    uTime: { value: 0 },
    uResolution: { value: [1, 1] },
    uDistortion: { value: 0.32 },
    uAberration: { value: 0.006 },
    uGrain: { value: 0.09 },
    uStatic: { value: 0 },       // 0..1 full-screen static burst
    uGlitch: { value: 0 },       // 0..1 horizontal row tearing
    uScanlines: { value: 0.06 },
    uVignette: { value: 0.55 },
    uBgStatic: { value: 0.25 },  // background snow brightness
    uPixel: { value: 1 },        // snow grain size in device pixels
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse, tMask;
    uniform float uTime, uDistortion, uAberration, uGrain, uStatic, uGlitch, uScanlines, uVignette, uBgStatic, uPixel;
    uniform vec2 uResolution;
    varying vec2 vUv;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    vec2 barrel(vec2 uv, float k) {
      vec2 c = uv - 0.5;
      float r2 = dot(c, c);
      c *= 1.0 + k * r2;
      // keep the frame filled: pincushion (k > 0) is scaled so the corners land on the corners,
      // negative k so the edge midpoints land on the edges, so nothing samples outside the image
      c /= 1.0 + k * (k > 0.0 ? 0.5 : 0.25);
      return c + 0.5;
    }

    void main() {
      vec2 uv = vUv;

      // horizontal tearing: random row bands shift sideways
      float band = floor(uv.y * 48.0);
      float t = floor(uTime * 24.0);
      float n = hash(vec2(band, t));
      if (n < uGlitch * 0.35) uv.x += (hash(vec2(t, band)) - 0.5) * 0.12 * uGlitch;

      vec2 c = uv - 0.5;
      float dist = length(c);
      vec2 dir = dist > 0.0 ? c / dist : vec2(0.0);
      float ab = uAberration * (0.3 + dist * 2.0) * (1.0 + uGlitch * 3.0);

      vec2 uvR = barrel(uv + dir * ab, uDistortion);
      vec2 uvG = barrel(uv, uDistortion);
      vec2 uvB = barrel(uv - dir * ab, uDistortion);

      vec3 col = vec3(
        texture2D(tDiffuse, uvR).r,
        texture2D(tDiffuse, uvG).g,
        texture2D(tDiffuse, uvB).b
      );

      // outside the distorted frame -> black (the bg snow fills it below)
      float fg = texture2D(tMask, uvG).a;
      if (any(lessThan(uvG, vec2(0.0))) || any(greaterThan(uvG, vec2(1.0)))) { col = vec3(0.0); fg = 0.0; }

      // scanlines
      col *= 1.0 - uScanlines * (0.5 + 0.5 * sin(vUv.y * uResolution.y * 1.5));

      // TV static: full burst + a faint rolling band always present
      float snow = hash(vUv * uResolution + fract(uTime * 61.7) * 100.0);
      float roll = smoothstep(0.06, 0.0, abs(fract(vUv.y - uTime * 0.13) - 0.5)) * 0.08;
      col = mix(col, vec3(snow), clamp(uStatic + roll * 0.5, 0.0, 1.0));

      // film grain
      float g = hash(vUv * uResolution * 0.5 + uTime * 13.1) - 0.5;
      col += g * uGrain * (0.25 + col);   // grain rides on brightness so black stays black

      // vignette
      col *= 1.0 - uVignette * smoothstep(0.35, 0.85, dist);

      // background snow in plain screen space: per-line gain jitter and a slow darker roll bar
      vec2 px = floor(gl_FragCoord.xy / uPixel);
      float frame = floor(uTime * 30.0);
      float bg = hash(px + fract(frame * 0.6180339) * 1000.0);
      bg *= 0.75 + 0.25 * hash(vec2(px.y, frame));
      bg *= 1.0 - 0.35 * smoothstep(0.2, 0.0, abs(fract(px.y * 0.002 - uTime * 0.07) - 0.5));
      col += bg * uBgStatic * (1.0 - fg);

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};
