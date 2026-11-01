<!--
	MonnaieObjets — les coupures d'une scène de monnaie, dans un <svg>
	==================================================================

	Partagé par `Monnaie.svelte` (pièces et billets à lire) et
	`MonnaieConstruire.svelte` (plan de travail, réserve, correction) : un seul
	dessin des pièces et des billets.

	- Rendu stylisé (décision 1) : une seule couleur d'accent (pièces pleines,
	  billets en teinte claire), traits et valeurs dans une teinte foncée de
	  l'accent. Couleurs du thème uniquement. Pièces de centimes : cuivre (1, 2,
	  5 c) et doré (10, 20, 50 c), teintes claires des couleurs de figure
	  (chantier `docs/wip/monnaie-centimes-progress.md`, décision 1).
	- `isMarked` : coupure barrée (marquage au doigt de `Monnaie.svelte`).

	@module components/markdown/nodes/MonnaieObjets
-->
<svelte:options namespace="svg" />

<script lang="ts">
	import { MONNAIE_LABEL, type MonnaieItem } from '$lib/ubumark/utils/monnaie-scene';
	import { coinFamily, denominationLabel } from '$lib/ubumark/utils/monnaie-valeurs';

	interface Props {
		items: MonnaieItem[];
		/** Coupure barrée (marquage au doigt) */
		isMarked?: (index: number) => boolean;
	}

	let { items, isMarked = () => false }: Props = $props();

	const NOTE = MONNAIE_LABEL.note;

	/** Trait de la marque : en travers de la coupure, du bas à gauche au haut à droite */
	function strike(item: MonnaieItem) {
		const inset = item.kind === 'piece' ? 1 : 3;
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
	<g
		class="monnaie-objet monnaie-{item.kind}"
		class:monnaie-objet-marque={marked}
		aria-hidden="true"
	>
		{#if item.kind === 'billet'}
			<rect
				class="monnaie-billet-fond"
				x={item.x}
				y={item.y}
				width={item.width}
				height={item.height}
				rx={NOTE.radius}
			/>
			<text class="monnaie-valeur" x={item.cx} y={item.cy} font-size={NOTE.size}
				>{denominationLabel(item.value)}</text
			>
			<text
				class="monnaie-valeur"
				x={item.x + NOTE.cornerInset + NOTE.cornerBox / 2}
				y={item.y + 1 + NOTE.cornerBox / 2}
				font-size={NOTE.cornerSize}>{item.value}</text
			>
			<text
				class="monnaie-valeur"
				x={item.x + item.width - NOTE.cornerInset - NOTE.cornerBox / 2}
				y={item.y + item.height - 1 - NOTE.cornerBox / 2}
				font-size={NOTE.cornerSize}>{item.value}</text
			>
		{:else}
			<circle
				class={item.value === 2
					? 'monnaie-anneau'
					: `monnaie-piece-fond monnaie-piece-${coinFamily(item.value)}`}
				cx={item.cx}
				cy={item.cy}
				r={item.width / 2}
			/>
			{#if item.value === 2}
				<circle
					class="monnaie-piece-fond"
					cx={item.cx}
					cy={item.cy}
					r={(item.width / 2) * MONNAIE_LABEL.coin.innerRatio}
				/>
			{/if}
			<text class="monnaie-valeur" x={item.cx} y={item.cy} font-size={MONNAIE_LABEL.coin.size}
				>{denominationLabel(item.value)}</text
			>
		{/if}
	</g>
	{#if marked}
		<line class="monnaie-marque" {...strike(item)} />
	{/if}
{/each}

<style>
	/*
	 * La seule couleur d'accent : pièces pleines, billets en teinte claire ;
	 * traits et valeurs dans une teinte foncée de la même couleur, lisible en
	 * clair comme en sombre (leçon du thème sombre de la collection)
	 */
	.monnaie-piece-fond {
		fill: var(--color-primary);
		stroke: color-mix(in oklab, var(--color-primary) 45%, black);
		stroke-width: 0.8;
	}

	/* Centimes : teintes claires, la valeur foncée reste lisible dessus */
	.monnaie-piece-cuivre {
		fill: color-mix(in oklab, var(--color-fig-marron) 55%, white);
		stroke: color-mix(in oklab, var(--color-fig-marron) 60%, black);
	}

	.monnaie-piece-dore {
		fill: color-mix(in oklab, var(--color-fig-jaune) 60%, white);
		stroke: color-mix(in oklab, var(--color-fig-jaune) 45%, black);
	}

	.monnaie-anneau {
		fill: color-mix(in oklab, var(--color-primary) 65%, black);
		stroke: color-mix(in oklab, var(--color-primary) 45%, black);
		stroke-width: 0.8;
	}

	.monnaie-billet-fond {
		fill: color-mix(in oklab, var(--color-primary) 35%, white);
		stroke: color-mix(in oklab, var(--color-primary) 45%, black);
		stroke-width: 0.8;
	}

	.monnaie-valeur {
		fill: color-mix(in oklab, var(--color-primary) 25%, black);
		font-weight: 700;
		text-anchor: middle;
		dominant-baseline: central;
		pointer-events: none;
		user-select: none;
	}

	.monnaie-objet-marque {
		opacity: 0.35;
	}

	.monnaie-marque {
		stroke: var(--color-foreground);
		stroke-width: 2.5;
		stroke-linecap: round;
		pointer-events: none;
	}
</style>
