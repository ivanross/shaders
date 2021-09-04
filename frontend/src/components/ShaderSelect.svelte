<script>
  import { link } from "svelte-navigator";
  import { shaderListStore } from "../stores";

  const [data, loading] = shaderListStore;
</script>

<div class="wrapper">
  {#if !$loading}
    {#each $data ?? [] as href}
      <a {href} use:link>
        <div>
          {href}
        </div>
      </a>
    {/each}
  {/if}
</div>

<style>
  .wrapper {
    background-color: #121212;
    overflow-y: auto;
    height: 100%;
    width: 100%;
  }

  a > div {
    margin: 0.5rem 1rem;
  }
</style>
