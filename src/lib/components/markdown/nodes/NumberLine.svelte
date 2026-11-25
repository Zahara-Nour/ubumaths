<!--
	NumberLine Component
	====================

	Renders a number line (droite graduée) as SVG.

	Features:
	- Horizontal line with minor/major graduations
	- Labels under major graduations via foreignObject + math-span
	- Hidden labels shown as "?"
	- Named points above the line (colored circles + labels)
	- Colored segments (demi-droites comprises) with bracket endpoints
	- Optional arrows at line endpoints
	- Linear or logarithmic scale
	- Thème clair / sombre : tokens d'app.css ; couleurs d'auteur de la palette
	  commune (`resolveNumberLineColors`, partagée avec le PDF)
	- Avertissements d'auteur (couleur inconnue, hex peu lisible en sombre),
	  visibles du prof seulement (`showErrors`, ou contexte d'édition)
	- Nombres écrits trop serrés pour la largeur (téléphone) : un sur deux, traits gardés
	  (`thinLabels`)
	- Largeur réelle : dessinée en px à la largeur du conteneur (pas de viewBox
	  réduite) ; chiffres, points, traits à taille fixe, seul l'écart entre
	  graduations se resserre (droite à placer : avertissement téléphone dans
	  `NumberLinePlacer`).
	- Droite à placer (`placer:`) : `NumberLinePlacer.svelte` (l'élève pose ses points)
	- Droite à représenter (`representer:`) : `NumberLineRepresenter.svelte` (l'élève
	  dessine l'intervalle)
	- Zooms (`zoom:`, outil n° 54) : une droite agrandie par zoom, `ZOOM_ROW_GAP` px sous la
	  précédente, reliée par deux pointillés ; les points sur toutes les droites où ils tombent

	@module components/markdown/nodes/NumberLine
-->
<script lang="ts">
	import '#lib/utils/mathlive-styles.ts';
	import 'mathlive';
	import type {
		NumberLineConfig,
		NumberLineNode,
		NumberLinePoint,
		NumberLineSegment
	} from '#lib/ubumark/types/number-line.ts';
	import {
		NL_LAYOUT,
		NL_MIN_WIDTH,
		numVal,
		valLatex,
		valueToX,
		computeGraduations,
		thinLabels,
		computeLineExtents,
		pointsInside,
		resolveNumberLineColors,
		bracketDirection,
		bracketPoints,
		segmentLevels,
		type Graduation
	} from '#lib/ubumark/utils/number-line-render.ts';
	import { readAuthoringErrors } from '../authoring-errors';
	import { readContentLocale } from '../content-locale';
	import { toLocaleDecimal } from '#lib/utils/french-math.ts';
	import NumberLinePlacer from './NumberLinePlacer.svelte';
	import NumberLineRepresenter from './NumberLineRepresenter.svelte';
	import type { BuildCase } from './CollectionConstruire.svelte';

	interface Props {
		node: NumberLineNode;
		/** Montrer les avertissements d'auteur (par défaut : contexte d'édition) */
		showErrors?: boolean;
		/** Droite à placer dans une question : ses cases, une par point */
		answers?: BuildCase[];
		/** Points posés SUR la droite, plus gros (droite à placer : le point de l'élève) */
		pointsOnLine?: boolean;
		class?: string;
	}

	let { node, showErrors, answers, pointsOnLine = false, class: className = '' }: Props = $props();

	/** Point posé sur la droite : plus gros, il doit se voir sur la graduation */
	const ON_LINE_POINT_RADIUS = 7;
	/** Écart (px) entre les noms de points posés au même endroit, côte à côte */
	const SHARED_LABEL_GAP = 14;

	const authoring = readAuthoringErrors();
	// Langue du contenu (séparateur décimal des graduations), posée par MarkdownRenderer
	const contentLocale = readContentLocale();
	let errorsVisible = $derived(showErrors ?? authoring());

	const {
		LINE_Y,
		MINOR_TICK_HEIGHT,
		MAJOR_TICK_HEIGHT,
		LABEL_Y_OFFSET,
		POINT_RADIUS,
		POINT_Y_OFFSET,
		POINT_LABEL_Y_OFFSET,
		SEGMENT_LEVEL_GAP,
		ARROW_SIZE
	} = NL_LAYOUT;

	const SVG_HEIGHT = 120;
	/** Écart vertical (px) entre une droite et son zoom */
	const ZOOM_ROW_GAP = 110;
	/** Départ d'un pointillé sous un nombre écrit (px sous le haut de l'étiquette) */
	const LINK_BELOW_LABEL = 16;

	// =========================================================================
	// COMPUTED VALUES
	// =========================================================================

	let startNum = $derived(numVal(node.config.start));
	let endNum = $derived(numVal(node.config.end));
	let scale = $derived(node.config.scale ?? 'linear');

	/** Largeur du conteneur (0 avant le montage : la largeur de toujours) */
	let containerWidth = $state(0);
	let width = $derived(
		containerWidth > 0 ? Math.max(containerWidth, NL_MIN_WIDTH) : NL_LAYOUT.SVG_WIDTH
	);

	/** Couleurs sûres (variable du thème ou hex validé) et avertissements */
	let colors = $derived(resolveNumberLineColors(node));

	// =========================================================================
	// POINTS
	// =========================================================================

	/** Les points d'une droite (`config`) dont l'axe est à `lineY`, noms côte à côte s'ils se partagent */
	function placePoints(points: NumberLinePoint[], config: NumberLineConfig, lineY: number) {
		const rowStart = numVal(config.start);
		const rowEnd = numVal(config.end);
		const rowScale = config.scale ?? 'linear';
		const xs = points.map((p: NumberLinePoint) =>
			valueToX(numVal(p.value), rowStart, rowEnd, rowScale, width)
		);
		/** Points au même endroit : leurs noms côte à côte, centrés sur le point */
		const sharing = (x: number) => xs.filter((other) => Math.abs(other - x) < 0.5);
		return points.map((p: NumberLinePoint, i: number) => {
			const x = xs[i];
			const rank = xs.slice(0, i).filter((other) => Math.abs(other - x) < 0.5).length;
			const shift = (rank - (sharing(x).length - 1) / 2) * SHARED_LABEL_GAP;
			return {
				x,
				labelX: x + shift,
				y: pointsOnLine ? lineY : lineY + POINT_Y_OFFSET,
				label: p.label,
				latex: valLatex(p.value),
				// Couleur du point écrit (même point sur plusieurs droites : même couleur)
				color: colors.points[node.points.indexOf(p)].screen
			};
		});
	}

	/** La graduation de `value` porte-t-elle un nombre écrit à l'écran (étiquettes éclaircies) ? */
	function isLabeledOnScreen(
		graduations: Graduation[],
		config: NumberLineConfig,
		value: number
	): boolean {
		const tolerance = numVal(config.step) * 0.001;
		return graduations.some((g) => g.label !== null && Math.abs(g.value - value) < tolerance);
	}

	// =========================================================================
	// DROITES (la principale, puis un zoom chacune plus bas)
	// =========================================================================

	let rows = $derived(
		[node.config, ...(node.zooms ?? [])].map((config, k) => {
			const lineY = LINE_Y + k * ZOOM_ROW_GAP;
			const points =
				k === 0 ? node.points : pointsInside(node.points, numVal(config.start), numVal(config.end));
			return {
				config,
				lineY,
				// Nombres écrits trop serrés pour la largeur : un sur deux (traits tous gardés)
				graduations: thinLabels(computeGraduations(config, width)),
				points: placePoints(points, config, lineY),
				...computeLineExtents(k === 0 && config.arrows, width)
			};
		})
	);

	/** Deux pointillés par zoom : des bouts agrandis sur la droite du dessus aux bouts du zoom */
	let zoomLinks = $derived(
		rows.slice(1).flatMap((row, k) => {
			const above = rows[k];
			const aboveStart = numVal(above.config.start);
			const aboveEnd = numVal(above.config.end);
			const bottom = row.lineY - MAJOR_TICK_HEIGHT / 2;
			/** Sous la graduation, ou sous son nombre écrit s'il y en a un */
			const top = (v: NumberLineConfig['start']) =>
				isLabeledOnScreen(above.graduations, above.config, numVal(v))
					? above.lineY + LABEL_Y_OFFSET + LINK_BELOW_LABEL
					: above.lineY + MAJOR_TICK_HEIGHT / 2;
			const fromX = (v: NumberLineConfig['start']) =>
				valueToX(numVal(v), aboveStart, aboveEnd, 'linear', width);
			return [
				{
					x1: fromX(row.config.start),
					y1: top(row.config.start),
					x2: row.lineStartX,
					y2: bottom
				},
				{ x1: fromX(row.config.end), y1: top(row.config.end), x2: row.lineEndX, y2: bottom }
			];
		})
	);

	let zoomCount = $derived(node.zooms?.length ?? 0);

	// =========================================================================
	// SEGMENTS
	// =========================================================================

	/** Demi-hauteur et becs des crochets (px) */
	const BRACKET_HEIGHT = 9;
	const BRACKET_BEAK = 5;

	/** Bout de la droite (pointe de la flèche) : là où s'arrête une borne infinie */
	let { lineStartX, lineEndX } = $derived(computeLineExtents(node.config.arrows, width));

	/** Étage de chaque segment : sur l'axe, plus haut s'il en chevauche un autre */
	let levels = $derived(segmentLevels(node.segments));

	let renderedSegments = $derived(
		node.segments.map((s: NumberLineSegment, i: number) => {
			const x1 = s.startInfinite
				? lineStartX
				: valueToX(numVal(s.start), startNum, endNum, scale, width);
			const x2 = s.endInfinite ? lineEndX : valueToX(numVal(s.end), startNum, endNum, scale, width);
			const y = LINE_Y - levels[i] * SEGMENT_LEVEL_GAP;
			/** Crochet d'une borne finie, en chemin SVG */
			const bracket = (x: number, side: 'start' | 'end', open: boolean) =>
				bracketPoints(x, y, bracketDirection(side, open), BRACKET_HEIGHT, BRACKET_BEAK)
					.map(([px, py], k) => `${k === 0 ? 'M' : 'L'} ${px} ${py}`)
					.join(' ');
			return {
				x1,
				x2,
				y,
				brackets: [
					...(s.startInfinite ? [] : [bracket(x1, 'start', s.startOpen)]),
					...(s.endInfinite ? [] : [bracket(x2, 'end', s.endOpen)])
				],
				color: colors.segments[i].screen
			};
		})
	);

	// =========================================================================
	// HEIGHT
	// =========================================================================

	/** Les segments sont sur l'axe ou au-dessus : seule une droite de zoom ajoute de la hauteur */
	let svgHeight = $derived(SVG_HEIGHT + zoomCount * ZOOM_ROW_GAP);
</script>

{#if node.placer !== undefined}
	<NumberLinePlacer {node} {answers} {showErrors} class={className} />
{:else if node.representer !== undefined}
	<NumberLineRepresenter {node} {answers} {showErrors} class={className} />
{:else}
	<div
		class="number-line-container {className}"
		role="img"
		aria-label={zoomCount === 0
			? 'Droite graduée'
			: `Droite graduée, avec ${zoomCount} zoom${zoomCount > 1 ? 's' : ''}`}
		bind:clientWidth={containerWidth}
	>
		<svg viewBox="0 0 {width} {svgHeight}" {width} height={svgHeight} class="number-line-svg">
			<!-- Axes : la droite principale, puis ses zooms -->
			{#each rows as row (row.lineY)}
				<line
					class="nl-axis"
					x1={row.lineStartX}
					y1={row.lineY}
					x2={row.lineEndX}
					y2={row.lineY}
					stroke-width="1.5"
				/>
			{/each}

			<!-- Zooms : deux pointillés depuis le morceau agrandi -->
			{#each zoomLinks as link, i (i)}
				<line
					class="nl-zoom-link"
					x1={link.x1}
					y1={link.y1}
					x2={link.x2}
					y2={link.y2}
					stroke-width="1"
					stroke-dasharray="4 3"
				/>
			{/each}

			<!-- Segments : sur l'axe, sous les flèches et les graduations -->
			{#each renderedSegments as seg, i (i)}
				<line
					class="nl-segment"
					x1={seg.x1}
					y1={seg.y}
					x2={seg.x2}
					y2={seg.y}
					style:stroke={seg.color}
					stroke-width="4"
				/>
				<!-- Extrémités : crochets (notation française), aucun sur une borne infinie -->
				{#each seg.brackets as d, k (k)}
					<path
						class="nl-bracket"
						{d}
						fill="none"
						style:stroke={seg.color}
						stroke-width="2.5"
						stroke-linejoin="miter"
					/>
				{/each}
			{/each}

			<!-- Arrows (par-dessus le trait d'une demi-droite) -->
			{#if node.config.arrows}
				<!-- Left arrow -->
				<path
					class="nl-arrow"
					d="M {lineStartX} {LINE_Y} L {lineStartX + ARROW_SIZE} {LINE_Y -
						ARROW_SIZE / 2} L {lineStartX + ARROW_SIZE} {LINE_Y + ARROW_SIZE / 2} Z"
				/>
				<!-- Right arrow -->
				<path
					class="nl-arrow"
					d="M {lineEndX} {LINE_Y} L {lineEndX - ARROW_SIZE} {LINE_Y - ARROW_SIZE / 2} L {lineEndX -
						ARROW_SIZE} {LINE_Y + ARROW_SIZE / 2} Z"
				/>
			{/if}

			{#each rows as row (row.lineY)}
				<!-- Graduations -->
				{#each row.graduations as grad (grad.x)}
					{@const tickH = grad.isMajor ? MAJOR_TICK_HEIGHT : MINOR_TICK_HEIGHT}
					<line
						class="nl-tick"
						x1={grad.x}
						y1={row.lineY - tickH / 2}
						x2={grad.x}
						y2={row.lineY + tickH / 2}
						stroke-width={grad.isMajor ? 1.5 : 1}
					/>

					<!-- Labels -->
					{#if grad.label !== null}
						<!-- 45 px : une fraction (23/10) en math-field en fait 42 ; 100 px de large, centrés :
						     « 99 000 000 » en fait 64 (le CM2 gradue jusqu'aux millions), le SVG déborde -->
						<foreignObject
							x={grad.x - 50}
							y={row.lineY + LABEL_Y_OFFSET - 5}
							width="100"
							height="45"
						>
							<div class="number-line-label" class:hidden-label={grad.hidden}>
								{#if grad.hidden}
									<span class="hidden-mark">?</span>
								{:else}
									<math-field
										read-only
										style="font-size: 0.75rem; display: inline-block; border: none; background: transparent; min-width: 0; padding: 0;"
									>
										{toLocaleDecimal(grad.label, contentLocale())}
									</math-field>
								{/if}
							</div>
						</foreignObject>
					{/if}
				{/each}

				<!-- Points -->
				{#each row.points as point (point.label)}
					<!-- Point circle -->
					<circle
						class="nl-point"
						cx={point.x}
						cy={point.y}
						r={pointsOnLine ? ON_LINE_POINT_RADIUS : POINT_RADIUS}
						style:fill={point.color}
						stroke-width="1.5"
					/>
					<!-- Point label -->
					<foreignObject
						x={point.labelX - 25}
						y={point.y + POINT_LABEL_Y_OFFSET + 5}
						width="50"
						height="20"
					>
						<div class="point-label" style:color={point.color}>
							{point.label}
						</div>
					</foreignObject>
				{/each}
			{/each}
		</svg>
	</div>

	{#if errorsVisible && colors.warnings.length > 0}
		<ul class="nl-warnings mt-1 text-xs text-warning">
			{#each colors.warnings as message, i (i)}
				<li>Droite graduée — {message}</li>
			{/each}
		</ul>
	{/if}
{/if}

<style>
	.number-line-container {
		width: 100%;
		/* jamais plus large que son parent, même dans une colonne flex / grille */
		max-width: min(700px, 100%);
		min-width: 0;
		margin: 0.5rem auto;
	}

	.number-line-svg {
		display: block;
		overflow: visible;
	}

	/* Habillage sur les tokens du thème (light-dark() dans app.css) */
	.nl-axis,
	.nl-tick,
	.nl-zoom-link {
		stroke: var(--color-foreground);
	}

	.nl-arrow {
		fill: var(--color-foreground);
	}

	/* Halo des points : la couleur du fond */
	.nl-point {
		stroke: var(--color-background);
	}

	.number-line-label {
		text-align: center;
		font-size: 0.75rem;
		color: var(--color-foreground);
		line-height: 1;
	}

	.hidden-mark {
		font-weight: bold;
		color: var(--color-fig-rouge);
		font-size: 0.85rem;
	}

	.point-label {
		text-align: center;
		font-weight: 600;
		font-size: 0.8rem;
		line-height: 1;
	}
</style>
