<script lang="ts">
	/**
	 * Le point de couleur d'une carte de point ou de courbe de la figure, et ce
	 * qu'il ouvre (lot 4b de `docs/archive/wip/atelier-refonte-interface-phase0.md`) :
	 * couleur et taille pour un point, couleur et trait pour une courbe.
	 *
	 * La présentation de `CurveStylePopover` (fonctions, suites). Tout s'écrit
	 * dans l'ATELIER (`setFigureDisplay`) ; la vue Géométrie le lit de là. Sans
	 * couleur réglée, l'objet garde la couleur par défaut de la figure : le point
	 * de couleur la montre (`figureDefaultColor`, celle qui est peinte), et rien
	 * n'est coché dans les couleurs.
	 */
	import * as Popover from '$lib/components/ui/popover';
	import { isPoint, type CurveObject, type PointObject } from '$lib/atelier/types';
	import { displayName } from '$lib/atelier/names';
	import { figureDefaultColor } from '$lib/atelier/figure-sync';
	import { curveColorValue } from '$lib/grapheur/colors';
	import FigureStyleSettings from './FigureStyleSettings.svelte';

	interface Props {
		object: PointObject | CurveObject;
	}

	let { object }: Props = $props();

	const name = $derived(displayName(object.name));
	const point = $derived(isPoint(object));
	/** Ce que la figure peint : la couleur réglée, sinon celle de la figure. */
	const painted = $derived(
		object.display?.color === undefined
			? figureDefaultColor()
			: curveColorValue(object.display.color)
	);
</script>

<Popover.Root>
	<Popover.Trigger>
		{#snippet child({ props })}
			<button
				{...props}
				type="button"
				class="point"
				style:--peinte={painted}
				aria-label={point ? `Couleur et taille de ${name}` : `Couleur et trait de ${name}`}
				title={point ? 'Couleur et taille' : 'Couleur et trait'}
			></button>
		{/snippet}
	</Popover.Trigger>

	<Popover.Content class="w-auto p-3" align="start">
		<FigureStyleSettings {object} />
	</Popover.Content>
</Popover.Root>

<style>
	.point {
		flex-shrink: 0;
		/* Cible d'au moins 24 px (WCAG 2.5.8) autour d'un point de 10 px */
		width: 1.5rem;
		height: 1.5rem;
		padding: 0;
		border: none;
		border-radius: 9999px;
		background: transparent;
		cursor: pointer;
		position: relative;
	}
	/* Le point lui-même : de la couleur peinte dans la figure, réglée ou non */
	.point::after {
		content: '';
		position: absolute;
		inset: 0.4375rem;
		border-radius: 9999px;
		/* La couleur sur le seul point : peinte sur le bouton, elle remplissait toute la cible */
		border: 1.5px solid var(--peinte);
		background: var(--peinte);
	}
	.point:focus-visible {
		outline: 2px solid var(--color-ring, currentColor);
		outline-offset: 1px;
	}
	.point:hover::after {
		filter: brightness(0.95);
	}
</style>
