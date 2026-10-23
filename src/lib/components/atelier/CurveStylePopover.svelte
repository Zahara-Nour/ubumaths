<script lang="ts">
	/**
	 * Le point de couleur d'une carte de fonction ou de suite, et ce qu'il
	 * ouvre : couleur, épaisseur et style du trait (lots 3 et 4a de
	 * `docs/archive/wip/atelier-refonte-interface-phase0.md`).
	 *
	 * Le contenu est celui de « Sur le graphique » (`CurveSettings`) ; seule la
	 * présentation change : trois groupes de boutons dans UNE petite fenêtre,
	 * au lieu de trois fenêtres. Comme là-bas, tout s'écrit dans l'ATELIER
	 * (`setDisplay`, `setSequenceDisplay`), jamais dans le grapheur.
	 *
	 * Une courbe jamais tracée n'a pas encore de couleur : la fenêtre propose
	 * de la tracer, plutôt que des réglages qui ne se verraient nulle part.
	 */
	import * as Popover from '$lib/components/ui/popover';
	import type { FunctionObject, SequenceObject } from '$lib/atelier/types';
	import { displayName } from '$lib/atelier/names';
	import { curveColorValue } from '$lib/grapheur/colors';
	import CurveStyleSettings from './CurveStyleSettings.svelte';

	interface Props {
		object: FunctionObject | SequenceObject;
	}

	let { object }: Props = $props();

	let open = $state(false);

	const name = $derived(displayName(object.name));
	const display = $derived(object.display);
	/** Pleine quand la courbe est tracée, vide sinon (C2) : la forme, pas que la couleur. */
	const filled = $derived(object.plotted === true && display !== undefined);
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		{#snippet child({ props })}
			<button
				{...props}
				type="button"
				class="point"
				class:plein={filled}
				style:--peinte={filled && display ? curveColorValue(display.color) : undefined}
				aria-label={`Couleur et trait de ${name}`}
				title="Couleur et trait"
			></button>
		{/snippet}
	</Popover.Trigger>

	<Popover.Content class="w-auto p-3" align="start">
		<CurveStyleSettings {object} />
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
	/* Le point lui-même : cercle VIDE tant que la fonction n'est pas tracée (C2) */
	.point::after {
		content: '';
		position: absolute;
		inset: 0.4375rem;
		border-radius: 9999px;
		border: 1.5px solid var(--color-muted-foreground);
	}
	/* La couleur sur le seul point : peinte sur le bouton, elle remplissait toute la cible */
	.point.plein::after {
		border-color: var(--peinte);
		background: var(--peinte);
	}
	.point:focus-visible {
		outline: 2px solid var(--color-ring, currentColor);
		outline-offset: 1px;
	}
	.point:hover {
		background-color: var(--color-muted);
	}
	.point.plein:hover {
		background-color: transparent;
	}
	.point.plein:hover::after {
		filter: brightness(0.95);
	}
</style>
