<!--
	BoxPlotPlacer — boîte à moustaches à construire (```boite-a-moustaches + `placer:`)
	==================================================================================

	L'élève pose les cinq traits de chaque boîte nommée par `placer:` (3-030 ; journal
	`docs/wip/boite-a-moustaches-progress.md` § 5, palier 2).

	- L'axe écrit par le prof (`axe:`), le quadrillage et les boîtes à lire dessinés
	  comme `BoxPlotChart` ; d'une boîte à construire, le nom seul et une ligne en
	  pointillés à sa hauteur.
	- Cinq boutons « Min », « Q1 », « Médiane », « Q3 », « Max » choisissent le trait ;
	  toucher la bande d'une boîte à construire la choisit et pose le trait sous le
	  doigt, glisser l'ajuste. Aimant à la graduation. Un trait posé pour la première
	  fois passe au suivant pas encore posé. Ordre libre : des traits dans le désordre
	  sont simplement faux (décision 5 du 2026-11-01).
	- La boîte se dessine dès que Q1 et Q3 sont posés, chaque moustache dès que ses
	  deux bouts le sont ; la médiane en trait épais.
	- Flèches du clavier (une graduation), Début et Fin (bouts de l'axe) ; le nom
	  accessible donne la valeur posée, jamais l'attendue.
	- Dans une question (`answers`, cinq cases par boîte : minimum, Q1, médiane, Q3,
	  maximum, boîte après boîte) : la réponse d'une case est la valeur posée (`11`,
	  `12.5`), `''` tant que le trait ne l'est pas. Faux : une phrase par trait faux
	  (`boxTraitMistake`) et la boîte juste à côté (sauf énoncé d'évaluation masqué :
	  l'attendu n'y est pas).
	- Sans `answers` (aperçu du prof, cours) : le même geste, rien de jugé.

	@module components/markdown/nodes/BoxPlotPlacer
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { COURBE_COLORS } from '$lib/ubumark/types/courbe';
	import type { StatChartNode } from '$lib/ubumark/types/stat-chart';
	import { namedColorScreen, namedColorTable } from '$lib/theme/named-colors';
	import {
		buildStatChartScene,
		SCATTER_LABEL_CHAR_PX,
		scatterTick
	} from '$lib/ubumark/utils/stat-chart-scene';
	import {
		BOX_TRAIT_BUTTONS,
		BOX_TRAITS,
		boxesToPlace,
		boxTraitMistake,
		boxValueAnswer,
		boxValueAt,
		boxValueOfAnswer,
		CASES_PER_BOX,
		solvedBoxPlotSpec,
		stepValue,
		traitText
	} from '$lib/ubumark/utils/boxplot-placer';
	import { readContentLocale } from '../content-locale';
	import type { BuildCase } from './CollectionConstruire.svelte';
	import StatChart from './StatChart.svelte';

	interface Props {
		/** Boîte à construire (`spec.boxPlot.toPlace` et `spec.boxPlot.axis` définis) */
		node: StatChartNode;
		/** Cinq cases par boîte à construire, dans l'ordre des boîtes ; absentes : geste libre */
		answers?: BuildCase[];
		/** false : dessin seul, sans boutons (copie corrigée) */
		showControls?: boolean;
		class?: string;
	}

	let { node, answers, showControls = true, class: className = '' }: Props = $props();

	/** Marges : celles de `BoxPlotChart.svelte` */
	const PAD_MIN = 12;
	const PAD_TOP = 4;
	const TICK_LABELS_PX = 26;
	const AXIS_TITLE_PX = 18;
	/** Couleur des boîtes : palette commune des figures, claire ou sombre */
	const COLOR_VAR = namedColorTable(COURBE_COLORS, namedColorScreen);

	const uid = $props.id();
	const titleId = `${uid}-titre`;
	const locale = readContentLocale();

	let spec = $derived(node.spec!);
	let plot = $derived(spec.boxPlot!);
	// `placer:` exige `axe:` (le parseur refuse sinon)
	let axis = $derived(plot.axis!);
	let scene = $derived.by(() => {
		const built = buildStatChartScene(spec, { locale: locale() });
		return built.kind === 'boite-a-moustaches' ? built : null;
	});
	/** Les boîtes à construire, dans l'ordre des cases */
	let targets = $derived(boxesToPlace(spec));
	/** Rang dans `targets` de chaque boîte du bloc à construire */
	let rankOfBox = $derived(new Map(targets.map((t, k) => [t.index, k])));
	/** Énoncé d'évaluation masqué : pas de boîte juste à montrer */
	let masked = $derived(plot.boxes.some((box) => box.masked));

	/**
	 * Valeurs posées, cinq par boîte à construire : relues quand une case change
	 * (case remise à vide, composant remonté), réassignées à chaque geste
	 */
	let values = $derived<(number | null)[][]>(
		targets.map((_, k) =>
			BOX_TRAITS.map((_, j) => boxValueOfAnswer(answers?.[k * CASES_PER_BOX + j]?.value ?? ''))
		)
	);
	/** Boîte choisie (rang dans `targets`) et trait choisi : le premier pas posé au montage */
	let chosenBox = $state(
		untrack(() =>
			Math.max(
				0,
				values.findIndex((v) => v.includes(null))
			)
		)
	);
	let activeBox = $derived(Math.min(chosenBox, Math.max(0, targets.length - 1)));
	let chosenTrait = $state(untrack(() => Math.max(0, values[activeBox]?.indexOf(null) ?? 0)));
	let locked = $derived(answers?.[0]?.disabled ?? false);
	let dragging = $state(false);
	/** Le trait du geste en cours n'était pas posé : au lâcher, passer au suivant */
	let firstPlacement = false;
	let svg: SVGSVGElement | undefined = $state();

	let verdicts = $derived(
		targets.map((_, k) =>
			BOX_TRAITS.map((_, j) => answers?.[k * CASES_PER_BOX + j]?.isCorrect ?? null)
		)
	);
	let judged = $derived(verdicts.some((row) => row.some((v) => v !== null)));
	let allRight = $derived(judged && verdicts.every((row) => row.every((v) => v === true)));
	let mistakes = $derived(
		targets.flatMap((target, k) =>
			BOX_TRAITS.flatMap((trait, j) =>
				verdicts[k][j] === false
					? [
							boxTraitMistake(
								trait,
								labelOf(values[k][j]),
								targets.length > 1 ? (target.name ?? '') : null
							)
						]
					: []
			)
		)
	);

	let width = $derived(scene?.pixelSize.width ?? 0);
	let height = $derived(scene?.pixelSize.height ?? 0);
	let padLeft = $derived(
		Math.max(PAD_MIN, ((scene?.xTicks[0]?.label.length ?? 0) * SCATTER_LABEL_CHAR_PX) / 2 + 4)
	);
	let padRight = $derived(
		Math.max(PAD_MIN, ((scene?.xTicks.at(-1)?.label.length ?? 0) * SCATTER_LABEL_CHAR_PX) / 2 + 4)
	);
	let axisY = $derived(PAD_TOP + height);
	let viewWidth = $derived(padLeft + width + padRight);
	let viewHeight = $derived(axisY + TICK_LABELS_PX + (scene?.axisTitle ? AXIS_TITLE_PX : 0));
	let color = $derived(scene ? COLOR_VAR[scene.color] : '');

	/** Valeur posée, dite par le lecteur d'écran (jamais l'attendue) */
	let valueText = $derived.by(() => {
		const target = targets[activeBox];
		if (!target) return '';
		const name = target.name === null ? '' : `boîte ${target.name}, `;
		return name + traitText(BOX_TRAITS[chosenTrait], labelOf(values[activeBox]?.[chosenTrait]));
	});

	/** Une valeur écrite selon la langue (`12,5`) ; null : pas posée */
	function labelOf(value: number | null | undefined): string | null {
		return value === null || value === undefined ? null : scatterTick(value, locale()).label;
	}

	/** Abscisse d'écran d'une valeur */
	function sx(value: number): number {
		return padLeft + ((value - axis.min) / (axis.max - axis.min || 1)) * width;
	}

	function place(k: number, j: number, value: number) {
		if (locked) return;
		if (values[k]?.[j] === value) return;
		values = values.map((row, i) => (i === k ? row.map((v, t) => (t === j ? value : v)) : row));
		answers?.[k * CASES_PER_BOX + j]?.onChange(boxValueAnswer(value));
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

	/** Rang de la boîte à construire dont la bande est sous le doigt ; null sinon */
	function bandAt(point: { x: number; y: number }): number | null {
		if (!scene || point.x < padLeft - 8 || point.x > padLeft + width + 8) return null;
		if (point.y < PAD_TOP || point.y > axisY + 8) return null;
		// Une seule boîte à construire : toute la hauteur du dessin la vise
		if (targets.length === 1) return 0;
		const index = scene.bands.findIndex(
			(band, i) =>
				rankOfBox.has(i) &&
				point.y >= PAD_TOP + band.top - 14 &&
				point.y <= PAD_TOP + band.bottom + 10
		);
		return index === -1 ? null : (rankOfBox.get(index) ?? null);
	}

	/** Valeur sous le doigt, aimantée à la graduation */
	function valueAt(point: { x: number }): number {
		return boxValueAt(axis, (point.x - padLeft) / (width || 1));
	}

	/**
	 * iPhone : doigt posé sur une bande à construire, la page ne défile pas, sinon
	 * Safari attend de savoir si le geste défile avant de laisser poser le trait.
	 * Écouteur non passif (Svelte rend `ontouchstart` passif) ; ailleurs, la page défile.
	 */
	function handleTouchStart(event: TouchEvent) {
		if (locked || event.touches.length !== 1) return;
		const point = pointerAt(event.touches[0]);
		if (point !== null && bandAt(point) !== null) event.preventDefault();
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
		const k = bandAt(point);
		if (k === null) return;
		chosenBox = k;
		firstPlacement = values[k]?.[chosenTrait] === null;
		place(k, chosenTrait, valueAt(point));
		dragging = true;
		svg?.setPointerCapture?.(event.pointerId);
	}

	function handlePointerMove(event: PointerEvent) {
		if (!dragging) return;
		const point = pointerAt(event);
		if (point !== null) place(activeBox, chosenTrait, valueAt(point));
	}

	function handlePointerUp() {
		if (!dragging) return;
		dragging = false;
		if (!firstPlacement) return;
		firstPlacement = false;
		// Trait posé pour la première fois : le suivant pas encore posé, s'il y en a un
		const row = values[activeBox] ?? [];
		const next = [...row.keys()]
			.map((t) => (chosenTrait + 1 + t) % CASES_PER_BOX)
			.find((t) => row[t] === null);
		if (next !== undefined) chosenTrait = next;
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (locked || !targets[activeBox]) return;
		const current = values[activeBox]?.[chosenTrait] ?? null;
		const moves: Record<string, () => number> = {
			ArrowRight: () => stepValue(axis, current, 1),
			ArrowUp: () => stepValue(axis, current, 1),
			ArrowLeft: () => stepValue(axis, current, -1),
			ArrowDown: () => stepValue(axis, current, -1),
			Home: () => axis.min,
			End: () => axis.max
		};
		const move = moves[event.key];
		if (!move) return;
		event.preventDefault();
		place(activeBox, chosenTrait, move());
	}
</script>

{#if scene}
	<figure class="boite-placer my-2 flex flex-col items-center gap-2 {className}">
		{#if scene.title}
			<figcaption class="stat-titre">{scene.title}</figcaption>
		{/if}

		{#if showControls}
			<div class="flex flex-col items-center gap-2">
				{#if targets.length > 1}
					<div
						class="flex flex-wrap justify-center gap-1"
						role="group"
						aria-label="Boîte à construire"
					>
						{#each targets as target, k (target.index)}
							<button
								type="button"
								class="placer-etiquette flex min-h-11 items-center justify-center rounded-md border px-3 text-sm font-semibold"
								class:placer-etiquette-active={k === activeBox}
								class:placer-etiquette-absente={values[k]?.includes(null)}
								aria-pressed={k === activeBox}
								disabled={locked}
								onclick={() => (chosenBox = k)}
							>
								{target.name ?? ''}
							</button>
						{/each}
					</div>
				{/if}
				<div class="flex flex-wrap justify-center gap-1" role="group" aria-label="Trait à placer">
					{#each BOX_TRAITS as trait, j (trait)}
						<button
							type="button"
							class="placer-etiquette flex min-h-11 min-w-11 items-center justify-center rounded-md border px-3 text-sm font-semibold"
							class:placer-etiquette-active={j === chosenTrait}
							class:placer-etiquette-absente={values[activeBox]?.[j] === null}
							aria-pressed={j === chosenTrait}
							disabled={locked}
							onclick={() => (chosenTrait = j)}
						>
							{BOX_TRAIT_BUTTONS[trait]}
						</button>
					{/each}
				</div>
			</div>
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
				class="stat-svg boite-dessin"
				class:placer-verrouille={locked}
				role="slider"
				tabindex={locked ? -1 : 0}
				aria-labelledby={titleId}
				aria-valuemin={axis.min}
				aria-valuemax={axis.max}
				aria-valuenow={values[activeBox]?.[chosenTrait] ?? undefined}
				aria-valuetext={valueText}
				aria-disabled={locked}
				onpointerdown={handlePointerDown}
				onpointermove={handlePointerMove}
				onpointerup={handlePointerUp}
				onpointercancel={handlePointerUp}
				onkeydown={handleKeyDown}
			>
				<title id={titleId}
					>Boîte à moustaches à construire{targets[activeBox]?.name
						? ` : boîte ${targets[activeBox].name}`
						: ''}</title
				>

				<!-- Quadrillage : un trait vertical léger à chaque graduation -->
				<g aria-hidden="true">
					{#each scene.xTicks as tick, i (i)}
						<line
							class="stat-grille"
							x1={sx(tick.value)}
							y1={PAD_TOP}
							x2={sx(tick.value)}
							y2={axisY}
						/>
					{/each}
				</g>

				{#each scene.boxes as box, i (i)}
					{@const band = scene.bands[i]}
					{@const top = PAD_TOP + band.top}
					{@const bottom = PAD_TOP + band.bottom}
					{@const middle = (top + bottom) / 2}
					{@const cap = (bottom - top) / 4}
					{@const k = rankOfBox.get(i)}
					<!-- Boîte à lire : ses valeurs ; à construire : les traits posés par l'élève -->
					{@const shown = k === undefined ? box.values : values[k]}
					{@const [min, q1, , q3, max] = shown}
					{@const active = k !== undefined && k === activeBox && showControls && !locked}
					<g aria-hidden="true" style:stroke={color}>
						{#if active}
							<rect
								class="boite-bande-active"
								x={padLeft}
								y={top - 4}
								{width}
								height={bottom - top + 8}
							/>
						{/if}
						{#if box.name !== null && band.nameY !== null}
							<text class="stat-nom-boite" x={padLeft} y={PAD_TOP + band.nameY}>{box.name}</text>
						{/if}
						{#if k !== undefined}
							<line
								class="boite-attente"
								x1={padLeft}
								y1={middle}
								x2={padLeft + width}
								y2={middle}
							/>
						{/if}
						{#if min !== null && q1 !== null}
							<line class="stat-moustache" x1={sx(min)} y1={middle} x2={sx(q1)} y2={middle} />
						{/if}
						{#if q3 !== null && max !== null}
							<line class="stat-moustache" x1={sx(q3)} y1={middle} x2={sx(max)} y2={middle} />
						{/if}
						{#if q1 !== null && q3 !== null}
							<rect
								class="stat-boite"
								x={sx(Math.min(q1, q3))}
								y={top}
								width={Math.abs(sx(q3) - sx(q1))}
								height={bottom - top}
								style:fill="color-mix(in oklab, {color} 22%, var(--color-background))"
							/>
						{/if}
						<!-- Les traits : bouts des moustaches, bords de la boîte, médiane -->
						{#each shown as value, j (j)}
							{#if value !== null}
								{@const edge = j === 0 || j === 4}
								<line
									class={j === 2 ? 'stat-mediane' : 'stat-moustache-bout'}
									class:boite-trait-actif={active && j === chosenTrait}
									x1={sx(value)}
									y1={edge ? top + cap : top}
									x2={sx(value)}
									y2={edge ? bottom - cap : bottom}
								/>
							{/if}
						{/each}
						{#if active && shown[chosenTrait] !== null}
							<text
								class="boite-trait-nom"
								x={sx(shown[chosenTrait]!)}
								y={top - 6}
								text-anchor="middle">{BOX_TRAIT_BUTTONS[BOX_TRAITS[chosenTrait]]}</text
							>
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
						<text
							class="stat-titre-axe"
							x={padLeft + width / 2}
							y={viewHeight - 4}
							text-anchor="middle">{scene.axisTitle}</text
						>
					{/if}
				</g>
			</svg>
		</div>

		{#if judged}
			<p class="sr-only" role="status">
				{allRight ? 'réponse juste' : 'réponse fausse'}
			</p>
		{/if}

		{#if judged && !allRight}
			{#each mistakes as mistake (mistake)}
				<p class="text-sm">{mistake}</p>
			{/each}
			{#if !masked}
				<div class="placer-correction flex w-full flex-col items-center gap-1">
					<p class="text-sm font-medium text-muted-foreground">Correction</p>
					<!-- La boîte juste : toutes les boîtes dessinées -->
					<StatChart node={{ ...node, spec: solvedBoxPlotSpec(spec) }} class="w-full" />
				</div>
			{/if}
		{/if}
	</figure>
{/if}

<style>
	.stat-titre {
		text-align: center;
		font-weight: 600;
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

	.boite-dessin {
		cursor: pointer;
		/* iPhone : un appui long ouvrirait la loupe et une sélection de texte */
		-webkit-user-select: none;
		user-select: none;
		-webkit-touch-callout: none;
	}

	.boite-dessin:focus-visible {
		outline: 2px solid var(--color-ring);
		outline-offset: 2px;
	}

	.placer-verrouille {
		cursor: default;
	}

	.stat-svg text {
		fill: var(--color-foreground);
		stroke: none;
		font-size: 11px;
	}

	.stat-grille {
		stroke: color-mix(in oklab, var(--color-foreground) 30%, transparent);
		stroke-width: 0.75;
	}

	.stat-moustache,
	.stat-moustache-bout,
	.stat-boite {
		stroke-width: 1.5;
	}

	.stat-mediane {
		stroke-width: 3;
	}

	/* Trait choisi : la couleur d'accent de l'interface */
	.boite-trait-actif {
		stroke: var(--color-primary);
		stroke-width: 3.5;
	}

	.stat-svg .boite-trait-nom {
		fill: var(--color-primary);
		font-size: 10px;
		font-weight: 600;
	}

	/* Bande de la boîte choisie : un fond léger */
	.boite-bande-active {
		fill: color-mix(in oklab, var(--color-primary) 8%, transparent);
		stroke: none;
	}

	/* Boîte à construire : une ligne en pointillés à sa hauteur */
	.boite-attente {
		stroke: var(--color-muted-foreground);
		stroke-width: 1;
		stroke-dasharray: 3 4;
	}

	.stat-svg .stat-nom-boite {
		font-weight: 600;
	}

	.stat-axes line {
		stroke: var(--color-foreground);
		stroke-width: 1.1;
	}

	.stat-svg .stat-titre-axe {
		font-weight: 600;
	}

	.placer-zone {
		border-color: transparent;
		/* Plus étroit que le dessin (300 px au moins) : défiler plutôt que rogner */
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

	/* Trait (boîte) pas encore posé : bord en pointillés */
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
