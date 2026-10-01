<!--
	StatChart — blocs ```barres et ```circulaire
	============================================

	Diagramme statistique STATIQUE : SVG sans store ni interaction, dessiné
	depuis la scène pure `buildStatChartScene` (la même que le PDF Typst).

	- Barres : axe vertical depuis 0, graduations, noms inclinés si besoin.
	- Circulaire : secteurs (polygones de la scène) + légende HTML à côté (Q18).
	- Couleurs par tokens `var(--color-*)` (clair / sombre).
	- Accessibilité : `role="img"`, `<title>` et `<desc>` reliés par
	  `aria-labelledby` / `aria-describedby` ; la description énumère les données.
	- Erreur (Q48) : message situé pour le prof, cadre neutre « Figure
	  indisponible » pour l'élève.

	@module components/markdown/nodes/StatChart
-->
<script lang="ts">
	import type { CourbeColor } from '$lib/ubumark/types/courbe';
	import type { StatChartNode } from '$lib/ubumark/types/stat-chart';
	import {
		STAT_CHART_CHAR_PX,
		buildStatChartScene,
		type ScenePoint
	} from '$lib/ubumark/utils/stat-chart-scene';
	import { readContentLocale } from '../content-locale';
	import { readAuthoringErrors } from '../authoring-errors';
	import { OVER_BUDGET_MESSAGE, readRenderBudget, withinBudget } from '../render-budget';

	interface Props {
		node: StatChartNode;
		/** Forcer l'affichage des erreurs d'auteur ; sinon, contexte du renderer (élève par défaut) */
		showErrors?: boolean;
		class?: string;
	}

	let { node, showErrors, class: className = '' }: Props = $props();

	/** Marges autour du cadre des barres, en px (la gauche s'élargit selon les textes) */
	const PAD_LEFT_MIN = 40;
	/** Largeur moyenne d'un chiffre de graduation à 10 px */
	const TICK_CHAR_PX = 6.2;
	const PAD_RIGHT = 12;
	const PAD_TOP = 26;
	/** Bas : noms à plat ou inclinés, puis titre de l'axe horizontal */
	const PAD_BOTTOM_FLAT = 26;
	const AXIS_TITLE_PX = 18;

	const SIN_45 = Math.SQRT1_2;

	/** Rayon d'un repère numéroté, en px */
	const MARKER_PX = 9;
	/** Les repères extérieurs sont à 1,2 rayon du centre : marge en part du rayon, plus le repère */
	const PIE_PAD_RATIO = 0.22;

	/** Couleur des barres : tokens du thème ; vert et violet n'en ont pas, voir le style */
	const COLOR_VAR: Record<CourbeColor, string> = {
		bleu: 'var(--color-info)',
		rouge: 'var(--color-destructive)',
		vert: 'var(--stat-vert)',
		orange: 'var(--stat-orange)',
		violet: 'var(--stat-violet)',
		noir: 'var(--color-foreground)',
		gris: 'var(--color-muted-foreground)'
	};

	/** Palette des secteurs (même ordre que `stat-chart-typst.ts`) */
	const PIE_COLORS = [
		'var(--color-info)',
		'var(--stat-orange)',
		'var(--stat-vert)',
		'var(--color-destructive)',
		'var(--stat-violet)',
		'var(--stat-sarcelle)',
		'var(--color-muted-foreground)'
	];

	const uid = $props.id();
	const titleId = `${uid}-titre`;
	const descId = `${uid}-description`;

	const authoring = readAuthoringErrors();
	const locale = readContentLocale();
	/** Budget du document (nombre de blocs, temps cumulé) partagé avec ```figure et ```courbe */
	const budget = readRenderBudget();

	let errorsVisible = $derived(showErrors ?? authoring());
	let admitted = $derived(budget()?.admits(node) ?? true);
	let scene = $derived.by(() => {
		const spec = node.spec;
		if (!spec || !admitted) return null;
		return withinBudget(budget(), () => buildStatChartScene(spec, { locale: locale() }));
	});
	let overBudget = $derived(node.spec !== null && scene === null);
	let shownErrors = $derived(overBudget ? [{ message: OVER_BUDGET_MESSAGE }] : node.errors);

	let bars = $derived(scene?.kind === 'barres' ? scene : null);
	let pie = $derived(scene?.kind === 'circulaire' ? scene : null);

	let plotWidth = $derived(scene?.pixelSize.width ?? 0);
	let plotHeight = $derived(scene?.pixelSize.height ?? 0);
	/** Étendue d'un nom incliné, horizontale comme verticale */
	let rotatedExtent = $derived(
		bars?.rotateLabels ? bars.longestLabel * STAT_CHART_CHAR_PX * SIN_45 : 0
	);
	let padBottom = $derived(
		(bars?.rotateLabels ? 16 + rotatedExtent : PAD_BOTTOM_FLAT) +
			(bars?.axisTitles.x ? AXIS_TITLE_PX : 0)
	);
	/**
	 * Gauche : la plus longue graduation, et un nom incliné qui part vers la
	 * gauche depuis le milieu de la première barre (audit a11y : texte rogné).
	 */
	let padLeft = $derived.by(() => {
		if (!bars) return PAD_LEFT_MIN;
		const ticks = 12 + Math.max(...bars.ticks.map((t) => t.label.length)) * TICK_CHAR_PX;
		const halfBand = plotWidth / bars.bars.length / 2;
		return Math.max(PAD_LEFT_MIN, ticks, rotatedExtent - halfBand + 6);
	});

	/** Abscisse d'écran d'une position en catégories */
	function sx(x: number): number {
		return bars ? padLeft + (x / bars.bars.length) * plotWidth : 0;
	}

	/** Ordonnée d'écran d'une valeur */
	function sy(value: number): number {
		return bars ? PAD_TOP + (1 - value / bars.yMax) * plotHeight : 0;
	}

	let pieRadius = $derived(plotWidth / 2);
	let piePad = $derived(pieRadius * PIE_PAD_RATIO + MARKER_PX + 2);

	/** Point du repère de la scène (rayon 1, y vers le haut) → écran */
	function pieX(p: ScenePoint): number {
		return piePad + pieRadius + p.x * pieRadius;
	}

	function pieY(p: ScenePoint): number {
		return piePad + pieRadius - p.y * pieRadius;
	}

	function piePoints(points: ScenePoint[]): string {
		return points.map((p) => `${pieX(p).toFixed(2)},${pieY(p).toFixed(2)}`).join(' ');
	}
</script>

{#if scene}
	<figure class="stat-figure {className}">
		{#if scene.title}
			<figcaption class="stat-titre">{scene.title}</figcaption>
		{/if}

		{#if bars}
			<svg
				role="img"
				aria-labelledby={titleId}
				aria-describedby={descId}
				viewBox="0 0 {padLeft + plotWidth + PAD_RIGHT} {PAD_TOP + plotHeight + padBottom}"
				style:max-width="{padLeft + plotWidth + PAD_RIGHT}px"
				class="stat-svg"
			>
				<title id={titleId}>{scene.accessibleTitle}</title>
				<desc id={descId}>{scene.description}</desc>

				<!-- Graduations -->
				<g class="stat-graduations" aria-hidden="true">
					{#each bars.ticks as tick, i (i)}
						<line
							class="stat-grille"
							x1={padLeft}
							y1={sy(tick.value)}
							x2={padLeft + plotWidth}
							y2={sy(tick.value)}
						/>
						<line x1={padLeft - 4} y1={sy(tick.value)} x2={padLeft} y2={sy(tick.value)} />
						<text x={padLeft - 6} y={sy(tick.value)} text-anchor="end" dominant-baseline="middle"
							>{tick.label}</text
						>
					{/each}
				</g>

				<!-- Barres -->
				{#each bars.bars as bar, i (i)}
					<rect
						class="stat-barre"
						x={sx(bar.left)}
						y={sy(bar.value)}
						width={sx(bar.right) - sx(bar.left)}
						height={sy(0) - sy(bar.value)}
						style:fill={COLOR_VAR[bars.color]}
					/>
					{#if bars.showValues}
						<text
							class="stat-valeur"
							x={(sx(bar.left) + sx(bar.right)) / 2}
							y={sy(bar.value) - 4}
							text-anchor="middle">{bar.valueLabel}</text
						>
					{/if}
				{/each}

				<!-- Noms des catégories -->
				<g class="stat-categories" aria-hidden="true">
					{#each bars.bars as bar, i (i)}
						{@const cx = (sx(bar.left) + sx(bar.right)) / 2}
						{#if bars.rotateLabels}
							<text
								x={cx}
								y={sy(0) + 10}
								text-anchor="end"
								transform="rotate(-45 {cx} {sy(0) + 10})">{bar.label}</text
							>
						{:else}
							<text x={cx} y={sy(0) + 16} text-anchor="middle">{bar.label}</text>
						{/if}
					{/each}
				</g>

				<!-- Axes -->
				<g class="stat-axes" aria-hidden="true">
					<line x1={padLeft} y1={sy(0)} x2={padLeft + plotWidth} y2={sy(0)} />
					<line x1={padLeft} y1={sy(0)} x2={padLeft} y2={PAD_TOP - 10} />
					<polygon
						points="{padLeft},{PAD_TOP - 14} {padLeft - 3.5},{PAD_TOP - 7} {padLeft +
							3.5},{PAD_TOP - 7}"
					/>
					<text class="stat-titre-axe" x={padLeft + 6} y={PAD_TOP - 12}>{bars.axisTitles.y}</text>
					{#if bars.axisTitles.x}
						<text
							class="stat-titre-axe"
							x={padLeft + plotWidth / 2}
							y={PAD_TOP + plotHeight + padBottom - 4}
							text-anchor="middle">{bars.axisTitles.x}</text
						>
					{/if}
				</g>
			</svg>
		{:else if pie}
			<div class="stat-circulaire">
				<svg
					role="img"
					aria-labelledby={titleId}
					aria-describedby={descId}
					viewBox="0 0 {plotWidth + 2 * piePad} {plotWidth + 2 * piePad}"
					style:max-width="{plotWidth + 2 * piePad}px"
					class="stat-svg stat-disque"
				>
					<title id={titleId}>{scene.accessibleTitle}</title>
					<desc id={descId}>{scene.description}</desc>
					{#each pie.sectors as sector, i (i)}
						<polygon
							class="stat-secteur"
							points={piePoints(sector.polygon)}
							style:fill={PIE_COLORS[sector.colorIndex]}
						/>
					{/each}
					<!-- Repères numérotés (Q23) : le lien secteur → légende ne dépend pas de la couleur -->
					{#each pie.sectors as sector, i (i)}
						<g class="stat-repere">
							{#if sector.leader}
								<line
									x1={pieX(sector.leader[0])}
									y1={pieY(sector.leader[0])}
									x2={pieX(sector.leader[1])}
									y2={pieY(sector.leader[1])}
								/>
							{/if}
							<circle
								cx={pieX(sector.markerPosition)}
								cy={pieY(sector.markerPosition)}
								r={MARKER_PX}
							/>
							<text
								x={pieX(sector.markerPosition)}
								y={pieY(sector.markerPosition)}
								text-anchor="middle"
								dominant-baseline="central">{sector.marker}</text
							>
						</g>
					{/each}
				</svg>

				<ul class="stat-legende">
					{#each pie.legend as item, i (i)}
						<li>
							<span
								class="stat-pastille"
								aria-hidden="true"
								style:background-color={PIE_COLORS[item.colorIndex]}
							></span><span class="stat-numero">{item.marker}</span>{' '}{item.text}
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		{#if errorsVisible && node.warnings.length > 0}
			<!-- Texte en couleur de premier plan : `text-warning` ne fait que 3:1 (audit a11y) -->
			<ul class="mt-1 border-l-2 border-warning pl-2 text-xs text-foreground">
				{#each node.warnings as w, i (i)}
					<li>{w.message}</li>
				{/each}
			</ul>
		{/if}
	</figure>
{:else if errorsVisible}
	<div
		class="stat-erreur rounded-md border border-destructive p-3 text-sm text-foreground {className}"
	>
		<!-- Texte en couleur de premier plan : `text-destructive` ne fait que 3,3:1 (audit a11y) -->
		<p class="font-medium">Bloc {node.kind} : diagramme non dessiné</p>
		<ul class="mt-1 list-disc pl-5">
			{#each shownErrors as e, i (i)}
				<li>{e.message}</li>
			{/each}
		</ul>
	</div>
{:else}
	<div
		class="stat-indisponible rounded-md border border-dashed border-border p-3 text-center text-sm text-muted-foreground {className}"
	>
		Figure indisponible
	</div>
{/if}

<style>
	.stat-figure {
		overflow-x: auto;
		/* Pas de token de thème pour ces teintes : définies ici, claires / sombres */
		--stat-vert: light-dark(#15803d, #4ade80);
		--stat-violet: light-dark(#7c3aed, #a78bfa);
		--stat-sarcelle: light-dark(#0d9488, #2dd4bf);
		/* `--color-warning` ne fait que 3:1 sur le fond clair (audit a11y) */
		--stat-orange: light-dark(#b45309, #f59e0b);
		margin: 0.5rem 0;
	}

	.stat-titre {
		text-align: center;
		font-weight: 600;
		margin-bottom: 0.25rem;
	}

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
		font-size: 11px;
	}

	.stat-graduations line {
		stroke: var(--color-foreground);
		stroke-width: 1;
	}

	.stat-graduations .stat-grille {
		/* `--color-border` : 1,3:1, quasi invisible (audit a11y) */
		stroke: color-mix(in oklab, var(--color-foreground) 30%, transparent);
		stroke-width: 0.75;
	}

	.stat-graduations text {
		font-size: 10px;
	}

	.stat-axes line {
		stroke: var(--color-foreground);
		stroke-width: 1.1;
	}

	.stat-axes polygon {
		fill: var(--color-foreground);
	}

	.stat-svg .stat-titre-axe {
		font-size: 11px;
		font-weight: 600;
	}

	.stat-secteur {
		stroke: var(--color-background);
		stroke-width: 1;
	}

	.stat-circulaire {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 1rem;
	}

	.stat-disque {
		width: auto;
		flex: 0 1 auto;
		margin: 0;
	}

	.stat-legende {
		list-style: none;
		margin: 0;
		padding: 0;
		font-size: 0.875rem;
	}

	.stat-legende li {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.stat-repere circle {
		fill: var(--color-background);
		stroke: var(--color-foreground);
		stroke-width: 1;
	}

	.stat-repere line {
		stroke: var(--color-foreground);
		stroke-width: 1;
	}

	.stat-svg .stat-repere text {
		font-size: 11px;
		font-weight: 700;
	}

	.stat-numero {
		font-weight: 700;
	}

	.stat-pastille {
		display: inline-block;
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 2px;
		flex: none;
	}
</style>
