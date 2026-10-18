<script lang="ts">
	/** Harnais : la vue Figure seule, dans une boîte de la largeur demandée (téléphone). */
	import { provideAtelier } from '$lib/atelier/context';
	import type { Atelier } from '$lib/atelier/atelier.svelte';
	import FigureView from '../../FigureView.svelte';

	let {
		atelier,
		width = 360,
		height = 520
	}: { atelier: Atelier; width?: number; height?: number } = $props();

	// svelte-ignore state_referenced_locally
	provideAtelier(atelier);
</script>

<div class="boite" style:width="{width}px" style:height="{height}px">
	<FigureView />
</div>

<style>
	.boite {
		display: flex;
		flex-direction: column;
	}
</style>
