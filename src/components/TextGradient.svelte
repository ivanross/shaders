<div>
  <slot />
</div>

<style>
  div {
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
    -webkit-text-fill-color: transparent;

    background-image: linear-gradient(47deg, #00ffbd, #00dbff);
    background-size: 400% 400%;

    -webkit-animation: gradient-rotation 3s ease infinite;
    animation: gradient-rotation 3s ease infinite;
  }

  @-webkit-keyframes gradient-rotation {
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }
  @keyframes gradient-rotation {
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }
</style>
