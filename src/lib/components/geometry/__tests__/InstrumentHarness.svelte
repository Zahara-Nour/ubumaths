<script lang="ts">
	// Banc d'essai : un instrument de constructions-v2 dans un <svg> réel
	import Compass from '$lib/constructions-v2/instruments/components/Compass.svelte';
	import Ruler from '$lib/constructions-v2/instruments/components/Ruler.svelte';

	let { instrument }: { instrument: 'compass' | 'ruler' } = $props();
</script>

<svg width="400" height="300" viewBox="0 0 400 300" class="instrument-harness">
	{#if instrument === 'compass'}
		<Compass x={200} y={250} rotation={0} opening={80} scale={1} visible={true} />
	{:else}
		<Ruler x={20} y={100} rotation={0} scale={1} pixelsPerUnit={40} visible={true} />
	{/if}
</svg>
