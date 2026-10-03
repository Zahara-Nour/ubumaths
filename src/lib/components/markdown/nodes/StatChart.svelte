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
	import { COURBE_COLORS } from '$lib/ubumark/types/courbe';
	import { PIE_COLOR_SEQUENCE, type StatChartNode } from '$lib/ubumark/types/stat-chart';
	import { namedColorScreen, namedColorTable } from '$lib/theme/named-colors';
	import {
		PIE_MARKER_PX,
		STAT_CHART_CHAR_PX,
		buildStatChartScene,
		type ScenePoint,
		type StatChartScene
	} from '$lib/ubumark/utils/stat-chart-scene';
	import { readContentLocale } from '../content-locale';
	import { STAT_TEXT } from '$lib/ubumark/utils/stat-chart-text';
	import StatChart from './StatChart.svelte';
	import { readAuthoringErrors } from '../authoring-errors';
	import { OVER_BUDGET_MESSAGE, readRenderBudget, withinBudget } from '../render-budget';

	interface Props {
		/** Le bloc ubumark ; absent quand une scène est donnée (atelier) */
		node?: StatChartNode;
		/**
		 * Une scène déjà construite (simulations de l'atelier, Q80) : dessinée
		 * telle quelle, sans bloc ni erreur d'auteur
		 */
		scene?: StatChartScene;
		/** Forcer l'affichage des erreurs d'auteur ; sinon, contexte du renderer (élève par défaut) */
		showErrors?: boolean;
		class?: string;
	}

	let { node, scene: given, showErrors, class: className = '' }: Props = $props();

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

	/** Couleur des barres : palette commune des figures (app.css), claire ou sombre */
	const COLOR_VAR = namedColorTable(COURBE_COLORS, namedColorScreen);

	/** Couleurs des secteurs : même ordre que le PDF (`PIE_COLOR_SEQUENCE`) */
	const PIE_COLORS = PIE_COLOR_SEQUENCE.map(namedColorScreen);

	const uid = $props.id();
	/** Motif des hachures de la seconde série (Q117) */
	const hatchId = `${uid}-hachures`;
	const titleId = `${uid}-titre`;
	const captionId = `${uid}-legende-tableau`;
	const descId = `${uid}-description`;

	const authoring = readAuthoringErrors();
	const locale = readContentLocale();
	/** Budget du document (nombre de blocs, temps cumulé) partagé avec ```figure et ```courbe */
	const budget = readRenderBudget();

	let errorsVisible = $derived(showErrors ?? authoring());
	let admitted = $derived(node === undefined ? true : (budget()?.admits(node) ?? true));
	/**
	 * Une exception de la scène ne doit jamais remonter : elle cassait le rendu
	 * de TOUTE la page (revue du lot 3). Le bloc tombe en erreur, comme une
	 * faute d'auteur.
	 */
	let computed = $derived.by((): { scene: StatChartScene | null; failed: boolean } => {
		if (given !== undefined) return { scene: given, failed: false };
		const spec = node?.spec;
		if (!spec || !admitted) return { scene: null, failed: false };
		try {
			const built = withinBudget(budget(), () => buildStatChartScene(spec, { locale: locale() }));
			return { scene: built, failed: false };
		} catch {
			return { scene: null, failed: true };
		}
	});
	let scene = $derived(computed.scene);
	let overBudget = $derived(
		node !== undefined && node.spec !== null && scene === null && !computed.failed
	);
	let shownErrors = $derived(
		computed.failed
			? [{ message: FAILED_MESSAGE }]
			: overBudget
				? [{ message: OVER_BUDGET_MESSAGE }]
				: (node?.errors ?? [])
	);

	let bars = $derived(scene?.kind === 'barres' ? scene : null);
	let pie = $derived(scene?.kind === 'circulaire' ? scene : null);
	let histogram = $derived(scene?.kind === 'histogramme' ? scene : null);
	let cumulative = $derived(scene?.kind === 'frequences-cumulees' ? scene : null);
	let crossTable = $derived(scene?.kind === 'tableau-croise' ? scene : null);
	let law = $derived(scene?.kind === 'loi' ? scene : null);
	let simulation = $derived(scene?.kind === 'simulation' ? scene : null);
	let comparison = $derived(scene?.kind === 'comparaison' ? scene : null);
	let frequencyTable = $derived(scene?.kind === 'effectifs' ? scene : null);
	let mean = $derived(scene?.kind === 'moyenne-selon-n' ? scene : null);
	/** Histogramme, polygone ou moyenne selon n : abscisses continues, axe vertical gradué */
	let classChart = $derived(histogram ?? cumulative ?? mean);
	/** Haut de l'axe vertical : carreaux / effectif (histogramme), 100 % (polygone), moyenne */
	let classYMax = $derived(histogram ? histogram.yMax : mean ? mean.yMax : 100);
	/** Bas de l'axe vertical : 0, sauf la moyenne selon n (valeurs négatives possibles) */
	let classYMin = $derived(mean ? mean.yMin : 0);
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
		const halfBand = plotWidth / bars.labels.length / 2;
		return Math.max(PAD_LEFT_MIN, ticks, rotatedExtent - halfBand + 6);
	});

	/** Abscisse d'écran d'une position en catégories */
	function sx(x: number): number {
		return bars ? padLeft + (x / bars.labels.length) * plotWidth : 0;
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
		return PAD_TOP + (1 - (value - classYMin) / (classYMax - classYMin || 1)) * plotHeight;
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
		{#if scene.title && !crossTable && !law && !simulation && !comparison && !frequencyTable}
			<figcaption class="stat-titre">{scene.title}</figcaption>
		{/if}

		<!-- `série:` (Q106) : la série brute, sous le titre, avant la figure -->
		{#if scene.series}
			<p class="stat-serie">{scene.series}</p>
		{/if}

		{#if scene.seriesOnly}
			<!-- `série: seule` : l'énoncé, sans la figure -->
		{:else if frequencyTable}
			<!-- Tableau d'effectifs (Q125-Q129) : à l'horizontale, une ligne des valeurs
			     puis une par grandeur ; à la verticale au-delà de 12 valeurs -->
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<div class="stat-tableau-defilement" role="region" aria-labelledby={captionId} tabindex="0">
				<table class="stat-tableau">
					<caption id={captionId} class:stat-titre={frequencyTable.title !== null}
						>{frequencyTable.caption}</caption
					>
					{#if frequencyTable.vertical}
						<thead>
							<tr>
								<th scope="col">{frequencyTable.valueHeader}</th>
								{#each frequencyTable.rows as row, i (i)}
									<th scope="col">{row.header}</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each frequencyTable.columns as column, i (i)}
								<tr>
									<th scope="row">{column}</th>
									{#each frequencyTable.rows as row, j (j)}
										<td
											>{#if row.cells[i] === ''}<span class="sr-only"
													>{frequencyTable.emptyLabel}</span
												>{:else}{row.cells[i]}{/if}</td
										>
									{/each}
								</tr>
							{/each}
						</tbody>
					{:else}
						<tbody>
							<tr>
								<th scope="row">{frequencyTable.valueHeader}</th>
								{#each frequencyTable.columns as column, i (i)}
									<th scope="col">{column}</th>
								{/each}
							</tr>
							{#each frequencyTable.rows as row, i (i)}
								<tr>
									<th scope="row">{row.header}</th>
									{#each row.cells as cell, j (j)}
										<td
											>{#if cell === ''}<span class="sr-only">{frequencyTable.emptyLabel}</span
												>{:else}{cell}{/if}</td
										>
									{/each}
								</tr>
							{/each}
						</tbody>
					{/if}
				</table>
			</div>
		{:else if comparison}
			<!-- `.comparer` (v2 lot 5, Q112) : une ligne par indicateur, une colonne
			     par série ; un trait plus marqué ouvre chaque groupe -->
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<div class="stat-tableau-defilement" role="region" aria-labelledby={captionId} tabindex="0">
				<table class="stat-tableau">
					<!-- La ligne d'historique le dit déjà : lu, pas répété à l'écran -->
					<caption id={captionId} class="sr-only">{comparison.accessibleTitle}</caption>
					<thead>
						<tr>
							<td></td>
							{#each comparison.columns as column, i (i)}
								<th scope="col">{column}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each comparison.rows as row, i (i)}
							<tr class:stat-groupe={row.groupStart}>
								<th scope="row">{row.header}</th>
								{#each row.cells as value, j (j)}
									<td>{value}</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else if simulation}
			<!-- Simulation (v2, lot 3) : une ligne par valeur ; le titre de l'auteur
			     et la légende des tirages dans <caption> -->
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<div class="stat-tableau-defilement" role="region" aria-labelledby={captionId} tabindex="0">
				<table class="stat-tableau">
					<caption id={captionId}
						>{#if simulation.title}<span class="stat-titre block">{simulation.title}</span
							>{/if}<span>{simulation.caption}</span></caption
					>
					<thead>
						<tr>
							<th scope="col"><i>{simulation.variable.toLowerCase()}</i><sub>i</sub></th>
							<th scope="col">{simulation.headers.count}</th>
							<th scope="col">{simulation.headers.frequency}</th>
							<th scope="col">{simulation.headers.probability}</th>
						</tr>
					</thead>
					<tbody>
						{#each simulation.rows as row, i (i)}
							<tr>
								<th scope="row">{row.value}</th>
								<td>{row.count}</td>
								<td>{row.frequency}</td>
								<td>{row.probability}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else if law}
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

				{#if bars.secondColor}
					<!-- Seconde série : hachures diagonales (Q117), lisibles sans la couleur -->
					<defs>
						<pattern
							id={hatchId}
							width="6"
							height="6"
							patternUnits="userSpaceOnUse"
							patternTransform="rotate(45)"
						>
							<line
								x1="0"
								y1="0"
								x2="0"
								y2="6"
								stroke-width="2.5"
								style:stroke={COLOR_VAR[bars.secondColor]}
							/>
						</pattern>
					</defs>
				{/if}

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
						class:stat-barre-hachuree={bar.series === 1}
						style:fill={bar.series === 1 ? `url(#${hatchId})` : COLOR_VAR[bars.color]}
						style:stroke={bar.series === 1 && bars.secondColor
							? COLOR_VAR[bars.secondColor]
							: undefined}
					/>
					{#if bars.showValues}
						<text
							class="stat-valeur"
							class:stat-valeur-serree={bars.legend !== null}
							x={(sx(bar.left) + sx(bar.right)) / 2}
							y={sy(bar.value) - 4}
							text-anchor="middle">{bar.valueLabel}</text
						>
					{/if}
				{/each}

				<!-- Noms des catégories -->
				<g class="stat-categories" aria-hidden="true">
					{#each bars.labels as label, i (i)}
						{@const cx = sx(label.center)}
						{#if bars.rotateLabels}
							<text
								x={cx}
								y={sy(0) + 10}
								text-anchor="end"
								transform="rotate(-45 {cx} {sy(0) + 10})">{label.text}</text
							>
						{:else}
							<text x={cx} y={sy(0) + 16} text-anchor="middle">{label.text}</text>
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
			{#if bars.legend && bars.secondColor}
				<!-- Légende des deux séries (Q117) : la couleur, puis les hachures -->
				<ul class="stat-legende-series">
					{#each bars.legend as name, i (i)}
						<li>
							<svg width="12" height="12" aria-hidden="true">
								<rect
									x="0.5"
									y="0.5"
									width="11"
									height="11"
									style:fill={i === 0 ? COLOR_VAR[bars.color] : `url(#${hatchId})`}
									style:stroke={i === 0 ? 'none' : COLOR_VAR[bars.secondColor]}
								/>
							</svg>
							{name}
						</li>
					{/each}
				</ul>
			{/if}
			{#if bars.indicatorTable}
				<!-- Indicateurs des deux séries (Q118) : le tableau de `.comparer` -->
				<StatChart scene={bars.indicatorTable} />
			{/if}
		{:else if classChart}
			{#if histogram?.seriesName}
				<!-- Deux séries (lot 5 PR c) : le nom au-dessus de chaque histogramme -->
				<p class="stat-nom-serie">{histogram.seriesName}</p>
			{/if}
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

				{#if histogram?.hatched}
					<!-- Seconde série : hachures diagonales (Q117), lisibles sans la couleur -->
					<defs>
						<pattern
							id={hatchId}
							width="6"
							height="6"
							patternUnits="userSpaceOnUse"
							patternTransform="rotate(45)"
						>
							<line
								x1="0"
								y1="0"
								x2="0"
								y2="6"
								stroke-width="2.5"
								style:stroke={COLOR_VAR[histogram.hatchColor ?? 'orange']}
							/>
						</pattern>
					</defs>
				{/if}

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
							class:stat-rectangle-hors={rect.highlighted === false}
							class:stat-rectangle-hachure={histogram.hatched === true}
							style:fill={histogram.hatched
								? `url(#${hatchId})`
								: rect.highlighted === false
									? 'var(--color-muted-foreground)'
									: COLOR_VAR[histogram.color]}
							style:stroke={histogram.hatched
								? COLOR_VAR[histogram.hatchColor ?? 'orange']
								: undefined}
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
					{#if cumulative.second}
						{@const second = cumulative.second}
						<!-- Second polygone (lot 5 PR c) : pointillés, autre teinte -->
						<polyline
							class="stat-polygone stat-polygone-second"
							points={second.points
								.map((p) => `${cx(p.x).toFixed(2)},${cy(p.y).toFixed(2)}`)
								.join(' ')}
							style:stroke={COLOR_VAR[second.color]}
						/>
						{#each second.points as p, i (i)}
							<circle
								class="stat-sommet"
								cx={cx(p.x)}
								cy={cy(p.y)}
								r="2.5"
								style:fill={COLOR_VAR[second.color]}
							/>
						{/each}
						<!-- Ses lectures, étiquetées de l'autre côté du trait -->
						{#each second.readings as reading, i (i)}
							<g class="stat-lecture">
								<polyline
									points="{cx(cumulative.xMin)},{cy(reading.percent)} {cx(reading.x)},{cy(
										reading.percent
									)} {cx(reading.x)},{cy(0)}"
									style:stroke={COLOR_VAR[second.color]}
								/>
								<text
									x={cx(reading.x) + 4}
									y={cy(reading.percent) + (cumulative.direction === 'croissantes' ? 12 : -4)}
									style:fill={COLOR_VAR[second.color]}>{reading.text}</text
								>
							</g>
						{/each}
					{/if}
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

				{#if mean}
					<!-- Moyenne des tirages selon n (Q81), et la droite y = E(X) -->
					<line
						class="stat-reference"
						x1={cx(mean.xMin)}
						y1={cy(mean.reference.value)}
						x2={cx(mean.xMax)}
						y2={cy(mean.reference.value)}
					/>
					<text
						class="stat-reference-texte"
						x={cx(mean.xMax)}
						y={cy(mean.reference.value) - 4}
						text-anchor="end">{mean.reference.label}</text
					>
					<polyline
						class="stat-polygone"
						points={mean.points.map((p) => `${cx(p.x).toFixed(2)},${cy(p.y).toFixed(2)}`).join(' ')}
						style:stroke={COLOR_VAR[mean.color]}
					/>
				{/if}

				<!-- Bornes des classes et axes -->
				<g class="stat-axes" aria-hidden="true">
					{#each classChart.xTicks as tick, i (i)}
						<line
							x1={cx(tick.value)}
							y1={cy(classYMin)}
							x2={cx(tick.value)}
							y2={cy(classYMin) + 4}
						/>
						<text x={cx(tick.value)} y={cy(classYMin) + 16} text-anchor="middle">{tick.label}</text>
					{/each}
					<line
						x1={CLASS_PAD_LEFT}
						y1={cy(classYMin)}
						x2={CLASS_PAD_LEFT + plotWidth}
						y2={cy(classYMin)}
					/>
					<line x1={CLASS_PAD_LEFT} y1={cy(classYMin)} x2={CLASS_PAD_LEFT} y2={PAD_TOP - 10} />
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
			{#if cumulative?.legend && cumulative.second}
				<!-- Légende des deux polygones : trait plein, puis pointillés -->
				<ul class="stat-legende-series">
					{#each cumulative.legend as name, i (i)}
						<li>
							<svg width="18" height="8" aria-hidden="true">
								<line
									x1="0"
									y1="4"
									x2="18"
									y2="4"
									stroke-width="2"
									stroke-dasharray={i === 0 ? undefined : '4 3'}
									style:stroke={COLOR_VAR[i === 0 ? cumulative.color : cumulative.second.color]}
								/>
							</svg>
							{name}
						</li>
					{/each}
				</ul>
			{/if}
			{#if histogram?.second}
				<!-- Le second histogramme : mêmes classes, même échelle (lot 5 PR c) -->
				<StatChart scene={histogram.second} />
			{/if}
			{#if histogram?.indicatorTable || cumulative?.indicatorTable}
				<StatChart scene={(histogram?.indicatorTable ?? cumulative?.indicatorTable)!} />
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

		{#if errorsVisible && node && node.warnings.length > 0}
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
		<p class="font-medium">Bloc {node?.kind} : diagramme non dessiné</p>
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
		{STAT_TEXT[locale()].unavailable}
	</div>
{/if}

<style>
	.stat-figure {
		overflow-x: auto;
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

	/* Classes hors de μ ± 2σ/√n (Q82) : grises, sans transparence — à 0,45 elles
	   tombaient sous 3:1 de contraste (WCAG 1.4.11, revue) */
	.stat-rectangle-hors {
		opacity: 1;
	}

	.stat-reference {
		stroke: var(--color-foreground);
		stroke-width: 1;
		stroke-dasharray: 5 4;
	}

	.stat-svg .stat-reference-texte {
		font-size: 11px;
		fill: var(--color-foreground);
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

	/* `.comparer` : un trait plus marqué ouvre chaque groupe d'indicateurs (Q112) */
	.stat-tableau .stat-groupe th,
	.stat-tableau .stat-groupe td {
		border-top-width: 3px;
	}

	/* Deux barres par bande : des valeurs plus petites, comme dans le PDF (revue) */
	.stat-svg .stat-valeur-serree {
		font-size: 8px;
	}

	.stat-nom-serie {
		text-align: center;
		font-weight: 600;
		font-size: 0.875rem;
		margin: 0.5rem 0 0;
	}

	.stat-polygone-second {
		stroke-dasharray: 6 4;
	}

	.stat-legende-series {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 1rem;
		margin: 0.25rem 0 0;
		padding: 0;
		list-style: none;
		font-size: 0.875rem;
	}

	.stat-legende-series li {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.stat-serie {
		margin-bottom: 0.5rem;
		overflow-wrap: anywhere;
		/* Deux séries : une ligne chacune */
		white-space: pre-line;
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
