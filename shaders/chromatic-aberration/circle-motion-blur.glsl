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

float rect(vec2 coord, vec2 dimensions, vec2 offset) {
  vec2 shaper = step(offset, coord);
  shaper *= step(coord, offset + dimensions);

  return shaper.x * shaper.y;
}

float segment(vec2 P, vec2 A, vec2 B, float r) {
  vec2 g = B - A;
  vec2 h = P - A;
  float d = length(h - g * clamp(dot(g, h) / dot(g, g), 0.0, 1.0));
  return smoothstep(r, 0.5 * r, d);
}

vec3 scene(vec2 st, float time) {

  vec3 col = vec3(0);

  vec2 pos1 = vec2(cos(time * 5.), sin(time * 3.)) * 0.5;
  col = mix(col, vec3(1.), circle(st + pos1, .01));

  vec2 pos2 = vec2(cos(time * 5.), sin(time + cos(time) * 10.)) * 0.5;
  col = mix(col, vec3(1.), rect(st, vec2(0.15), pos2));

  col = mix(col, vec3(1.),
            segment(st, -pos1 * 2., pos2 * 2. + vec2(0.15 / 2.), .03));
  return col;
}

#define CA_OFF .0075
#define BM_OFF CA_OFF
#define BM_STEPS 5.

void main() {

  vec2 st = gl_FragCoord.xy / u_resolution;
  st = st * 2. - 1.;
  st *= u_resolution / min(u_resolution.x, u_resolution.y);

  vec3 col = vec3(0);

  for (float i = 0.; i < BM_STEPS; i++) {

    float t = u_time;
    // t *= .9;
    float bm_time = t - i * BM_OFF;
    vec3 ab = vec3(0.);
    // CHROMATIC ABERRATION
    ab += vec3(1., 0., 0.) * scene(st, bm_time);
    ab += vec3(0., 1., 0.) * scene(st, bm_time - CA_OFF);
    ab += vec3(0., 0., 1.) * scene(st, bm_time - CA_OFF * 2.);

    col = mix(ab, col, i / BM_STEPS);
  }

  gl_FragColor = vec4(col, 1.0);
}
