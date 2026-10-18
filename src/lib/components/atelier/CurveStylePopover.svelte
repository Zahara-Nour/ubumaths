<script lang="ts">
	/**
	 * Le point de couleur d'une carte de fonction, et ce qu'il ouvre : couleur,
	 * épaisseur et style du trait (lot 3 de `docs/wip/atelier-refonte-interface-phase0.md`).
	 *
	 * Le contenu est celui de « Sur le graphique » (`CurveSettings`) ; seule la
	 * présentation change : trois groupes de boutons dans UNE petite fenêtre,
	 * au lieu de trois fenêtres. Comme là-bas, tout s'écrit dans l'ATELIER
	 * (`setDisplay`), jamais dans le grapheur.
	 *
	 * Une courbe jamais tracée n'a pas encore de couleur : la fenêtre propose
	 * de la tracer, plutôt que des réglages qui ne se verraient nulle part.
	 */
	import * as Popover from '$lib/components/ui/popover';
	import { useAtelier } from '$lib/atelier/context';
	import type { FunctionObject } from '$lib/atelier/types';
	import { displayName } from '$lib/atelier/names';
	import {
		CURVE_COLORS,
		CURVE_COLOR_LABELS,
		curveColorValue,
		isCurveColor
	} from '$lib/grapheur/colors';
	import {
		LINE_STYLES,
		LINE_STYLE_DASHARRAY,
		LINE_WIDTHS,
		type LineStyle
	} from '$lib/grapheur/types';

	interface Props {
		object: FunctionObject;
	}

	let { object }: Props = $props();

	const atelier = useAtelier();

	let open = $state(false);

	const STYLE_LABELS: Record<LineStyle, string> = {
		solid: 'Continu',
		dashed: 'Tirets',
		dotted: 'Pointillé',
		dashdot: 'Tiret-point'
	};

	const name = $derived(displayName(object.name));
	const display = $derived(object.display);
	/** Pleine quand la courbe est tracée, vide sinon (C2) : la forme, pas que la couleur. */
	const filled = $derived(object.plotted === true && display !== undefined);

	function dasharrayOf(style: LineStyle): string | undefined {
		const value = LINE_STYLE_DASHARRAY[style];
		return value === 'none' ? undefined : value;
	}

	function plotNow() {
		atelier.setPlotted(object.name, true);
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		{#snippet child({ props })}
			<button
				{...props}
				type="button"
				class="point"
				class:plein={filled}
				style={filled && display
					? `background: ${curveColorValue(display.color)}; border-color: ${curveColorValue(display.color)}`
					: undefined}
				aria-label={`Couleur et trait de ${name}`}
				title="Couleur et trait"
			></button>
		{/snippet}
	</Popover.Trigger>

	<Popover.Content class="w-auto p-3" align="start">
		{#if display === undefined}
			<div class="vide">
				<p>{name} n’est pas encore tracée : sa couleur se choisit une fois la courbe tracée.</p>
				<button type="button" class="tracer" onclick={plotNow}>Tracer {name}</button>
			</div>
		{:else}
			<div class="reglages">
				<div class="groupe" role="radiogroup" aria-label="Couleur de la courbe">
					{#each CURVE_COLORS as color (color)}
						<button
							type="button"
							role="radio"
							class="pastille"
							aria-checked={display.color === color}
							aria-label={CURVE_COLOR_LABELS[color]}
							title={CURVE_COLOR_LABELS[color]}
							style:background-color={curveColorValue(color)}
							onclick={() => {
								if (isCurveColor(color)) atelier.setDisplay(object.name, { color });
							}}
						></button>
					{/each}
				</div>
				<div class="groupe" role="radiogroup" aria-label="Épaisseur du trait">
					{#each LINE_WIDTHS as width (width)}
						<button
							type="button"
							role="radio"
							class="option"
							aria-checked={display.lineWidth === width}
							aria-label={`Épaisseur ${width} px`}
							title={`${width} px`}
							onclick={() => atelier.setDisplay(object.name, { lineWidth: width })}
						>
							<svg width="32" height="16" viewBox="0 0 32 16" aria-hidden="true">
								<line
									x1="3"
									y1="8"
									x2="29"
									y2="8"
									stroke="currentColor"
									stroke-width={width}
									stroke-linecap="round"
								/>
							</svg>
						</button>
					{/each}
				</div>
				<div class="groupe" role="radiogroup" aria-label="Style du trait">
					{#each LINE_STYLES as style (style)}
						<button
							type="button"
							role="radio"
							class="option"
							aria-checked={display.lineStyle === style}
							aria-label={STYLE_LABELS[style]}
							title={STYLE_LABELS[style]}
							onclick={() => atelier.setDisplay(object.name, { lineStyle: style })}
						>
							<svg width="32" height="16" viewBox="0 0 32 16" aria-hidden="true">
								<line
									x1="3"
									y1="8"
									x2="29"
									y2="8"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-dasharray={dasharrayOf(style)}
								/>
							</svg>
						</button>
					{/each}
				</div>
			</div>
		{/if}
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
		background: inherit;
	}
	.point.plein::after {
		border-color: inherit;
	}
	.point:focus-visible {
		outline: 2px solid var(--color-ring, currentColor);
		outline-offset: 1px;
	}
	.point:hover {
		background-color: var(--color-muted);
	}
	.point.plein:hover {
		filter: brightness(0.95);
	}
	.reglages {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.groupe {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}
	.pastille {
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 0.25rem;
		border: 2px solid transparent;
		cursor: pointer;
	}
	.option {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 2.5rem;
		min-height: 1.75rem;
		border: 2px solid transparent;
		border-radius: 0.25rem;
		background: none;
		color: var(--color-foreground);
		cursor: pointer;
	}
	.option:hover {
		background: var(--color-muted);
	}
	.pastille[aria-checked='true'],
	.option[aria-checked='true'] {
		border-color: var(--color-foreground);
	}
	.pastille:focus-visible,
	.option:focus-visible,
	.tracer:focus-visible {
		outline: 2px solid var(--color-ring, currentColor);
		outline-offset: 2px;
	}
	.vide {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-width: 16rem;
		font-size: 0.8125rem;
	}
	.vide p {
		margin: 0;
	}
	.tracer {
		align-self: flex-start;
		min-height: 1.75rem;
		padding: 0 0.625rem;
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		background: var(--color-background);
		font: inherit;
		cursor: pointer;
	}
</style>
