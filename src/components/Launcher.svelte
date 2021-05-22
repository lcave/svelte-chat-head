<script>
	import { createEventDispatcher } from 'svelte';

  export let showMain;
	const dispatch = createEventDispatcher();

  function handleClick() {
		dispatch('toggleMain');
  }
</script>

<button class="launcher animated-gradient {showMain}" on:click={handleClick}>
  S
</button>

<style>
  .launcher {
  z-index: 1090;
  position: absolute;
  width: 3rem;
  height: 3rem;
  border: none;
  border-radius: 50%;
}
</style>