<script context="module">
  export function load({ error, status }) {
    return {
      props: { error, status },
    }
  }
</script>

<script>
  import HomeButton from '../components/HomeButton.svelte'
  import Social from '../components/Social.svelte'

  export let status
  export let error

  $: {
    console.groupCollapsed('Error')
    console.log('status', status)
    console.log('error', error)
    console.groupEnd()
  }
</script>

<div class="wrapper">
  <div class="content">
    <strong class="title">{status}</strong>
    <div class="subtitle">{@html error.message}</div>
    <HomeButton />
  </div>

  <div class="footer">
    <Social />
  </div>
</div>

<style>
  .wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
  }

  .content {
    height: 100%;
    flex: 1 1 auto;
    display: flex;
    justify-content: center;
    align-items: start;
    flex-direction: column;
  }
  .footer {
    margin: 1rem;
  }

  .title {
    font-size: 5rem;
  }

  .subtitle {
    font-size: 1.25rem;
    margin-bottom: 2rem;
    color: #777;

    max-width: 80vw;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .subtitle :global(i) {
    color: #ddd;
    text-decoration: line-through;
  }
</style>
