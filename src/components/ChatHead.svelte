<script>
  import Launcher from "./Launcher.svelte";
  import MainWindow from "./MainWindow.svelte";

  let showMain = false;

  function toggleMain() {
    showMain = !showMain;
  }

  export let right = 20;
  export let bottom = 20;

  let moving = false;

  function onMouseDown() {
    moving = true;
  }

  function onMouseMove(e) {
    if (moving) {
      right -= e.movementX;
      bottom -= e.movementY;
    }
  }

  function onMouseUp() {
    moving = false;
    alignWindow();
  }


  let height = 400;
  let width = 400;

  let positionAbove = true
  let positionToLeft = true

  let main;
  let windowClasses = ["main", "animated-gradient", "top", "left"];

  function alignWindow(){
    windowClasses = ["main", "animated-gradient"]
    if (main.getBoundingClientRect().left +24 < width) {
      windowClasses.push("right")
    } else {
      windowClasses.push("left")
    }
    if (main.getBoundingClientRect().top +24 < height) {
      windowClasses.push("bottom")
    } else {
      windowClasses.push("top")
    }
    console.log("above?", positionAbove)
    console.log("left?", positionToLeft)
  };
</script>

<div
  class="draggable"
  on:mousedown={onMouseDown}
  style="right: {right}px; bottom: {bottom}px;"
  bind:this={main}
>
  <Launcher {showMain} on:toggleMain={toggleMain} />
  <MainWindow {showMain} bind:windowClasses/>
</div>
<svelte:window on:mouseup={onMouseUp} on:mousemove={onMouseMove} />

<style>
  .draggable {
    z-index: 1080;
    position: absolute;
    width: 3rem;
    height: 3rem;
    border: none;
    border-radius: 50%;
  }
</style>
