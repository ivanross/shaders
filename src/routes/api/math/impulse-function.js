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

float plot(vec2 st) { return smoothstep(0.02, 0.0, abs(st.y - st.x)); }

vec3 draw(in vec2 st, in vec3 color, inout vec3 bg) {
  bg = mix(bg, color, plot(st));
  return bg;
}

vec2 fn1(in vec2 st) {

  st.x = cos(st.x + sin(st.x)) * 0.5 + 0.5;
  return st;
}

vec2 fn2(in vec2 st) {

  st.x = pow(cos(st.x), 4.);
  return st;
}

vec2 fn3(in vec2 st) {

  st.x = pow(cos(st.x + sin(st.x)) * 0.5 + 0.5, 20.);
  return st;
}

void main() {

  vec2 st = gl_FragCoord.xy / u_resolution;
  st = st * 2. - 1.;
  st *= u_resolution / min(u_resolution.x, u_resolution.y);

  vec3 col = vec3(0);

  st *= 2.;
  // AXES
  draw(vec2(0., st.y), vec3(0.4392, 0.4392, 0.4392), col);
  draw(vec2(1., st.y), vec3(0.1529, 0.1529, 0.1529), col);
  draw(vec2(st.x, 0), vec3(0.4392, 0.4392, 0.4392), col);

  st.x += u_time;

  // PLOT
  draw(fn1(st), vec3(0.0431, 1.0, 0.7922), col);
  draw(fn2(st), vec3(1.0, 0.0431, 0.9529), col);
  draw(fn3(st), vec3(0.9059, 1.0, 0.0431), col);

  gl_FragColor = vec4(col, 1.0);
}
`

export const get = shader({ frag })
