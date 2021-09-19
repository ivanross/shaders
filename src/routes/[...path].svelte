<script context="module">
  /**
   * @type {import('@sveltejs/kit').Load}
   */
  export async function load({ page, fetch }) {
    const src = page.params.path
    const url = `/api/${src}`
    const res = await fetch(url)

    if (res.ok)
      return {
        props: { ...(await res.json()), src },
      }

    return {
      status: res.status,
      error: `Shader <i>${src}</i> not found`,
    }
  }
</script>

<script>
  import { browser } from '$app/env'
  import ShaderMenu from '../components/ShaderMenu.svelte'
  import Shader from '../components/Shader.svelte'
  import pass from '../vertex/Pass.vert'

  export let vert = pass
  export let frag
  export let src
</script>

{#if browser}
  {#key src}
    <Shader {vert} {frag} />
  {/key}
  <ShaderMenu {src} />
{/if}
