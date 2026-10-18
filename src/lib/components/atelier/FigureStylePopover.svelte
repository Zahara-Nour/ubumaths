<script lang="ts">
	/**
	 * Le point de couleur d'une carte de point ou de courbe de la figure, et ce
	 * qu'il ouvre (lot 4b de `docs/wip/atelier-refonte-interface-phase0.md`) :
	 * couleur et taille pour un point, couleur et trait pour une courbe.
	 *
	 * La présentation de `CurveStylePopover` (fonctions, suites). Tout s'écrit
	 * dans l'ATELIER (`setFigureDisplay`) ; la vue Géométrie le lit de là. Sans
	 * réglage, l'objet garde le dessin par défaut de la figure : le point de
	 * couleur reste vide, et rien n'est coché dans les couleurs.
	 */
	import * as Popover from '$lib/components/ui/popover';
	import { useAtelier } from '$lib/atelier/context';
	import {
		POINT_SIZES,
		isPoint,
		type CurveObject,
		type PointObject,
		type PointSize
	} from '$lib/atelier/types';
	import { displayName } from '$lib/atelier/names';
	import { CURVE_COLORS, CURVE_COLOR_LABELS, curveColorValue } from '$lib/grapheur/colors';
	import {
		LINE_STYLES,
		LINE_STYLE_DASHARRAY,
		LINE_WIDTHS,
		type LineStyle
	} from '$lib/grapheur/types';
	import { rovingRadioGroup } from './roving-radio-group';

	interface Props {
		object: PointObject | CurveObject;
	}

	let { object }: Props = $props();

	const atelier = useAtelier();

	const STYLE_LABELS: Record<LineStyle, string> = {
		solid: 'Continu',
		dashed: 'Tirets',
		dotted: 'Pointillé',
		dashdot: 'Tiret-point'
	};

	const SIZE_LABELS: Record<PointSize, string> = {
		small: 'Petite',
		medium: 'Moyenne',
		large: 'Grande'
	};

	/** Le rayon du disque qui montre chaque taille dans la fenêtre. */
	const SIZE_RADIUS: Record<PointSize, number> = { small: 2.5, medium: 4, large: 5.5 };

	/** Le trait d'une courbe pas encore réglée : celui d'une courbe neuve. */
	const DEFAULT_STROKE = { lineWidth: 2, lineStyle: 'solid' as LineStyle };

	const name = $derived(displayName(object.name));
	const point = $derived(isPoint(object));
	const color = $derived(object.display?.color);
	const size = $derived(isPoint(object) ? (object.display?.size ?? 'medium') : null);
	const stroke = $derived(
		!isPoint(object) && object.display
			? { lineWidth: object.display.lineWidth, lineStyle: object.display.lineStyle }
			: DEFAULT_STROKE
	);

	function dasharrayOf(style: LineStyle): string | undefined {
		const value = LINE_STYLE_DASHARRAY[style];
		return value === 'none' ? undefined : value;
	}
</script>

<Popover.Root>
	<Popover.Trigger>
		{#snippet child({ props })}
			<button
				{...props}
				type="button"
				class="point"
				class:plein={color !== undefined}
				style={color !== undefined
					? `background: ${curveColorValue(color)}; border-color: ${curveColorValue(color)}`
					: undefined}
				aria-label={point ? `Couleur et taille de ${name}` : `Couleur et trait de ${name}`}
				title={point ? 'Couleur et taille' : 'Couleur et trait'}
			></button>
		{/snippet}
	</Popover.Trigger>

	<Popover.Content class="w-auto p-3" align="start">
		<div class="reglages">
			<div
				class="groupe"
				role="radiogroup"
				aria-label={point ? 'Couleur du point' : 'Couleur de la courbe'}
				{@attach rovingRadioGroup}
			>
				{#each CURVE_COLORS as option (option)}
					<button
						type="button"
						role="radio"
						class="pastille"
						aria-checked={color === option}
						aria-label={CURVE_COLOR_LABELS[option]}
						title={CURVE_COLOR_LABELS[option]}
						style:background-color={curveColorValue(option)}
						onclick={() => atelier.setFigureDisplay(object.name, { color: option })}
					></button>
				{/each}
			</div>
			{#if size !== null}
				<div
					class="groupe"
					role="radiogroup"
					aria-label="Taille du point"
					{@attach rovingRadioGroup}
				>
					{#each POINT_SIZES as option (option)}
						<button
							type="button"
							role="radio"
							class="option"
							aria-checked={size === option}
							aria-label={SIZE_LABELS[option]}
							title={SIZE_LABELS[option]}
							onclick={() => atelier.setFigureDisplay(object.name, { size: option })}
						>
							<svg width="20" height="16" viewBox="0 0 20 16" aria-hidden="true">
								<circle cx="10" cy="8" r={SIZE_RADIUS[option]} fill="currentColor" />
							</svg>
						</button>
					{/each}
				</div>
			{:else}
				<div
					class="groupe"
					role="radiogroup"
					aria-label="Épaisseur du trait"
					{@attach rovingRadioGroup}
				>
					{#each LINE_WIDTHS as width (width)}
						<button
							type="button"
							role="radio"
							class="option"
							aria-checked={stroke.lineWidth === width}
							aria-label={`Épaisseur ${width} px`}
							title={`${width} px`}
							onclick={() => atelier.setFigureDisplay(object.name, { lineWidth: width })}
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
				<div
					class="groupe"
					role="radiogroup"
					aria-label="Style du trait"
					{@attach rovingRadioGroup}
				>
					{#each LINE_STYLES as style (style)}
						<button
							type="button"
							role="radio"
							class="option"
							aria-checked={stroke.lineStyle === style}
							aria-label={STYLE_LABELS[style]}
							title={STYLE_LABELS[style]}
							onclick={() => atelier.setFigureDisplay(object.name, { lineStyle: style })}
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
			{/if}
		</div>
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
	/* Le point lui-même : cercle VIDE tant que rien n'est réglé (dessin par défaut) */
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
	.option:focus-visible {
		outline: 2px solid var(--color-ring, currentColor);
		outline-offset: 2px;
	}
</style>
