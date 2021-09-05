<script>
  import { fetchShader } from '../lib/api'
  import ErrorPage from './ErrorPage.svelte'
  import Loader from '../components/Loader.svelte'
  import Shader from '../components/Shader.svelte'
  import ShaderMenu from '../components/ShaderMenu.svelte'

  export let src
</script>

<svelte:head>
  <title>
    Shaders / {src}
  </title>
</svelte:head>

{#await fetchShader(src)}
  <Loader />
{:then frag}
  <Shader {frag} />
  <ShaderMenu {src} />
{:catch error}
  <ErrorPage {...error} />
{/await}
