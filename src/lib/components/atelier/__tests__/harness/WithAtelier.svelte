<script lang="ts">
	/** Harnais : fournit une instance d'atelier au panneau, comme le fera le conteneur. */
	import { provideAtelier } from '$lib/atelier/context';
	import type { Atelier } from '$lib/atelier/atelier.svelte';
	import ObjectPanel from '../../ObjectPanel.svelte';

	let { atelier }: { atelier: Atelier } = $props();

	// svelte-ignore state_referenced_locally
	provideAtelier(atelier);
</script>

<ObjectPanel />
