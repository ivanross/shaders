<script>
  import buildRegl from 'regl'
  import { onDestroy } from 'svelte'

  export let vert
  export let frag
  const regl = buildRegl()

  const draw = regl({
    frag,
    vert,

    attributes: { position: [-3, 0, 0, -3, 3, 3] },

    uniforms: {
      u_resolution: ({ viewportWidth, viewportHeight }) => [viewportWidth, viewportHeight],
      u_mouse: [0, 0],
      u_time: ({ time }) => time,
    },

    depth: { enable: false },
    count: 3,
  })

  regl.frame(() => {
    regl.clear({ color: [0, 0, 0, 1] })
    draw()
  })

  onDestroy(() => regl.destroy())
</script>
