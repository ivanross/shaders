import { glsl, shader } from '../../../utils'

const frag = glsl`
// Author: Ivan Rossi <ivanross.me@gmail.com>
// Title: Noise on Noise

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

vec4 permute(vec4 x) { return mod(((x * 34.) + 1.) * x, 289.); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - .85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1. / 6., 1. / 3.);
  const vec4 D = vec4(0., .5, 1., 2.);

  // First corner
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  // Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1. - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  //  x0 = x0 - 0. + 0.0 * C
  vec3 x1 = x0 - i1 + 1. * C.xxx;
  vec3 x2 = x0 - i2 + 2. * C.xxx;
  vec3 x3 = x0 - 1. + 3. * C.xxx;

  // Permutations
  i = mod(i, 289.);
  vec4 p = permute(permute(permute(i.z + vec4(0., i1.z, i2.z, 1.)) + i.y +
                           vec4(0., i1.y, i2.y, 1.)) +
                   i.x + vec4(0., i1.x, i2.x, 1.));

  // Gradients
  // ( N*N points uniformly over a square, mapped onto an octahedron.)
  float n_ = 1. / 7.; // N=7
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49. * floor(p * ns.z * ns.z); //  mod(p,N*N)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7. * x_); // mod(j,N)

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1. - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2. + 1.;
  vec4 s1 = floor(b1) * 2. + 1.;
  vec4 sh = -step(h, vec4(0.));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  // Normalise gradients
  vec4 norm =
      taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  // Mix final noise value
  vec4 m =
      max(.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.);
  m = m * m;
  return 42. *
         dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
float bell(float v, float a, float b) {
  return smoothstep(a, (b + a) / 2., v) - smoothstep((b + a) / 2., b, v);
}

float block(float from, float to, float i) {
  return (smoothstep(from, (from + to) / 2., i) -
          smoothstep((from + to) / 2., to, i)) *
         .7;
}
vec3 palette(float i) {
  i *= 4.;
  vec3 col;
  col += block(-1., 2., i) * vec3(1., 0., .9176);
  col += block(0., 3., i) * vec3(.8157, .9804, .3647);
  col += block(1., 4., i) * vec3(0., .9333, 1.);
  col += block(2., 5., i) * vec3(1., .9333, 0.);

  return col;
}

float nonoise(vec3 v) {
  float n = snoise(vec3(v.xy * 4., v.z * .04));
  float amplified = n * 3.;
  float fr = fract(amplified);

  float big = sin(snoise(vec3(v.yx, u_time * .25))) * 10.;
  float normBig = (step(.5, big) + bell(big, .1, .9));
  float m = bell(fr * normBig, .0, .1);

  return m;
}

vec3 colnoise(vec3 v) {
  vec3 res;

  float coeff = .075;
  res.x = nonoise(vec3(v.xy, v.z));
  res.y = nonoise(vec3(v.xy, v.z + coeff));
  res.z = nonoise(vec3(v.xy, v.z + coeff * 2.));

  res = palette(nonoise(v));
  return res;
}

void main() {
  vec2 st = gl_FragCoord.xy / u_resolution.xy;
  st.x *= u_resolution.x / u_resolution.y;

  vec3 n = colnoise(vec3(st, u_time));

  gl_FragColor = vec4(n, 1.);

  vec3 col = palette((snoise(vec3(st, u_time * .124) * 4.)));

  gl_FragColor =
      vec4(palette(fract((snoise(vec3(st * 10., u_time * .1))) * 3.)), 1.);

  // gl_FragColor=vec4(palette(st.x),1.);
}
`
export const get = shader({ frag })
