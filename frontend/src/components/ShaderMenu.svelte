<script>
  import CloseIcon from "../svg/CloseIcon.svelte";

  import HamburgerIcon from "../svg/HamburgerIcon.svelte";
  import HomeButton from "./HomeButton.svelte";
  import ShaderList from "./ShaderList.svelte";
  export let src;
  let open = false;
</script>

<div class="hamburger" on:click={() => (open = true)}>
  <HamburgerIcon />
</div>

<div class="menu" class:open>
  <div class="menu-buttons">
    <div>
      <HomeButton />
    </div>
    <div class="close" on:click={() => (open = false)}>
      <CloseIcon />
    </div>
  </div>

  <div class="list">
    <ShaderList {src} />
  </div>
</div>

<style>
  .hamburger,
  .close {
    cursor: pointer;
  }

  .hamburger {
    position: fixed;
    right: 10px;
    top: 10px;

    width: 40px;
    height: 40px;

    display: flex;
    justify-content: center;
    align-items: center;

    z-index: 10;
    background-color: var(--bg-color);

    border-radius: 9999px;
  }

  .menu {
    position: fixed;
    right: 0;
    top: 0;
    height: 100%;
    width: 100%;

    z-index: 20;
    transform: translate(100%, 0);
    transition: transform 0.3s;

    background: var(--bg-color);

    display: flex;
    flex-direction: column;
  }

  .menu.open {
    transform: translate(0, 0);
  }

  .menu-buttons {
    display: flex;
    justify-content: space-between;
    padding: 1rem;
    border-bottom: 1px solid var(--separator-color);
  }

  .list {
    flex: 1 1 auto;
    overflow-y: auto;
  }

  @media (min-width: 768px) {
    .menu {
      width: 350px;
    }
  }
</style>
