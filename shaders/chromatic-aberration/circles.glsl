// Author: Ivan Rossi <ivanross.me@gmail.com>
// Title: Noise on Noise

#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.1415926538
#define TAU 6.2831853076

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

float circle(vec2 _st, float _radius) {
  vec2 dist = _st;
  return 1. - smoothstep(_radius - (_radius * 0.01), _radius + (_radius * 0.01),
                         dot(dist, dist) * 2.);
}

vec3 scene(vec2 st, float time) {

  vec3 col = vec3(0.);

  float r = length(st);
  float angle = ((atan(st.y, st.x)));
  float speed = 9.;

  // r += cos(time) * 0.5 + 0.5;
  // angle += cos(r + time * speed);

  float r_off = pow(sin(r * 7. - time * speed) * .5 + 0.5, 10.);
  r += r_off * 0.02;
  st.x = r * cos(angle);
  st.y = r * sin(angle);

  st *= 20.;

  st = fract(st);
  col += circle((st - 0.5) * 5., 1.);

  // return vec3((r_off));
  return col;
}

#define OFF .04

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
