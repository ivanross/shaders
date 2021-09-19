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

float circle(vec2 _st, float _radius) {
  vec2 dist = _st;
  return 1. - smoothstep(_radius - (_radius * 0.01), _radius + (_radius * 0.01),
                         dot(dist, dist) * 2.);
}

float square(vec2 _st, float side) {
  return step(-side / 2., _st.x) * step(_st.x, side / 2.);
}

void main() {

  vec2 st = gl_FragCoord.xy / u_resolution;
  st = st * 2. - 1.;
  st *= u_resolution / min(u_resolution.x, u_resolution.y);

  vec3 col = vec3(.75);

  col.x = mix(0., 1., fract(st.x));
  col.y = mix(0., 1., fract(st.y));

  col += circle(st, 2.);
  gl_FragColor = vec4(col, 1.0);
}
`

export const get = shader({ frag })
