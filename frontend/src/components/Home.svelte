<script>
  import ShaderSelect from "./ShaderSelect.svelte";
  import TextGradient from "./TextGradient.svelte";
</script>

<main>
  <div class="title-wrapper">
    <div class="title">
      <TextGradient>Shaders</TextGradient>
    </div>
    <div>A collection of shaders</div>
  </div>

  <div class="select">
    <ShaderSelect />
  </div>
</main>

<style>
  main {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .title-wrapper {
    display: block;
    text-align: center;
    min-height: 200px;
  }

  .title {
    font-size: 5rem;
  }

  .select {
    flex: 1 1 auto;
    margin: 2rem 4rem;
    overflow-y: auto;
    border-radius: 10px;
  }

  @media (min-width: 768px) {
    .title-wrapper {
      display: flex;
      flex-direction: column;
    }
    .select {
      margin: 0;
      border-radius: 0;
    }

    main {
      flex-direction: row;
    }
    main > * {
      width: 50%;
      display: flex;
      justify-content: center;
      align-items: center;
    }
  }
</style>
