<script>
  import { link } from "svelte-navigator";

  export let status;
  export let error;

  $: {
    console.groupCollapsed("Error");
    console.log("status", status);
    console.log("error", error);
    console.groupEnd();
  }
</script>

<div class="wrapper">
  <div>
    <strong class="title">{status}</strong>
    <div class="subtitle">{@html error}</div>

    <a href="/" use:link>&#8592; Home</a>
  </div>
</div>

<style>
  .wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .title {
    font-size: 5rem;
  }

  .subtitle {
    font-size: 1.25rem;
    margin-bottom: 2rem;
    color: #555;

    max-width: 80vw;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .subtitle :global(i) {
    color: #bbb;
    text-decoration: line-through;
  }
</style>
