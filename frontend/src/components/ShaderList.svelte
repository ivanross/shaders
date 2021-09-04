<script>
  import { shaderListStore } from "../stores";
  import ShaderListItem from "./ShaderListItem.svelte";

  export let src;

  const [data, loading] = shaderListStore;
</script>

<div class="wrapper">
  {#if !$loading}
    {#each $data ?? [] as href}
      <ShaderListItem {href} isActive={href === src} />
    {/each}
  {/if}
</div>

<style>
  .wrapper {
    min-height: 100%;
    width: 100%;
  }
</style>
