<script>
  import buildRegl from "regl";

  import vert from "./fragment.glsl";
  export let frag;
  const regl = buildRegl();

  const draw = regl({
    frag,
    vert,

    attributes: { position: [-2, 0, 0, -2, 2, 2] },

    uniforms: {
      u_resolution: ({ viewportWidth, viewportHeight }) => [
        viewportWidth,
        viewportHeight,
      ],
      u_mouse: [0, 0],
      u_time: ({ time }) => time,
    },

    depth: { enable: false },
    count: 3,
  });

  regl.frame(() => {
    regl.clear({ color: [0, 0, 0, 1] });
    draw();
  });
</script>
