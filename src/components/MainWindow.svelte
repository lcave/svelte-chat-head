<svelte:options accessors />

<script>
  export let showMain;
  export let windowClasses;
</script>

<div id="swf-main-window" class={windowClasses.join(" ") + " " + showMain}>
  <div class="inner {showMain}">
    <div class="content">Some content or something idk</div>
  </div>
</div>

<style>
  .main {
    position: absolute;
    border-bottom-right-radius: 2rem;
    display: flex;
    align-items: flex-end;
    justify-content: flex-end;
    padding: 5px;
    overflow: hidden;
    background-color: white;
    transition: width 0.3s, height 0.3s, border-radius 0.5s;
  }

  .inner {
    border-radius: 15px;
    background-color: white;
    transition: width 0.3s, height 0.3s, border-radius 0.5s;
  }

  .main.left.top,
  .main.left.top .inner {
    border-bottom-right-radius: 0px;
  }
  .main.left.bottom,
  .main.left.bottom .inner {
    border-top-right-radius: 0px;
  }
  .main.right.top,
  .main.right.top .inner {
    border-bottom-left-radius: 0px;
  }
  .main.right.bottom,
  .main.right.bottom .inner {
    border-top-left-radius: 0px;
  }

  .main.top {
    bottom: 10px;
  }
  .main.bottom {
    top: 10px;
  }
  .main.left {
    right: 10px;
  }
  .main.right {
    left: 10px;
  }

  .inner.false {
    border-radius: 50% 50% 50% 50%;
    width: 0px;
    height: 0px;
  }
  .inner.true {
    border-radius: 15px;
    width: 100%;
    height: 100%;
  }

  .content {
    padding: 15px;
  }

  .main.true {
    border-radius: 20px 20px 20px 20px;
    height: 400px;
    width: 82vw;
  }

  @media (min-width: 476px) {
    .main.true {
      height: 400px;
      width: 400px;
    }
  }

  .main.false {
    border-radius: 50%;
    height: 0 !important;
    width: 0 !important;
  }
</style>
