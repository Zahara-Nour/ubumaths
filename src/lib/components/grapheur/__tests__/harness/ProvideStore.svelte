<script lang="ts">
	/**
	 * Harnais de test : fournit une instance de grapheur aux composants
	 * descendants, comme le fera l'atelier.
	 */
	import { provideGrapheurStore } from '$lib/stores/grapheur-context';
	import type { GrapheurStore } from '$lib/stores/grapheur.svelte';
	import FunctionPanel from '../../FunctionPanel.svelte';

	let { store }: { store: GrapheurStore } = $props();

	// Même capture volontaire que dans GrapheurContainer : le contexte se fixe à
	// l'initialisation.
	// svelte-ignore state_referenced_locally
	provideGrapheurStore(store);
</script>

<FunctionPanel />
