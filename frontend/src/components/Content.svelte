<script>
  import { fetchShader } from "../fetchShader";
  import Error from "./Error.svelte";
  import Loader from "./Loader.svelte";
  import Shader from "./Shader.svelte";

  export let src;
</script>

{#await fetchShader(src)}
  <Loader />
{:then frag}
  <Shader {frag} />
{:catch message}
  <Error {message} />
{/await}
