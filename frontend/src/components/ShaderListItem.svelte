<script>
  import { link } from 'svelte-navigator'

  export let href
  export let isActive = false

  const splitted = href.split('/')
  const prefix = splitted.slice(0, splitted.length - 1).join('/')
  const filename = splitted[splitted.length - 1]
</script>

<a href={`/${href}`} use:link>
  <div class:isActive>
    {#if prefix}<span class="prefix">{prefix}/</span>{/if}<span>{filename}</span>

    {#if isActive}<span>&#8592;</span>{/if}
  </div>
</a>

<style>
  a > div {
    padding: 0.5rem 1rem;
  }

  div:not(.isActive) {
    color: var(--text-color);
  }
  .prefix {
    opacity: 0.6;
  }
</style>
