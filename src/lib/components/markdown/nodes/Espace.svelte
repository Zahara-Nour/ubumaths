<!--
	Espace — blocs d'espace (nœud `espace`)
	=======================================

	Aiguillage par genre : ```cubes → `Cubes.svelte` ; assemblage à geste
	(`dessiner:`, `retrouver:`) hors question (cours, aperçu) → `CubesGeste.svelte`,
	le geste sans jugement ; ```solide → `Solide.svelte`. Le genre `patron`
	viendra ensuite (chantier `solides`, ADR 0034).

	@module components/markdown/nodes/Espace
-->
<script lang="ts">
	import type { EspaceNode } from '$lib/ubumark/types/espace';
	import Cubes from './Cubes.svelte';
	import CubesGeste from './CubesGeste.svelte';
	import Solide from './Solide.svelte';

	interface Props {
		node: EspaceNode;
		/** Forcer l'affichage des erreurs d'auteur ; sinon, contexte du renderer (élève par défaut) */
		showErrors?: boolean;
		class?: string;
	}

	let { node, showErrors, class: className = '' }: Props = $props();
</script>

{#if node.genre === 'solide'}
	<Solide {node} {showErrors} class={className} />
{:else if node.genre === 'cubes' && node.spec?.kind === 'cubes' && node.spec.task && node.errors.length === 0}
	<CubesGeste {node} class={className} />
{:else if node.genre === 'cubes'}
	<Cubes {node} {showErrors} class={className} />
{/if}
