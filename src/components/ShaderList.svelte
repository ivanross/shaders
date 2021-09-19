<script>
  import ShaderListItem from './ShaderListItem.svelte'
  import data from '../shaders-list'

  export let src
</script>

<div class="wrapper">
  {#each data as href}
    <ShaderListItem {href} isActive={href === src} />
  {/each}
</div>

<style>
  .wrapper {
    background-color: var(--list-bg-color);
    min-height: 100%;
    width: 100%;
  }
</style>
