<script>
  import Error from "./Error.svelte";
  import Loader from "./Loader.svelte";
  import Shader from "./Shader.svelte";

  const promise = window.fetch("assets/shaders/noise-2.glsl").then((res) => {
    if (res.status >= 400)
      throw new Error(`Error ${res.status}: ${res.statusText}`);

    return new Promise((resolve) =>
      setTimeout(() => resolve(res.text()), 3000)
    );
  });
</script>

{#await promise}
  <Loader />
{:then frag}
  <Shader {frag} />
{:catch message}
  <Error {message} />
{/await}
