<!--
	CollectionObjets — les objets d'une scène de collection, dans un <svg>
	======================================================================

	Partagé par `Collection.svelte` (collection à dénombrer) et
	`CollectionConstruire.svelte` (plan de travail, réserve, correction) : un
	seul dessin des jetons, cubes, barres, paquets, plaques de cent et gros
	cubes de mille (faces et quadrillage calculés par la scène).

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
		// Gros cube : de la face de devant au coin arrière du dessus
		if (item.kind === 'gros-cube' && item.faces) {
			const [front, top] = item.faces;
			return {
				x1: front[3].x + inset,
				y1: front[3].y - inset,
				x2: top[2].x - inset,
				y2: top[2].y + inset
			};
		}
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
		{:else if item.kind === 'plaque' || item.kind === 'gros-cube'}
			{#if item.kind === 'plaque'}
				<rect
					class="collection-forme"
					x={item.x}
					y={item.y}
					width={item.width}
					height={item.height}
				/>
			{/if}
			{#each item.faces ?? [] as face, k (k)}
				<polygon
					class="collection-forme collection-face-{k}"
					points={face.map((p) => `${p.x},${p.y}`).join(' ')}
				/>
			{/each}
			{#each item.lines ?? [] as l, k (k)}
				<line class="collection-quadrillage" x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
			{/each}
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

	/* Gros cube : le dessus plus clair, le côté plus sombre (relief) */
	.collection-face-1 {
		fill: color-mix(in oklab, var(--color-primary) 70%, white);
	}

	.collection-face-2 {
		fill: color-mix(in oklab, var(--color-primary) 75%, black);
	}

	.collection-quadrillage {
		stroke: color-mix(in oklab, var(--color-primary) 45%, black);
		stroke-width: 0.3;
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
