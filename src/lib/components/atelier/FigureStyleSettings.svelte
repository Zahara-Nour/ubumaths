<script lang="ts">
	/**
	 * Les réglages d'un point ou d'une courbe de la figure : couleur et taille
	 * d'un point, couleur, épaisseur et style d'une courbe (`setFigureDisplay`).
	 *
	 * Le contenu de la fenêtre du point de couleur (`FigureStylePopover`), repris
	 * tel quel dans le panneau « Propriétés » (`ObjectProperties`, 2026-10-23).
	 * Sans couleur réglée, rien n'est coché : l'objet garde celle de la figure.
	 */
	import { useAtelier } from '$lib/atelier/context';
	import {
		POINT_SIZES,
		isPoint,
		type CurveObject,
		type PointObject,
		type PointSize
	} from '$lib/atelier/types';
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
		<div class="groupe" role="radiogroup" aria-label="Taille du point" {@attach rovingRadioGroup}>
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
		<div class="groupe" role="radiogroup" aria-label="Style du trait" {@attach rovingRadioGroup}>
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

<style>
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
