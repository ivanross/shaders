<script>
  import ShaderList from "../components/ShaderList.svelte";
  import TextGradient from "../components/TextGradient.svelte";
</script>

<main>
  <div class="title-wrapper">
    <div class="title">
      <TextGradient>SHADERS</TextGradient>
    </div>
    <div>
      A collection of shaders, experiments, tries and
      <span class="error">erorrs</span>.
    </div>
  </div>

  <div class="select">
    <div>
      <ShaderList />
    </div>
  </div>
</main>

<style>
  .error {
    text-decoration: #ff555d wavy underline;
  }

  main {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .title-wrapper {
    text-align: center;
    min-height: 200px;
    padding: 0 2rem;

    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }

  .title {
    font-size: 3rem;
    font-weight: bold;
  }

  .select {
    flex: 1 1 auto;
    margin: 2rem 1rem;
    border-radius: 10px;
    overflow: hidden;
    border-color: var(--separator-color);
    border-style: solid;
    border-width: 1px;
    min-height: 200px;
  }

  .select > div {
    width: 100%;
    height: 100%;
    overflow-y: auto;
  }

  @media (min-width: 768px) {
    main {
      flex-direction: row;
    }

    .title-wrapper {
      width: 100%;
      flex: 1 1 auto;
    }
    .select {
      flex-shrink: 0;
      width: 350px;
      margin: 0;
      border-radius: 0;
      border-width: 0 0 0 1px;
    }
  }
</style>
