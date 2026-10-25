<!--
	Fiche d'un bloc ubumark (`/aide-ecriture/blocs/<bloc>`, professeur seul).
-->
<script lang="ts">
	import BlockHelpPage from '$lib/components/block-catalog/BlockHelpPage.svelte';
	import { findBlockEntry } from '$lib/block-catalog';

	let { data } = $props();

	const entry = $derived(findBlockEntry(data.slug));
</script>

{#if entry}
	<!-- Recréée à chaque bloc : la zone « Essayer » repart de son exemple -->
	{#key entry.slug}
		<BlockHelpPage {entry} />
	{/key}
{/if}
