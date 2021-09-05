<script>
  import GithubIcon from '../svg/GithubIcon.svelte'
  import TwitterIcon from '../svg/TwitterIcon.svelte'
</script>

<div class="social">
  <div>Ivan Rossi</div>
  <a class="icon" href="https://github.com/ivanross" target="__blank">
    <GithubIcon size={20} />
  </a>
  <a class="icon" href="https://twitter.com/IvanRossi95" target="__blank">
    <TwitterIcon size={20} />
  </a>
</div>

<style>
  .social {
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .social * {
    color: #aaa;
  }

  .social a {
    transition: color 0.3s;
  }

  .social a:hover {
    color: var(--text-color);
  }

  @media (hover: none) {
    .social a {
      color: var(--text-color);
    }
  }

  .social > * + * {
    margin-left: 0.5rem;
  }

  .icon {
    display: flex;
    cursor: pointer;
  }
</style>
