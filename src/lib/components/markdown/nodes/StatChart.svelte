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
		PIE_MARKER_PX,
		STAT_CHART_CHAR_PX,
		buildStatChartScene,
		type ScenePoint,
		type StatChartScene
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

	const FAILED_MESSAGE = 'Le calcul du diagramme a échoué : il n’a pas été dessiné';

	/** Marge gauche d'un histogramme ou d'un polygone (graduations jusqu'à « 100 ») */
	const CLASS_PAD_LEFT = 44;

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
	const captionId = `${uid}-legende-tableau`;
	const descId = `${uid}-description`;

	const authoring = readAuthoringErrors();
	const locale = readContentLocale();
	/** Budget du document (nombre de blocs, temps cumulé) partagé avec ```figure et ```courbe */
	const budget = readRenderBudget();

	let errorsVisible = $derived(showErrors ?? authoring());
	let admitted = $derived(budget()?.admits(node) ?? true);
	/**
	 * Une exception de la scène ne doit jamais remonter : elle cassait le rendu
	 * de TOUTE la page (revue du lot 3). Le bloc tombe en erreur, comme une
	 * faute d'auteur.
	 */
	let computed = $derived.by((): { scene: StatChartScene | null; failed: boolean } => {
		const spec = node.spec;
		if (!spec || !admitted) return { scene: null, failed: false };
		try {
			const built = withinBudget(budget(), () => buildStatChartScene(spec, { locale: locale() }));
			return { scene: built, failed: false };
		} catch {
			return { scene: null, failed: true };
		}
	});
	let scene = $derived(computed.scene);
	let overBudget = $derived(node.spec !== null && scene === null && !computed.failed);
	let shownErrors = $derived(
		computed.failed
			? [{ message: FAILED_MESSAGE }]
			: overBudget
				? [{ message: OVER_BUDGET_MESSAGE }]
				: node.errors
	);

	let bars = $derived(scene?.kind === 'barres' ? scene : null);
	let pie = $derived(scene?.kind === 'circulaire' ? scene : null);
	let histogram = $derived(scene?.kind === 'histogramme' ? scene : null);
	let cumulative = $derived(scene?.kind === 'frequences-cumulees' ? scene : null);
	let crossTable = $derived(scene?.kind === 'tableau-croise' ? scene : null);
	let law = $derived(scene?.kind === 'loi' ? scene : null);
	/** Histogramme ou polygone : abscisses dans l'unité des classes */
	let classChart = $derived(histogram ?? cumulative);
	/** Haut de l'axe vertical : carreaux / effectif (histogramme) ou 100 % (polygone) */
	let classYMax = $derived(histogram ? histogram.yMax : 100);
	let classPadBottom = $derived(PAD_BOTTOM_FLAT + (classChart?.axisTitles.x ? AXIS_TITLE_PX : 0));

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

	/** Abscisse d'écran, dans l'unité des classes */
	function cx(x: number): number {
		if (!classChart) return 0;
		return (
			CLASS_PAD_LEFT + ((x - classChart.xMin) / (classChart.xMax - classChart.xMin)) * plotWidth
		);
	}

	/** Ordonnée d'écran, de 0 à `classYMax` */
	function cy(value: number): number {
		return PAD_TOP + (1 - value / classYMax) * plotHeight;
	}

	let pieRadius = $derived(plotWidth / 2);
	let piePad = $derived(pieRadius * PIE_PAD_RATIO + PIE_MARKER_PX + 2);

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
		<!-- Un tableau porte son titre dans <caption> : pas de figcaption en plus -->
		{#if scene.title && !crossTable && !law}
			<figcaption class="stat-titre">{scene.title}</figcaption>
		{/if}

		{#if law}
			<!-- Loi d'une variable aléatoire (lot 6) : même tableau accessible que
			     le tableau croisé, deux lignes `gᵢ` / `P(G = gᵢ)` -->
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<div class="stat-tableau-defilement" role="region" aria-labelledby={captionId} tabindex="0">
				<table class="stat-tableau">
					<caption id={captionId} class:stat-titre={law.title !== null}
						>{law.title ?? law.accessibleTitle}</caption
					>
					<tbody>
						<tr>
							<th scope="row"><i>{law.variable.toLowerCase()}</i><sub>i</sub></th>
							{#each law.values as value, i (i)}
								<td>{value}</td>
							{/each}
						</tr>
						<tr>
							<th scope="row"
								>P({law.variable} = <i>{law.variable.toLowerCase()}</i><sub>i</sub>)</th
							>
							{#each law.probabilities as cell, i (i)}
								<td class:stat-case-vide={cell.hidden}
									>{#if cell.hidden}<span class="sr-only">{law.hiddenLabel}</span
										>{:else}{cell.text}{/if}</td
								>
							{/each}
						</tr>
					</tbody>
				</table>
			</div>
		{:else if crossTable}
			<!-- Zone de défilement focalisable : sans élément focalisable dedans, un
			     tableau qui déborde ne défile pas au clavier (Safari macOS ; WCAG 2.1.1,
			     audit a11y du lot 4). `tabindex` sur une région est le motif recommandé. -->
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<div class="stat-tableau-defilement" role="region" aria-labelledby={captionId} tabindex="0">
				<table class="stat-tableau">
					<caption
						id={captionId}
						class:stat-titre={crossTable.title !== null}
						class:sr-only={crossTable.title === null}
						>{crossTable.title ?? crossTable.accessibleTitle}</caption
					>
					<thead>
						<tr>
							<!-- Coin : `Sexe \ Régime` est lu « lignes : Sexe, colonnes : Régime » -->
							<td class="stat-coin"
								>{#if crossTable.corner !== null}<span aria-hidden="true">{crossTable.corner}</span
									><span class="sr-only">{crossTable.cornerSpoken}</span>{/if}</td
							>
							{#each crossTable.columnHeaders as header, i (i)}
								<th scope="col">{header}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each crossTable.rows as row, i (i)}
							<tr>
								<th scope="row">{row.header}</th>
								{#each row.cells as cell, j (j)}
									<!-- Case à compléter : vide à l'écran, annoncée au lecteur d'écran -->
									<td class:stat-case-vide={cell.hidden}
										>{#if cell.hidden}<span class="sr-only">{crossTable.hiddenLabel}</span
											>{:else if cell.srText !== null}<span aria-hidden="true">{cell.text}</span
											><span class="sr-only">{cell.srText}</span>{:else}{cell.text}{/if}</td
									>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else if bars}
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
		{:else if classChart}
			<svg
				role="img"
				aria-labelledby={titleId}
				aria-describedby={descId}
				viewBox="0 0 {CLASS_PAD_LEFT + plotWidth + PAD_RIGHT} {PAD_TOP +
					plotHeight +
					classPadBottom}"
				style:max-width="{CLASS_PAD_LEFT + plotWidth + PAD_RIGHT}px"
				class="stat-svg"
			>
				<title id={titleId}>{scene.accessibleTitle}</title>
				<desc id={descId}>{scene.description}</desc>

				<!-- Graduations verticales, ou quadrillage d'un histogramme à carreaux -->
				<g class="stat-graduations" aria-hidden="true">
					{#if histogram?.mode !== 'carreaux'}
						{#each classChart.ticks as tick, i (i)}
							<line
								class="stat-grille"
								x1={cx(classChart.xMin)}
								y1={cy(tick.value)}
								x2={cx(classChart.xMax)}
								y2={cy(tick.value)}
							/>
							<line
								x1={CLASS_PAD_LEFT - 4}
								y1={cy(tick.value)}
								x2={CLASS_PAD_LEFT}
								y2={cy(tick.value)}
							/>
							<text
								x={CLASS_PAD_LEFT - 6}
								y={cy(tick.value)}
								text-anchor="end"
								dominant-baseline="middle">{tick.label}</text
							>
						{/each}
					{/if}
				</g>

				{#if histogram}
					{#each histogram.rects as rect, i (i)}
						<rect
							class="stat-rectangle"
							x={cx(rect.lower)}
							y={cy(rect.height)}
							width={cx(rect.upper) - cx(rect.lower)}
							height={cy(0) - cy(rect.height)}
							style:fill={COLOR_VAR[histogram.color]}
						/>
						<!-- Au-dessus, pas dedans : un rectangle bas ou nul le cachait, et le
						     texte clair sur rouge ou bleu sombre manquait de contraste (audit a11y) -->
						{#if histogram.showValues}
							<text
								class="stat-valeur"
								x={(cx(rect.lower) + cx(rect.upper)) / 2}
								y={cy(rect.height) - 4}
								text-anchor="middle">{rect.valueLabel}</text
							>
						{/if}
					{/each}
				{/if}

				<!-- Quadrillage du mode carreaux : APRÈS les rectangles, pour compter dedans -->
				{#if histogram?.mode === 'carreaux'}
					<g class="stat-quadrillage" aria-hidden="true">
						{#each histogram.grid.xs as x, i (i)}
							<line x1={cx(x)} y1={cy(0)} x2={cx(x)} y2={cy(classYMax)} />
						{/each}
						{#each histogram.grid.ys as y, i (i)}
							<line x1={cx(classChart.xMin)} y1={cy(y)} x2={cx(classChart.xMax)} y2={cy(y)} />
						{/each}
					</g>
				{/if}
				{#if cumulative}
					<polyline
						class="stat-polygone"
						points={cumulative.points
							.map((p) => `${cx(p.x).toFixed(2)},${cy(p.y).toFixed(2)}`)
							.join(' ')}
						style:stroke={COLOR_VAR[cumulative.color]}
					/>
					{#each cumulative.points as p, i (i)}
						<circle
							class="stat-sommet"
							cx={cx(p.x)}
							cy={cy(p.y)}
							r="2.5"
							style:fill={COLOR_VAR[cumulative.color]}
						/>
					{/each}
					<!-- Étiquette au début du pointillé, du côté libre : au-dessus si le
					     polygone croît (il passe dessous à gauche), en dessous s'il décroît -->
					{#each cumulative.readings as reading, i (i)}
						<g class="stat-lecture">
							<polyline
								points="{cx(cumulative.xMin)},{cy(reading.percent)} {cx(reading.x)},{cy(
									reading.percent
								)} {cx(reading.x)},{cy(0)}"
							/>
							<text
								x={cx(cumulative.xMin) + 4}
								y={cy(reading.percent) + (cumulative.direction === 'croissantes' ? -4 : 12)}
								>{reading.text}</text
							>
						</g>
					{/each}
				{/if}

				<!-- Bornes des classes et axes -->
				<g class="stat-axes" aria-hidden="true">
					{#each classChart.xTicks as tick, i (i)}
						<line x1={cx(tick.value)} y1={cy(0)} x2={cx(tick.value)} y2={cy(0) + 4} />
						<text x={cx(tick.value)} y={cy(0) + 16} text-anchor="middle">{tick.label}</text>
					{/each}
					<line x1={CLASS_PAD_LEFT} y1={cy(0)} x2={CLASS_PAD_LEFT + plotWidth} y2={cy(0)} />
					<line x1={CLASS_PAD_LEFT} y1={cy(0)} x2={CLASS_PAD_LEFT} y2={PAD_TOP - 10} />
					<polygon
						points="{CLASS_PAD_LEFT},{PAD_TOP - 14} {CLASS_PAD_LEFT - 3.5},{PAD_TOP -
							7} {CLASS_PAD_LEFT + 3.5},{PAD_TOP - 7}"
					/>
					{#if classChart.axisTitles.y}
						<text class="stat-titre-axe" x={CLASS_PAD_LEFT + 6} y={PAD_TOP - 12}
							>{classChart.axisTitles.y}</text
						>
					{/if}
					{#if classChart.axisTitles.x}
						<text
							class="stat-titre-axe"
							x={CLASS_PAD_LEFT + plotWidth / 2}
							y={PAD_TOP + plotHeight + classPadBottom - 4}
							text-anchor="middle">{classChart.axisTitles.x}</text
						>
					{/if}
				</g>
			</svg>
			{#if histogram?.carreau}
				<p class="stat-legende-aire">
					<span class="stat-carreau" aria-hidden="true"></span>{histogram.carreau.legend}
				</p>
			{/if}
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
								<polyline points={piePoints(sector.leader)} />
							{/if}
							<circle
								cx={pieX(sector.markerPosition)}
								cy={pieY(sector.markerPosition)}
								r={PIE_MARKER_PX}
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
							></span><span class="stat-numero">{item.marker}</span>
							{item.text}
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<!-- Une liste : « · » n'est ni lu ni marqué d'une pause par les lecteurs d'écran -->
		{#if scene.indicators.length > 0}
			<ul class="stat-indicateurs">
				{#each scene.indicators as indicator, i (i)}
					<li>{indicator}</li>
				{/each}
			</ul>
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

	/* Bordure couleur du fond, comme les secteurs : sépare deux classes de même
	   couleur au moins à 3:1 dans les deux thèmes (audit a11y) */
	.stat-tableau-defilement {
		overflow-x: auto;
	}

	.stat-tableau-defilement:focus-visible {
		outline: 2px solid var(--color-ring);
		outline-offset: 2px;
	}

	.stat-tableau {
		margin: 0 auto;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.stat-tableau th,
	.stat-tableau td {
		border: 1px solid var(--color-foreground);
		padding: 0.3rem 0.6rem;
		text-align: center;
		font-variant-numeric: tabular-nums;
	}

	.stat-tableau .stat-coin {
		font-style: italic;
	}

	/* Assez de place pour écrire une réponse (`min-width` n'a pas d'effet défini
	   sur une case de tableau), et repérable même sans bordure visible */
	.stat-tableau .stat-case-vide {
		width: 3.5rem;
		background: var(--color-muted);
	}

	.stat-rectangle {
		stroke: var(--color-background);
		stroke-width: 1.5;
	}

	/* Mode carreaux : le quadrillage est la seule échelle, il passe DEVANT les
	   rectangles pour qu'on y compte les carreaux, et doit atteindre ~3:1 */
	.stat-quadrillage line {
		stroke: color-mix(in oklab, var(--color-foreground) 50%, transparent);
		stroke-width: 0.75;
	}

	.stat-polygone {
		fill: none;
		stroke-width: 2;
		stroke-linejoin: round;
	}

	/* 1,5 px : sinon confondu avec la ligne de grille qu'il recouvre (audit a11y) */
	.stat-lecture polyline {
		fill: none;
		stroke: var(--color-foreground);
		stroke-width: 1.5;
		stroke-dasharray: 4 3;
	}

	/* Halo couleur du fond : l'étiquette reste lisible sur la grille ou le polygone */
	.stat-svg .stat-lecture text {
		paint-order: stroke;
		stroke: var(--color-background);
		stroke-width: 3px;
	}

	.stat-legende-aire,
	.stat-indicateurs {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
		gap: 0.4rem;
		margin: 0.25rem 0 0;
		padding: 0;
		list-style: none;
		font-size: 0.875rem;
		text-align: center;
	}

	/* Séparateur visuel seulement : texte de remplacement vide pour les lecteurs d'écran */
	.stat-indicateurs li + li::before {
		content: '·' / '';
		margin-right: 0.4rem;
	}

	.stat-carreau {
		display: inline-block;
		width: 0.75rem;
		height: 0.75rem;
		border: 1px solid var(--color-foreground);
	}

	.stat-repere circle {
		fill: var(--color-background);
		stroke: var(--color-foreground);
		stroke-width: 1;
	}

	.stat-repere polyline {
		fill: none;
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
