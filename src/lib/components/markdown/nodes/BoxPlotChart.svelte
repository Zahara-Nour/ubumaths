<!--
	BoxPlotChart — bloc ```boite-a-moustaches
	==========================================

	Boîtes à moustaches HORIZONTALES empilées, dessinées depuis la scène pure
	`buildStatChartScene` (la même que le PDF Typst) : nom au-dessus à gauche,
	boîte de Q1 à Q3, médiane plus épaisse, moustaches terminées par un petit
	trait, un seul axe gradué en bas avec un trait léger à chaque graduation.
	Une seule couleur d'accent pour toutes les boîtes (sobriété), en tokens
	`var(--color-*)` (clair / sombre).

	Accessibilité : `role="img"`, `<title>` (le genre) et `<desc>` (les cinq
	valeurs de chaque boîte). Rendu par `StatChart.svelte`, qui garde le titre,
	les erreurs et le budget.

	@module components/markdown/nodes/BoxPlotChart
-->
<script lang="ts">
	import { COURBE_COLORS } from '$lib/ubumark/types/courbe';
	import { namedColorScreen, namedColorTable } from '$lib/theme/named-colors';
	import { SCATTER_LABEL_CHAR_PX, type BoxPlotScene } from '$lib/ubumark/utils/stat-chart-scene';

	interface Props {
		scene: BoxPlotScene;
		/** Identifiants du `<title>` et du `<desc>`, posés par `StatChart.svelte` */
		titleId: string;
		descId: string;
	}

	let { scene, titleId, descId }: Props = $props();

	/** Couleur des boîtes : palette commune des figures (app.css), claire ou sombre */
	const COLOR_VAR = namedColorTable(COURBE_COLORS, namedColorScreen);

	/** Marges : une demi-étiquette de graduation déborde de chaque côté */
	const PAD_MIN = 12;
	const PAD_TOP = 4;
	/** Sous l'axe : les étiquettes des graduations, puis le titre de l'axe */
	const TICK_LABELS_PX = 26;
	const AXIS_TITLE_PX = 18;

	let width = $derived(scene.pixelSize.width);
	let height = $derived(scene.pixelSize.height);
	let padLeft = $derived(
		Math.max(PAD_MIN, ((scene.xTicks[0]?.label.length ?? 0) * SCATTER_LABEL_CHAR_PX) / 2 + 4)
	);
	let padRight = $derived(
		Math.max(PAD_MIN, ((scene.xTicks.at(-1)?.label.length ?? 0) * SCATTER_LABEL_CHAR_PX) / 2 + 4)
	);
	let axisY = $derived(PAD_TOP + height);
	let totalHeight = $derived(axisY + TICK_LABELS_PX + (scene.axisTitle ? AXIS_TITLE_PX : 0));
	let color = $derived(COLOR_VAR[scene.color]);

	/** Abscisse d'écran d'une valeur */
	function sx(value: number): number {
		return padLeft + ((value - scene.xMin) / (scene.xMax - scene.xMin || 1)) * width;
	}
</script>

<svg
	role="img"
	aria-labelledby={titleId}
	aria-describedby={descId}
	viewBox="0 0 {padLeft + width + padRight} {totalHeight}"
	style:max-width="{padLeft + width + padRight}px"
	class="stat-svg stat-boites"
>
	<title id={titleId}>{scene.accessibleTitle}</title>
	<desc id={descId}>{scene.description}</desc>

	<!-- Quadrillage : un trait vertical léger à chaque graduation -->
	<g aria-hidden="true">
		{#each scene.xTicks as tick, i (i)}
			<line class="stat-grille" x1={sx(tick.value)} y1={PAD_TOP} x2={sx(tick.value)} y2={axisY} />
		{/each}
	</g>

	{#each scene.boxes as box, i (i)}
		{@const band = scene.bands[i]}
		{@const top = PAD_TOP + band.top}
		{@const bottom = PAD_TOP + band.bottom}
		{@const middle = (top + bottom) / 2}
		{@const cap = (bottom - top) / 4}
		{@const min = box.values[0]}
		{@const q1 = box.values[1]}
		{@const median = box.values[2]}
		{@const q3 = box.values[3]}
		{@const max = box.values[4]}
		<g aria-hidden="true" style:stroke={color}>
			{#if box.name !== null && band.nameY !== null}
				<text class="stat-nom-boite" x={padLeft} y={PAD_TOP + band.nameY}>{box.name}</text>
			{/if}
			<line class="stat-moustache" x1={sx(min)} y1={middle} x2={sx(q1)} y2={middle} />
			<line class="stat-moustache" x1={sx(q3)} y1={middle} x2={sx(max)} y2={middle} />
			<line
				class="stat-moustache-bout"
				x1={sx(min)}
				y1={top + cap}
				x2={sx(min)}
				y2={bottom - cap}
			/>
			<line
				class="stat-moustache-bout"
				x1={sx(max)}
				y1={top + cap}
				x2={sx(max)}
				y2={bottom - cap}
			/>
			<rect
				class="stat-boite"
				x={sx(q1)}
				y={top}
				width={sx(q3) - sx(q1)}
				height={bottom - top}
				style:fill="color-mix(in oklab, {color} 22%, var(--color-background))"
			/>
			<line class="stat-mediane" x1={sx(median)} y1={top} x2={sx(median)} y2={bottom} />
			{#if scene.showValues}
				{#each box.values as value, j (j)}
					<text
						class="stat-valeur"
						x={sx(value)}
						y={PAD_TOP + band.valueY[box.valueRows[j]]}
						text-anchor="middle">{box.labels[j]}</text
					>
				{/each}
			{/if}
		</g>
	{/each}

	<!-- Axe gradué, en bas -->
	<g class="stat-axes" aria-hidden="true">
		<line x1={padLeft} y1={axisY} x2={padLeft + width} y2={axisY} />
		{#each scene.xTicks as tick, i (i)}
			<line x1={sx(tick.value)} y1={axisY} x2={sx(tick.value)} y2={axisY + 4} />
			<text class="stat-graduation" x={sx(tick.value)} y={axisY + 16} text-anchor="middle"
				>{tick.label}</text
			>
		{/each}
		{#if scene.axisTitle}
			<text class="stat-titre-axe" x={padLeft + width / 2} y={totalHeight - 4} text-anchor="middle"
				>{scene.axisTitle}</text
			>
		{/if}
	</g>
</svg>

<style>
	.stat-svg {
		display: block;
		width: 100%;
		/* En dessous, le texte du SVG (11 px) deviendrait illisible : défiler plutôt */
		min-width: 300px;
		height: auto;
		margin: 0 auto;
		font-family: inherit;
	}

	.stat-svg text {
		fill: var(--color-foreground);
		stroke: none;
		font-size: 11px;
	}

	/* Quadrillage léger, comme le papier millimétré : 30 % du premier plan (audit a11y
	   des barres : `--color-border` était quasi invisible) */
	.stat-grille {
		stroke: color-mix(in oklab, var(--color-foreground) 30%, transparent);
		stroke-width: 0.75;
	}

	.stat-moustache,
	.stat-moustache-bout {
		stroke-width: 1.5;
	}

	.stat-boite {
		stroke-width: 1.5;
	}

	/* La médiane se lit d'abord : trait plus épais */
	.stat-mediane {
		stroke-width: 3;
	}

	.stat-svg .stat-nom-boite {
		font-weight: 600;
	}

	.stat-svg .stat-valeur {
		font-size: 10px;
		font-variant-numeric: tabular-nums;
	}

	.stat-axes line {
		stroke: var(--color-foreground);
		stroke-width: 1.1;
	}

	.stat-svg .stat-titre-axe {
		font-weight: 600;
	}
</style>
