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

vec3 scene(vec2 st, float time) {
  vec2 pos = vec2(cos(time * 5.), sin(time * 3.)) * 0.5;
  vec3 col = circle(st + pos, .01) * vec3(1.);

  return col;
}

#define OFF 0.005

void main() {

  vec2 st = gl_FragCoord.xy / u_resolution;
  st = st * 2. - 1.;
  st *= u_resolution / min(u_resolution.x, u_resolution.y);

  vec3 col = vec3(0);

  // CHROMATIC ABERRATION
  col += vec3(1., 0., 0.) * scene(st, u_time);
  col += vec3(0., 1., 0.) * scene(st, u_time - OFF);
  col += vec3(0., 0., 1.) * scene(st, u_time - OFF * 2.);

  gl_FragColor = vec4(col, 1.0);
}
