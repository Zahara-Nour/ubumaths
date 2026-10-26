<!--
	CollectionObjets — les objets d'une scène de collection, dans un <svg>
	======================================================================

	Partagé par `Collection.svelte` (collection à dénombrer) et
	`CollectionConstruire.svelte` (plan de travail, réserve, correction) : un
	seul dessin des jetons, cubes, barres et paquets.

	- Une seule couleur d'accent (le remplissage des objets) ; traits dans une
	  teinte foncée de la même couleur. Couleurs du thème uniquement.
	- `isMarked` : objet barré (marquage au doigt de `Collection.svelte`).

	@module components/markdown/nodes/CollectionObjets
-->
<svelte:options namespace="svg" />

<script lang="ts">
	import { COLLECTION_VIEW, type CollectionItem } from '$lib/ubumark/utils/collection-scene';

	interface Props {
		items: CollectionItem[];
		/** Objet barré (marquage au doigt) */
		isMarked?: (index: number) => boolean;
	}

	let { items, isMarked = () => false }: Props = $props();

	/** Trait de la marque : en travers de l'objet, du bas à gauche au haut à droite */
	function strike(item: CollectionItem) {
		const inset = item.kind === 'jeton' || item.kind === 'cube' ? -2 : 3;
		return {
			x1: item.x + inset,
			y1: item.y + item.height - inset,
			x2: item.x + item.width - inset,
			y2: item.y + inset
		};
	}
</script>

{#each items as item, i (i)}
	{@const marked = isMarked(i)}
	<g class="collection-objet collection-{item.kind}" class:collection-objet-marque={marked}>
		{#if item.kind === 'jeton'}
			<circle class="collection-forme" cx={item.cx} cy={item.cy} r={item.width / 2} />
		{:else if item.kind === 'cube'}
			<rect
				class="collection-forme"
				x={item.x}
				y={item.y}
				width={item.width}
				height={item.height}
			/>
		{:else if item.kind === 'barre'}
			<rect
				class="collection-forme"
				x={item.x}
				y={item.y}
				width={item.width}
				height={item.height}
			/>
			{#each { length: 9 } as _, k (k)}
				<line
					class="collection-separation"
					x1={item.x}
					x2={item.x + item.width}
					y1={item.y + ((k + 1) * item.height) / 10}
					y2={item.y + ((k + 1) * item.height) / 10}
				/>
			{/each}
		{:else}
			<rect
				class="collection-contour"
				x={item.x}
				y={item.y}
				width={item.width}
				height={item.height}
				rx="6"
			/>
			{#each item.jetons ?? [] as jeton, k (k)}
				<circle
					class="collection-forme"
					cx={jeton.cx}
					cy={jeton.cy}
					r={COLLECTION_VIEW.object / 2}
				/>
			{/each}
		{/if}
	</g>
	{#if marked}
		<line class="collection-marque" {...strike(item)} />
	{/if}
{/each}

<style>
	/*
	 * La seule couleur d'accent : le remplissage des objets ; leurs traits dans
	 * une teinte foncée de la même couleur, lisible en clair comme en sombre
	 * (un trait de la couleur du texte, clair en sombre, s'efface sur le jaune)
	 */
	.collection-forme {
		fill: var(--color-primary);
		stroke: color-mix(in oklab, var(--color-primary) 45%, black);
		stroke-width: 0.8;
	}

	.collection-separation {
		stroke: color-mix(in oklab, var(--color-primary) 45%, black);
		stroke-width: 0.6;
	}

	.collection-contour {
		fill: none;
		stroke: var(--color-foreground);
		stroke-width: 1.2;
	}

	.collection-objet-marque {
		opacity: 0.35;
	}

	.collection-marque {
		stroke: var(--color-foreground);
		stroke-width: 2.5;
		stroke-linecap: round;
		pointer-events: none;
	}
</style>
