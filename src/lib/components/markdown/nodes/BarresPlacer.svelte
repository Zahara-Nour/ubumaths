<!--
	BarresPlacer — diagramme en barres à construire (```barres + `placer:`)
	=======================================================================

	L'élève monte les barres nommées par `placer:` (CP-072, CE1-088, CE2-082 ;
	chantier `docs/wip/reponses-a-placer-progress.md` § 17, 18).

	- Axe vertical écrit par le prof (`axe:`), barres dessinées comme `StatChart`.
	- Barre à construire pas encore montée : un trait en pointillés au pied de sa
	  colonne. Colonne de la barre choisie : un fond léger.
	- Toucher la colonne d'une barre à construire la choisit et monte son haut à
	  la hauteur du doigt ; glisser l'ajuste. Aimant à l'unité, même sur un axe
	  gradué de 2 en 2 (lire l'échelle). Hors de ces colonnes, la page défile.
	- Étiquettes (plusieurs barres), boutons ▲ ▼ (une unité, la barre choisie),
	  flèches du clavier, Début (0), Fin (haut de l'axe).
	- L'effectif attendu n'est JAMAIS affiché ni dit avant la correction ; le nom
	  accessible donne la hauteur posée par l'élève.
	- Dans une question (`answers`, une case par barre, dans l'ordre des données) :
	  la réponse de chaque case est la hauteur posée (`12`), `''` tant que la barre
	  n'est pas construite. Faux : une phrase par barre fausse (`barMistake`) et le
	  diagramme juste à côté.
	- Sans `answers` (aperçu du prof, cours) : le même geste, rien de jugé.

	@module components/markdown/nodes/BarresPlacer
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { COURBE_COLORS } from '$lib/ubumark/types/courbe';
	import type { StatChartNode } from '$lib/ubumark/types/stat-chart';
	import { namedColorScreen, namedColorTable } from '$lib/theme/named-colors';
	import { buildStatChartScene, STAT_CHART_CHAR_PX } from '$lib/ubumark/utils/stat-chart-scene';
	import {
		barMistake,
		barsToPlace,
		barValueAt,
		barValueOfAnswer
	} from '$lib/ubumark/utils/barres-placer';
	import { readContentLocale } from '../content-locale';
	import type { BuildCase } from './CollectionConstruire.svelte';
	import StatChart from './StatChart.svelte';

	interface Props {
		/** Diagramme à construire (`spec.toPlace` et `spec.axis` définis) */
		node: StatChartNode;
		/** Une case par barre à construire, dans l'ordre des données ; absentes : geste libre */
		answers?: BuildCase[];
		/** false : diagramme seul, sans boutons ni étiquettes (copie corrigée) */
		showControls?: boolean;
		class?: string;
	}

	let { node, answers, showControls = true, class: className = '' }: Props = $props();

	/** Marges autour du cadre, en px : celles de `StatChart.svelte` */
	const PAD_LEFT_MIN = 40;
	const TICK_CHAR_PX = 6.2;
	const PAD_RIGHT = 12;
	const PAD_TOP = 26;
	const PAD_BOTTOM_FLAT = 26;
	const AXIS_TITLE_PX = 18;
	const SIN_45 = Math.SQRT1_2;
	/** Couleur des barres : palette commune des figures, claire ou sombre */
	const COLOR_VAR = namedColorTable(COURBE_COLORS, namedColorScreen);

	const uid = $props.id();
	const titleId = `${uid}-titre`;
	const locale = readContentLocale();

	let spec = $derived(node.spec!);
	let axisMax = $derived(spec.axis?.max ?? 1);
	let scene = $derived.by(() => {
		const built = buildStatChartScene(spec, { locale: locale() });
		return built.kind === 'barres' ? built : null;
	});
	/** Les barres à construire, dans l'ordre des cases */
	let targets = $derived(barsToPlace(spec));

	/**
	 * Hauteurs posées, une par barre à construire : relues quand la valeur d'une
	 * case change (case remise à vide, composant remonté), réassignées à chaque
	 * geste (dérivé modifiable)
	 */
	let values = $derived<(number | null)[]>(
		targets.map((_, k) => barValueOfAnswer(answers?.[k]?.value ?? ''))
	);
	/** Barre choisie (rang dans `targets`) : la première pas construite au montage */
	let chosen = $state(untrack(() => Math.max(0, values.indexOf(null))));
	/** Le prof retire des barres dans l'aperçu : jamais hors bornes */
	let active = $derived(Math.min(chosen, Math.max(0, targets.length - 1)));
	let locked = $derived(answers?.[0]?.disabled ?? false);
	let dragging = $state(false);
	let svg: SVGSVGElement | undefined = $state();

	let verdicts = $derived(targets.map((_, k) => answers?.[k]?.isCorrect ?? null));
	let judged = $derived(verdicts.some((v) => v !== null));
	let allRight = $derived(judged && verdicts.every((v) => v === true));
	let mistakes = $derived(
		targets.flatMap((target, k) =>
			verdicts[k] === false ? (barMistake(target.label, values[k], target.expected) ?? []) : []
		)
	);

	let count = $derived(scene?.labels.length ?? 1);
	let plotWidth = $derived(scene?.pixelSize.width ?? 0);
	let plotHeight = $derived(scene?.pixelSize.height ?? 0);
	let rotatedExtent = $derived(
		scene?.rotateLabels ? scene.longestLabel * STAT_CHART_CHAR_PX * SIN_45 : 0
	);
	let padBottom = $derived(
		(scene?.rotateLabels ? 16 + rotatedExtent : PAD_BOTTOM_FLAT) +
			(scene?.axisTitles.x ? AXIS_TITLE_PX : 0)
	);
	let padLeft = $derived.by(() => {
		if (!scene) return PAD_LEFT_MIN;
		const ticks = 12 + Math.max(...scene.ticks.map((t) => t.label.length)) * TICK_CHAR_PX;
		const halfBand = plotWidth / count / 2;
		return Math.max(PAD_LEFT_MIN, ticks, rotatedExtent - halfBand + 6);
	});
	let viewWidth = $derived(padLeft + plotWidth + PAD_RIGHT);
	let viewHeight = $derived(PAD_TOP + plotHeight + padBottom);

	/** Rang dans `targets` de chaque catégorie à construire */
	let rankOfIndex = $derived(new Map(targets.map((t, k) => [t.index, k])));

	/** Hauteur posée, dite par le lecteur d'écran (jamais l'effectif attendu) */
	let valueText = $derived.by(() => {
		const target = targets[active];
		if (!target) return '';
		const value = values[active];
		return value === null
			? `barre ${target.label} pas construite`
			: `barre ${target.label} : ${value}`;
	});

	/** Abscisse d'écran d'une position en catégories */
	function sx(x: number): number {
		return padLeft + (x / count) * plotWidth;
	}

	/** Ordonnée d'écran d'une valeur */
	function sy(value: number): number {
		return PAD_TOP + (1 - value / axisMax) * plotHeight;
	}

	function place(k: number, value: number) {
		if (locked) return;
		const next = Math.min(axisMax, Math.max(0, value));
		if (values[k] === next) return;
		values = values.map((v, i) => (i === k ? next : v));
		answers?.[k]?.onChange(String(next));
	}

	/** Point du doigt dans le repère du dessin ; null hors du dessin */
	function pointerAt(event: { clientX: number; clientY: number }): { x: number; y: number } | null {
		if (!svg) return null;
		const rect = svg.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) return null;
		return {
			x: ((event.clientX - rect.left) / rect.width) * viewWidth,
			y: ((event.clientY - rect.top) / rect.height) * viewHeight
		};
	}

	/** Rang de la barre à construire dont la colonne est sous le doigt ; null sinon */
	function columnAt(point: { x: number; y: number }): number | null {
		if (point.x < padLeft || point.x > padLeft + plotWidth) return null;
		if (point.y < PAD_TOP - 10 || point.y > PAD_TOP + plotHeight + 6) return null;
		const index = Math.floor(((point.x - padLeft) / plotWidth) * count);
		return rankOfIndex.get(index) ?? null;
	}

	/** Hauteur sous le doigt, aimantée à l'unité */
	function valueAt(point: { y: number }): number {
		return barValueAt({ max: axisMax, step: 1 }, (PAD_TOP + plotHeight - point.y) / plotHeight);
	}

	/**
	 * iPhone : doigt posé sur une colonne à construire, la page ne défile pas, sinon
	 * Safari attend de savoir si le geste défile avant de laisser monter la barre.
	 * Écouteur non passif (Svelte rend `ontouchstart` passif) ; ailleurs, la page défile.
	 */
	function handleTouchStart(event: TouchEvent) {
		if (locked || event.touches.length !== 1) return;
		const point = pointerAt(event.touches[0]);
		if (point !== null && columnAt(point) !== null) event.preventDefault();
	}

	$effect(() => {
		const el = svg;
		if (!el) return;
		el.addEventListener('touchstart', handleTouchStart, { passive: false });
		return () => el.removeEventListener('touchstart', handleTouchStart);
	});

	function handlePointerDown(event: PointerEvent) {
		if (locked) return;
		const point = pointerAt(event);
		if (point === null) return;
		const k = columnAt(point);
		if (k === null) return;
		chosen = k;
		place(k, valueAt(point));
		dragging = true;
		svg?.setPointerCapture?.(event.pointerId);
	}

	function handlePointerMove(event: PointerEvent) {
		if (!dragging) return;
		const point = pointerAt(event);
		if (point !== null) place(active, valueAt(point));
	}

	function handlePointerUp() {
		dragging = false;
	}

	/** Une unité ; barre pas construite : elle part de 0 */
	function stepBy(delta: 1 | -1) {
		const value = values[active];
		place(active, value === null ? Math.max(0, delta) : value + delta);
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (locked) return;
		const moves: Record<string, () => void> = {
			ArrowUp: () => stepBy(1),
			ArrowRight: () => stepBy(1),
			ArrowDown: () => stepBy(-1),
			ArrowLeft: () => stepBy(-1),
			Home: () => place(active, 0),
			End: () => place(active, axisMax)
		};
		const move = moves[event.key];
		if (!move) return;
		event.preventDefault();
		move();
	}
</script>

{#if scene}
	<figure class="barres-placer my-2 flex flex-col items-center gap-2 {className}">
		{#if scene.title}
			<figcaption class="stat-titre">{scene.title}</figcaption>
		{/if}
		{#if scene.series}
			<p class="stat-serie">{scene.series}</p>
		{/if}

		<div
			class="placer-zone w-full rounded-md border p-2"
			class:placer-juste={allRight}
			class:placer-faux={judged && !allRight}
		>
			<svg
				bind:this={svg}
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 {viewWidth} {viewHeight}"
				style:max-width="{viewWidth}px"
				class="stat-svg barres-dessin"
				class:placer-verrouille={locked}
				role="slider"
				tabindex={locked ? -1 : 0}
				aria-labelledby={titleId}
				aria-valuemin={0}
				aria-valuemax={axisMax}
				aria-valuenow={values[active] ?? undefined}
				aria-valuetext={valueText}
				aria-disabled={locked}
				onpointerdown={handlePointerDown}
				onpointermove={handlePointerMove}
				onpointerup={handlePointerUp}
				onpointercancel={handlePointerUp}
				onkeydown={handleKeyDown}
			>
				<title id={titleId}
					>Diagramme en barres à construire : barre {targets[active]?.label ?? ''}</title
				>

				<!-- Colonne de la barre choisie -->
				{#if showControls && !locked && targets[active]}
					{@const index = targets[active].index}
					<rect
						class="barres-colonne-active"
						x={sx(index)}
						y={PAD_TOP}
						width={sx(index + 1) - sx(index)}
						height={plotHeight}
					/>
				{/if}

				<!-- Graduations -->
				<g class="stat-graduations" aria-hidden="true">
					{#each scene.ticks as tick, i (i)}
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

				<!-- Barres : dessinées, ou posées par l'élève (jamais l'effectif attendu) -->
				{#each scene.bars as bar, i (i)}
					{@const k = rankOfIndex.get(i)}
					{@const value = k === undefined ? bar.value : values[k]}
					{#if value === null}
						<line
							class="barres-attente"
							x1={sx(bar.left)}
							y1={sy(0)}
							x2={sx(bar.right)}
							y2={sy(0)}
						/>
					{:else}
						<rect
							class="stat-barre"
							class:barres-posee={k !== undefined}
							class:barres-posee-active={k !== undefined && k === active && showControls}
							x={sx(bar.left)}
							y={sy(value)}
							width={sx(bar.right) - sx(bar.left)}
							height={sy(0) - sy(value)}
							style:fill={COLOR_VAR[scene.color]}
						/>
					{/if}
				{/each}

				<!-- Noms des catégories -->
				<g class="stat-categories" aria-hidden="true">
					{#each scene.labels as label, i (i)}
						{@const cx = sx(label.center)}
						{#if scene.rotateLabels}
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
					<text class="stat-titre-axe" x={padLeft + 6} y={PAD_TOP - 12}>{scene.axisTitles.y}</text>
					{#if scene.axisTitles.x}
						<text
							class="stat-titre-axe"
							x={padLeft + plotWidth / 2}
							y={PAD_TOP + plotHeight + padBottom - 4}
							text-anchor="middle">{scene.axisTitles.x}</text
						>
					{/if}
				</g>
			</svg>
		</div>

		{#if showControls}
			<!-- Étiquettes (plusieurs barres) puis ▲ ▼ : deux rangées, qui tiennent sur un téléphone -->
			<div class="flex flex-col items-center gap-2">
				{#if targets.length > 1}
					<div
						class="flex flex-wrap justify-center gap-1"
						role="group"
						aria-label="Barre à construire"
					>
						{#each targets as target, k (target.index)}
							<button
								type="button"
								class="placer-etiquette flex min-h-11 items-center justify-center rounded-md border px-3 text-sm font-semibold"
								class:placer-etiquette-active={k === active}
								class:placer-etiquette-absente={values[k] === null}
								aria-pressed={k === active}
								disabled={locked}
								onclick={() => (chosen = k)}
							>
								{target.label}
							</button>
						{/each}
					</div>
				{/if}
				<div class="flex gap-3">
					<button
						type="button"
						class="placer-cran flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border bg-background text-lg hover:bg-muted disabled:opacity-40"
						aria-label="Descendre la barre {targets[active]?.label ?? ''} d’une unité"
						disabled={locked}
						onclick={() => stepBy(-1)}
					>
						<span aria-hidden="true">▼</span>
					</button>
					<button
						type="button"
						class="placer-cran flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border bg-background text-lg hover:bg-muted disabled:opacity-40"
						aria-label="Monter la barre {targets[active]?.label ?? ''} d’une unité"
						disabled={locked}
						onclick={() => stepBy(1)}
					>
						<span aria-hidden="true">▲</span>
					</button>
				</div>
			</div>
		{/if}

		{#if judged}
			<p class="sr-only" role="status">
				{allRight ? 'réponse juste' : 'réponse fausse'}
			</p>
		{/if}

		{#if judged && !allRight}
			{#each mistakes as mistake (mistake)}
				<p class="text-sm">{mistake}</p>
			{/each}
			<div class="placer-correction flex w-full flex-col items-center gap-1">
				<p class="text-sm font-medium text-muted-foreground">Correction</p>
				<!-- Le diagramme juste : toutes les barres dessinées -->
				<StatChart node={{ ...node, spec: { ...spec, toPlace: null } }} class="w-full" />
			</div>
		{/if}
	</figure>
{/if}

<style>
	.stat-titre {
		text-align: center;
		font-weight: 600;
	}

	.stat-serie {
		overflow-wrap: anywhere;
		white-space: pre-line;
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

	.barres-dessin {
		cursor: pointer;
		/* iPhone : un appui long ouvrirait la loupe et une sélection de texte */
		-webkit-user-select: none;
		user-select: none;
		-webkit-touch-callout: none;
	}

	.barres-dessin:focus-visible {
		outline: 2px solid var(--color-ring);
		outline-offset: 2px;
	}

	.placer-verrouille {
		cursor: default;
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

	/* Colonne de la barre choisie : un fond léger */
	.barres-colonne-active {
		fill: color-mix(in oklab, var(--color-primary) 10%, transparent);
	}

	/* Barre choisie, posée : bordée de la couleur d'accent */
	.barres-posee-active {
		stroke: var(--color-primary);
		stroke-width: 2;
	}

	/* Barre pas encore construite : pointillés au pied de sa colonne */
	.barres-attente {
		stroke: var(--color-muted-foreground);
		stroke-width: 3;
		stroke-dasharray: 4 4;
	}

	.placer-zone {
		border-color: transparent;
		/* Plus étroit que le dessin (300 px au moins) : défiler, comme StatChart, plutôt que rogner */
		overflow-x: auto;
	}

	.placer-juste {
		border-color: var(--color-success);
		border-width: 2px;
	}

	.placer-faux {
		border-color: var(--color-destructive);
		border-width: 2px;
	}

	.placer-etiquette {
		border-color: var(--color-border);
		background: var(--color-background);
	}

	/* Barre pas encore construite : bord en pointillés */
	.placer-etiquette-absente {
		border-style: dashed;
	}

	.placer-etiquette-active {
		border-color: var(--color-primary);
		background: var(--color-primary);
		color: var(--color-primary-foreground);
	}

	.placer-etiquette:disabled {
		opacity: 0.4;
	}
</style>
