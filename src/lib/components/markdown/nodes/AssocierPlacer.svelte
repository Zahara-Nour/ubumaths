<!--
	AssocierPlacer — associer deux colonnes (```associer) : choisit le geste
	========================================================================

	`geste: relier` (défaut) : des traits d'un point à l'autre — `AssocierRelier.svelte` ;
	`geste: étiquettes` : une étiquette posée sur la place de chaque élément —
	`AssocierEtiquettes.svelte` (chantier `docs/wip/associer-progress.md`, décision 6).
	Mêmes props, mêmes réponses (position affichée de l'étiquette de chaque élément).

	@module components/markdown/nodes/AssocierPlacer
-->
<script lang="ts">
	import type { AssocierNode } from '$lib/ubumark/types/associer';
	import AssocierEtiquettes from './AssocierEtiquettes.svelte';
	import AssocierRelier from './AssocierRelier.svelte';
	import type { BuildCase } from './CollectionConstruire.svelte';

	interface Props {
		node: AssocierNode;
		answers?: BuildCase[];
		expected?: readonly string[];
		showControls?: boolean;
		class?: string;
	}

	let props: Props = $props();
</script>

{#if props.node.gesture === 'etiquettes'}
	<AssocierEtiquettes {...props} />
{:else}
	<AssocierRelier {...props} />
{/if}
