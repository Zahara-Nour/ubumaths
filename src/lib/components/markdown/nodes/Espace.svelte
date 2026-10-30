<!--
	Espace — blocs d'espace (nœud `espace`)
	=======================================

	Aiguillage par genre : ```cubes → `Cubes.svelte` ; assemblage à geste
	(`dessiner:`, `retrouver:`) hors question (cours, aperçu) → `CubesGeste.svelte`,
	le geste sans jugement ; ```solide → `Solide.svelte` ; ```patron →
	`Patron.svelte`, ou `PatronGeste.svelte` pour un patron à geste (`designer:`,
	`completer:`) hors question (chantier `solides`, ADR 0034).

	@module components/markdown/nodes/Espace
-->
<script lang="ts">
	import type { EspaceNode } from '$lib/ubumark/types/espace';
	import Cubes from './Cubes.svelte';
	import CubesGeste from './CubesGeste.svelte';
	import PatronGeste from './PatronGeste.svelte';
	import Solide from './Solide.svelte';
	import Patron from './Patron.svelte';

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
{:else if node.genre === 'patron' && node.spec?.kind === 'patron' && node.spec.task && node.errors.length === 0}
	<PatronGeste {node} class={className} />
{:else if node.genre === 'patron'}
	<Patron {node} {showErrors} class={className} />
{:else if node.genre === 'cubes' && node.spec?.kind === 'cubes' && node.spec.task && node.errors.length === 0}
	<CubesGeste {node} class={className} />
{:else if node.genre === 'cubes'}
	<Cubes {node} {showErrors} class={className} />
{/if}
