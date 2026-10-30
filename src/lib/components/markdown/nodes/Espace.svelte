<!--
	Espace — blocs d'espace (nœud `espace`)
	=======================================

	Aiguillage par genre : ```cubes → `Cubes.svelte`. Les genres `solide` et
	`patron` viendront ensuite (chantier `solides`, ADR 0034).

	@module components/markdown/nodes/Espace
-->
<script lang="ts">
	import type { EspaceNode } from '$lib/ubumark/types/espace';
	import Cubes from './Cubes.svelte';

	interface Props {
		node: EspaceNode;
		/** Forcer l'affichage des erreurs d'auteur ; sinon, contexte du renderer (élève par défaut) */
		showErrors?: boolean;
		class?: string;
	}

	let { node, showErrors, class: className = '' }: Props = $props();
</script>

{#if node.genre === 'cubes'}
	<Cubes {node} {showErrors} class={className} />
{/if}
