precision mediump float;
attribute vec2 position;
void main() { gl_Position = vec4(position * 2. - 1., 0, 1); }