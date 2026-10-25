<script lang="ts">
	/**
	 * Harnais : fournit une instance d'atelier au panneau, comme le fait le
	 * conteneur — et un grapheur, que les cartes de fonction et de courbe lisent
	 * (`useGrapheurStore`).
	 */
	import { provideAtelier } from '$lib/atelier/context';
	import type { Atelier } from '$lib/atelier/atelier.svelte';
	import { provideGrapheurStore } from '$lib/stores/grapheur-context';
	import { GrapheurStore } from '$lib/stores/grapheur.svelte';
	import ObjectPanel from '../../ObjectPanel.svelte';

	let { atelier, graph = new GrapheurStore() }: { atelier: Atelier; graph?: GrapheurStore } =
		$props();

	// svelte-ignore state_referenced_locally
	provideAtelier(atelier);
	// svelte-ignore state_referenced_locally
	provideGrapheurStore(graph);
</script>

<ObjectPanel />
