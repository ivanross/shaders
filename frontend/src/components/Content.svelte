<script>
  import { fetchShader } from "../lib/api";
  import Error from "./Error.svelte";
  import Loader from "./Loader.svelte";
  import Shader from "./Shader.svelte";

  export let src;
</script>

{#await fetchShader(src)}
  <Loader />
{:then frag}
  <Shader {frag} />
{:catch error}
  <Error {...error} />
{/await}
