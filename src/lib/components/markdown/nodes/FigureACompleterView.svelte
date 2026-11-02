<!--
	FigureACompleterView — case « figure » d'un bloc ```figure-a-completer (chargé à la demande)
	=========================================================================================

	La figure de départ (`FigureBlockView`, même SVG qu'en statique et qu'au PDF)
	et, par-dessus, le tracé de l'élève. Comportements validés par David le
	2026-10-25 (`docs/wip/geometrie-validation-progress.md` § 5) :

	- toucher un point puis un autre trace la droite, qui va jusqu'aux bords ;
	  près d'un point, le toucher est aimanté (`SNAP_RADIUS_PX` à l'écran) ;
	- outil segment sur quadrillage (CP-060, § 9) : chaque toucher va au nœud le
	  plus proche, le segment s'arrête à ses deux bouts ;
	- outil point (chantier `controles-figure`, lot 2a) : un toucher place un
	  point (au nœud sur quadrillage) ; la correction montre chaque point attendu
	  avec son nom et, pour un symétrique, [AA'] codé ;
	- instruments sur papier uni (lot 2b, `docs/wip/controles-figure-progress.md`
	  § 7) : plusieurs outils = une palette (Règle, Équerre, Compas…) ; équerre :
	  toucher une droite (surlignée), puis un point → la perpendiculaire ; compas :
	  le centre, puis un point → le cercle ; aimantation : point → intersection
	  de deux traits → sur un trait → libre ;
	- clavier : les points nommés sont des boutons (Tab, puis Entrée ou Espace),
	  avec les instruments les intersections aussi, et les droites pour l'équerre ;
	  sur quadrillage, un curseur se déplace de nœud en nœud avec les flèches ;
	- « Effacer » : le départ ou la droite en attente, sinon le dernier objet ;
	- après Valider : juste → ses droites en vert ; faux → la bonne droite en
	  pointillés par-dessus (le message est celui de l'écran) ;
	- `showSolution` (mode correction) : la figure et la bonne droite ;
	- figure de travail (```figure-de-travail, `construction.work`) : rien n'est
	  noté ; une fois la saisie finie (Valider, copie), les traits sont gris.

	Importé UNIQUEMENT par `FigureBlock` via `import()`. Il inscrit le calcul des
	positions (`positions-setup`) dont le juge a besoin à la validation.

	@module components/markdown/nodes/FigureACompleterView
-->
<script lang="ts">
	import type { FigureNode } from '$lib/ubumark/types/figure';
	import type { FigureScene } from '$lib/ubumark/utils/figure-scene';
	import { createTransformer } from '$lib/geometry-core/viewport/viewport';
	// Inscrit aussi le calcul des positions du juge (effet de bord voulu, cf. positions.ts)
	import {
		allNamedPointPositions,
		figureShapes,
		namedPointPositions
	} from '$lib/questions/construction/positions-setup';
	import {
		CHECK_TOOL,
		INSTRUMENT_TOOLS,
		type ConstructionTool
	} from '$lib/ubumark/types/construction';
	import {
		intersectionsOf,
		isInFrame,
		isStraight,
		straightAt,
		traitsOfObjects,
		type SnapTargets,
		type StraightTrait,
		type Trait
	} from '$lib/questions/construction/instruments';
	import {
		isDrawnCircle,
		isDrawnLine,
		isDrawnPoint,
		parseConstructionAnswer,
		serializeConstructionAnswer,
		type DrawnLine
	} from '$lib/questions/construction/answer';
	import type { Position } from '$lib/questions/construction/judge';
	import {
		constructionExpected,
		constructionPositions
	} from '$lib/questions/construction/positions';
	import type { ExpectedPoints, PointSolution } from '$lib/questions/construction/point';
	import {
		SNAP_RADIUS_PX,
		addTap,
		canErase,
		cancelPending,
		chooseGuide,
		clipLineToWindow,
		eraseLast,
		snapTap,
		snapWithInstruments,
		snapToGrid,
		solutionCodages,
		solutionLines,
		solutionPoints,
		type ConstructionAnswerInput,
		type Drawing
	} from '$lib/questions/construction/drawing';
	import { Button } from '$lib/components/ui/button';
	import FigureBlockView from './FigureBlockView.svelte';

	interface Props {
		node: FigureNode;
		errorsVisible: boolean;
		/** Case de la question : l'élève trace */
		answer?: ConstructionAnswerInput;
		/** Mode correction : la bonne droite */
		showSolution?: boolean;
		class?: string;
	}

	let {
		node,
		errorsVisible,
		answer,
		showSolution = false,
		class: className = ''
	}: Props = $props();

	/**
	 * Départ d'une droite, en attente du second toucher (jamais dans la réponse),
	 * lié au bloc où il a été posé : la vue peut rester montée d'une question à
	 * la suivante (`{#each}` de `FillBlanksInput` indexé par position)
	 */
	// `raw` : sans proxy, le nœud reste comparable par référence
	let pending = $state.raw<{
		node: FigureNode;
		at: Position | null;
		guide?: StraightTrait | null;
	} | null>(null);
	/** Outil choisi dans la palette, lié au bloc comme `pending` */
	let chosen = $state.raw<{ node: FigureNode; tool: ConstructionTool } | null>(null);
	/** « Touche d'abord une droite. » (équerre), lié au bloc */
	let hint = $state.raw<{ node: FigureNode; text: string } | null>(null);

	let interactive = $derived(answer !== undefined && !answer.disabled);
	let objects = $derived(parseConstructionAnswer(answer?.value ?? '') ?? []);
	let lines = $derived(objects.filter(isDrawnLine));
	let placedPoints = $derived(objects.filter(isDrawnPoint));
	let circles = $derived(objects.filter(isDrawnCircle));
	// Plus de saisie (Valider, correction) ou autre bloc : le départ en attente disparaît
	let mine = $derived(interactive && pending?.node === node ? pending : null);
	let drawing: Drawing = $derived({
		objects,
		start: mine?.at ?? null,
		...(mine?.guide && { guide: mine.guide })
	});
	let corrected = $derived(answer?.isCorrect === false || showSolution);
	let checks = $derived(node.construction?.checks ?? []);
	let tools = $derived<ConstructionTool[]>(node.construction?.tools ?? ['droite']);
	/** Outil de départ : celui de la vérification s'il est dans la palette (le point, le segment) */
	let firstTool = $derived.by((): ConstructionTool => {
		const own = checks[0] ? CHECK_TOOL[checks[0].kind] : null;
		return own && tools.includes(own) ? own : (tools[0] ?? 'droite');
	});
	let tool = $derived(chosen?.node === node ? chosen.tool : firstTool);
	/** Palette avec équerre ou compas : aimantation des instruments (hors quadrillage) */
	let instruments = $derived(tools.some((t) => INSTRUMENT_TOOLS.includes(t)));
	let hintText = $derived(interactive && hint?.node === node ? hint.text : '');
	/** Figure de travail : traits gris une fois la saisie finie, jamais de verdict */
	let workDone = $derived(node.construction?.work === true && answer !== undefined && !interactive);
	/** Droite à construire (lot 3) : sur quadrillage, tous ses outils vont aux nœuds */
	let lineCheck = $derived(checks.some((c) => c.kind === 'droite'));
	/** Quadrillage + segment ou point (ou droite à construire) : touchers sur les nœuds (sinon aimantation sur les points) */
	let grid = $derived(
		tool === 'segment' || tool === 'point' || lineCheck ? node.header.grid : null
	);
	/** Points à placer, montrés à la correction (calculés à part : jamais aimantés) */
	let pointSolutions = $derived.by((): PointSolution[] => {
		if (!corrected || !checks.some((c) => c.kind === 'point')) return [];
		try {
			return solutionPoints(
				checks,
				constructionExpected(node.source),
				constructionPositions(node.source)
			);
		} catch {
			// Figure qui ne se construit pas : l'erreur est celle de la figure
			return [];
		}
	});
	/** Droites et points attendus (droite à construire, lot 3) ; rien si la figure ne se construit pas */
	function expectedOf(): ExpectedPoints | undefined {
		try {
			return constructionExpected(node.source);
		} catch {
			return undefined;
		}
	}
	/** Curseur clavier sur le quadrillage (nœud), affiché quand la zone a le focus */
	let cursor = $state.raw<Position | null>(null);

	function apply(next: Drawing) {
		pending = next.start || next.guide ? { node, at: next.start, guide: next.guide ?? null } : null;
		hint = null;
		if (next.objects !== drawing.objects) {
			answer?.onChange(serializeConstructionAnswer(next.objects));
		}
	}

	function tapAt(position: Position) {
		if (!interactive) return;
		apply(addTap(drawing, position, tool));
	}

	function selectTool(next: ConstructionTool) {
		chosen = { node, tool: next };
		apply(cancelPending(drawing));
	}

	/** Équerre : la droite à longer */
	function chooseLine(guide: StraightTrait) {
		if (!interactive) return;
		apply(chooseGuide(drawing, guide));
	}

	/** Traits visibles : ceux de la figure et ceux de l'élève */
	function traitsOf(scene: FigureScene): Trait[] {
		return [...figureShapes(scene, node.header).traits, ...traitsOfObjects(objects)];
	}

	/** Ce sur quoi les instruments s'aimantent ; intersections dans la fenêtre seulement */
	function snapTargets(scene: FigureScene): SnapTargets {
		const traits = traitsOf(scene);
		const { xMin, xMax, yMin, yMax } = scene.viewport;
		return {
			points: [...namedPointPositions(scene).values(), ...placedPoints],
			// Marge de `isInFrame` : une intersection construite sur le bord reste atteignable (revue)
			intersections: intersectionsOf(traits).filter((p) =>
				isInFrame(p, { xMin, xMax, yMin, yMax })
			),
			traits
		};
	}

	const TOOL_LABELS: Record<ConstructionTool, string> = {
		droite: 'Règle',
		segment: 'Segment',
		point: 'Point',
		equerre: 'Équerre',
		compas: 'Compas'
	};

	/** Toucher (doigt, souris) : coordonnées de la fenêtre, puis de la figure */
	function handleTap(event: MouseEvent, scene: FigureScene, width: number, height: number) {
		const target = event.currentTarget;
		if (!(target instanceof SVGGraphicsElement)) return;
		const matrix = target.getScreenCTM();
		if (!matrix) return;
		const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
		const transformer = createTransformer(scene.viewport, width, height);
		const math = transformer.svgToMath(local.x, local.y);
		// Rayon à l'écran → unités de la fenêtre (échelle d'affichage) → unités de la figure
		const radius = SNAP_RADIUS_PX / Math.abs(matrix.a) / transformer.scaleX;
		if (grid) {
			// Équerre (droite à construire sur quadrillage) : d'abord la droite à longer
			if (tool === 'equerre' && !drawing.guide) {
				const guide = straightAt(math, traitsOf(scene), radius);
				if (guide) chooseLine(guide);
				else if (interactive) hint = { node, text: 'Touche d’abord une droite.' };
				return;
			}
			const nearest = snapToGrid(math, grid, scene.viewport);
			// Le curseur clavier (s'il est là) suit le dernier toucher
			if (cursor) cursor = nearest;
			tapAt(nearest);
			return;
		}
		if (!instruments) {
			tapAt(snapTap(math, namedPointPositions(scene), radius));
			return;
		}
		const targets = snapTargets(scene);
		if (tool === 'equerre' && !drawing.guide) {
			const guide = straightAt(math, targets.traits, radius);
			if (guide) chooseLine(guide);
			else if (interactive) hint = { node, text: 'Touche d’abord une droite.' };
			return;
		}
		tapAt(snapWithInstruments(math, targets, radius));
	}

	const ARROWS: Record<string, [number, number]> = {
		ArrowLeft: [-1, 0],
		ArrowRight: [1, 0],
		ArrowUp: [0, 1],
		ArrowDown: [0, -1]
	};

	/** Clavier sur le quadrillage : flèches = nœud voisin (dans la fenêtre), Entrée / Espace = toucher */
	function handleGridKey(event: KeyboardEvent, scene: FigureScene) {
		if (!grid) return;
		const at =
			cursor ??
			snapToGrid(
				{
					x: (scene.viewport.xMin + scene.viewport.xMax) / 2,
					y: (scene.viewport.yMin + scene.viewport.yMax) / 2
				},
				grid,
				scene.viewport
			);
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			cursor = at;
			tapAt(at);
			return;
		}
		const move = ARROWS[event.key];
		if (!move) return;
		event.preventDefault();
		const next = { x: at.x + move[0] * grid.x, y: at.y + move[1] * grid.y };
		const { xMin, xMax, yMin, yMax } = scene.viewport;
		cursor = next.x >= xMin && next.x <= xMax && next.y >= yMin && next.y <= yMax ? next : at;
	}

	/** Focus au clavier seulement (un clic donne aussi le focus : pas de curseur au centre) */
	function focusGrid(event: FocusEvent, scene: FigureScene) {
		if (!grid || cursor) return;
		if (event.currentTarget instanceof Element && !event.currentTarget.matches(':focus-visible')) {
			return;
		}
		const { xMin, xMax, yMin, yMax } = scene.viewport;
		cursor = snapToGrid({ x: (xMin + xMax) / 2, y: (yMin + yMax) / 2 }, grid, scene.viewport);
	}

	/** Annonce du lecteur d'écran : nœud du curseur (quadrillage), départ ou droite choisis */
	let gridStatus = $derived.by(() => {
		if (hintText) return hintText;
		if (!cursor) {
			if (drawing.guide) return 'Équerre : droite choisie, touche un point';
			if (drawing.start && tool === 'compas') return 'Compas : centre choisi';
			return drawing.start ? 'Départ choisi' : '';
		}
		const count = tool === 'point' ? placedPoints.length : lines.length;
		const plural = count > 1 ? 's' : '';
		const what =
			tool === 'point' ? `point${plural} placé${plural}` : `trait${plural} tracé${plural}`;
		return `Nœud ${cursor.x} ; ${cursor.y}${drawing.start ? ', départ choisi' : ''}, ${count} ${what}`;
	});

	function handlePointKey(event: KeyboardEvent, position: Position) {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		if (tool === 'equerre' && !drawing.guide) {
			hint = { node, text: 'Touche d’abord une droite.' };
			return;
		}
		tapAt({ x: position.x, y: position.y });
	}

	function erase() {
		apply(eraseLast(drawing));
	}

	/** Le trait droit choisi pour l'équerre, en coordonnées SVG (découpé à la fenêtre) */
	function guideToScreen(guide: StraightTrait, scene: FigureScene, width: number, height: number) {
		const line: DrawnLine = {
			kind: guide.kind === 'segment' ? 'segment' : 'droite',
			x1: guide.a.x,
			y1: guide.a.y,
			x2: guide.b.x,
			y2: guide.b.y
		};
		return toScreen(line, scene, width, height);
	}

	/** Un trait à l'écran, en coordonnées SVG : la droite est découpée à la fenêtre, le segment tel quel */
	function toScreen(line: DrawnLine, scene: FigureScene, width: number, height: number) {
		const clipped = line.kind === 'segment' ? line : clipLineToWindow(line, scene.viewport);
		if (!clipped) return null;
		const transformer = createTransformer(scene.viewport, width, height);
		const a = transformer.mathToSvg(clipped.x1, clipped.y1);
		const b = transformer.mathToSvg(clipped.x2, clipped.y2);
		return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
	}

	/** Taille des codages (angle droit, marques), en unités SVG */
	const MARK = 8;

	/**
	 * Codage du symétrique d'un point, en coordonnées SVG : angle droit au pied
	 * de [AA'] sur l'axe (symétrie axiale), une marque sur chaque moitié
	 */
	function codage(solution: PointSolution, scene: FigureScene, width: number, height: number) {
		const { from, foot } = solution;
		if (!from || !foot) return null;
		const transformer = createTransformer(scene.viewport, width, height);
		const a = transformer.mathToSvg(from.x, from.y);
		const h = transformer.mathToSvg(foot.x, foot.y);
		const b = transformer.mathToSvg(solution.at.x, solution.at.y);
		const length = Math.hypot(a.x - h.x, a.y - h.y);
		if (length === 0) return null;
		// u : de H vers A ; v : le long de l'axe
		const u = { x: (a.x - h.x) / length, y: (a.y - h.y) / length };
		const v = { x: -u.y, y: u.x };
		const tick = (m: { x: number; y: number }) => ({
			x1: m.x - (v.x * MARK) / 2,
			y1: m.y - (v.y * MARK) / 2,
			x2: m.x + (v.x * MARK) / 2,
			y2: m.y + (v.y * MARK) / 2
		});
		const corner = solution.axial
			? `M ${h.x + u.x * MARK} ${h.y + u.y * MARK} L ${h.x + (u.x + v.x) * MARK} ${h.y + (u.y + v.y) * MARK} L ${h.x + v.x * MARK} ${h.y + v.y * MARK}`
			: null;
		return {
			segment: { x1: a.x, y1: a.y, x2: b.x, y2: b.y },
			corner,
			ticks: [
				tick({ x: (a.x + h.x) / 2, y: (a.y + h.y) / 2 }),
				tick({ x: (h.x + b.x) / 2, y: (h.y + b.y) / 2 })
			]
		};
	}
</script>

{#snippet layer({ scene, width, height }: { scene: FigureScene; width: number; height: number })}
	{@const points = namedPointPositions(scene)}
	{@const allPoints = allNamedPointPositions(scene)}
	{@const transformer = createTransformer(scene.viewport, width, height)}
	<g class="figure-a-completer-trace">
		{#if interactive}
			<!-- Zone de toucher : toute la fenêtre (un toucher hors d'un point part de là) -->
			{#if grid}
				<!-- Quadrillage : la zone prend le focus, les flèches mènent le curseur -->
				<rect
					data-testid="zone-de-trace"
					class="zone-de-trace"
					x="0"
					y="0"
					{width}
					{height}
					fill="transparent"
					role="button"
					tabindex="0"
					aria-label="Quadrillage : flèches pour choisir un nœud, Entrée pour le toucher"
					onclick={(event) => handleTap(event, scene, width, height)}
					onfocus={(event) => focusGrid(event, scene)}
					onblur={() => (cursor = null)}
					onkeydown={(event) => handleGridKey(event, scene)}
				/>
			{:else}
				<rect
					data-testid="zone-de-trace"
					class="zone-de-trace"
					x="0"
					y="0"
					{width}
					{height}
					fill="transparent"
					role="presentation"
					onclick={(event) => handleTap(event, scene, width, height)}
				/>
			{/if}
		{/if}
		{#each placedPoints as point, i (i)}
			{@const p = transformer.mathToSvg(point.x, point.y)}
			<g
				data-testid="point-eleve"
				class="point-eleve"
				class:point-juste={answer?.isCorrect === true}
				class:point-travail={workDone}
			>
				<line x1={p.x - 6} y1={p.y - 6} x2={p.x + 6} y2={p.y + 6} />
				<line x1={p.x - 6} y1={p.y + 6} x2={p.x + 6} y2={p.y - 6} />
			</g>
		{/each}
		{#each lines as line, i (i)}
			{@const s = toScreen(line, scene, width, height)}
			{#if s}
				<line
					data-testid={line.kind === 'segment' ? 'segment-eleve' : 'droite-eleve'}
					class="droite-eleve"
					class:droite-juste={answer?.isCorrect === true}
					class:droite-travail={workDone}
					x1={s.x1}
					y1={s.y1}
					x2={s.x2}
					y2={s.y2}
				/>
			{/if}
		{/each}
		{#each circles as c, i (i)}
			{@const center = transformer.mathToSvg(c.cx, c.cy)}
			{@const edge = transformer.mathToSvg(c.x, c.y)}
			<circle
				data-testid="cercle-eleve"
				class="cercle-eleve"
				class:droite-juste={answer?.isCorrect === true}
				class:droite-travail={workDone}
				cx={center.x}
				cy={center.y}
				r={Math.hypot(edge.x - center.x, edge.y - center.y)}
			/>
		{/each}
		{#if interactive && drawing.guide}
			{@const g = guideToScreen(drawing.guide, scene, width, height)}
			{#if g}
				<line data-testid="droite-choisie" class="droite-choisie" {...g} />
			{/if}
		{/if}
		{#if corrected}
			{#each solutionLines(checks, allPoints, lines, figureShapes(scene, node.header), expectedOf()) as line, i (i)}
				{@const s = toScreen(line, scene, width, height)}
				{#if s}
					<line
						data-testid={line.kind === 'segment' ? 'bon-segment' : 'bonne-droite'}
						class="bonne-droite"
						x1={s.x1}
						y1={s.y1}
						x2={s.x2}
						y2={s.y2}
					/>
				{/if}
			{/each}
		{/if}
		{#if corrected}
			{#each solutionCodages(checks, allPoints) as m, i (i)}
				{@const c = codage(
					{ name: '', at: m.to, from: m.from, foot: m.foot, axial: true },
					scene,
					width,
					height
				)}
				{#if c}
					<g data-testid="codage-mediatrice" class="bon-point">
						{#if c.corner}<path class="bon-point-codage" d={c.corner} />{/if}
						{#each c.ticks as t, j (j)}<line class="bon-point-codage" {...t} />{/each}
					</g>
				{/if}
			{/each}
		{/if}
		{#each pointSolutions as solution (solution.name)}
			{@const p = transformer.mathToSvg(solution.at.x, solution.at.y)}
			{@const c = codage(solution, scene, width, height)}
			<g data-testid="bon-point" class="bon-point">
				{#if c}
					<line class="bon-point-segment" {...c.segment} />
					{#if c.corner}<path class="bon-point-codage" d={c.corner} />{/if}
					{#each c.ticks as t, i (i)}<line class="bon-point-codage" {...t} />{/each}
				{/if}
				<circle cx={p.x} cy={p.y} r="6" />
				<text x={p.x + 9} y={p.y - 9}>{solution.name.replaceAll("'", '’')}</text>
			</g>
		{/each}
		{#if drawing.start}
			{@const p = transformer.mathToSvg(drawing.start.x, drawing.start.y)}
			<circle data-testid="depart" class="depart" cx={p.x} cy={p.y} r="9" />
		{/if}
		{#if interactive && cursor}
			{@const p = transformer.mathToSvg(cursor.x, cursor.y)}
			<circle data-testid="curseur" class="curseur" cx={p.x} cy={p.y} r="7" />
		{/if}
		{#if interactive}
			<!-- Clavier : chaque point nommé est un bouton (le toucher passe par la zone) -->
			{#each [...points] as [name, position] (name)}
				{@const p = transformer.mathToSvg(position.x, position.y)}
				<circle
					class="point-cible"
					cx={p.x}
					cy={p.y}
					r="11"
					role="button"
					tabindex="0"
					aria-label="Point {name}"
					pointer-events="none"
					onkeydown={(event) => handlePointKey(event, position)}
				/>
			{/each}
			{#if instruments && (!grid || (tool === 'equerre' && !drawing.guide))}
				{@const targets = snapTargets(scene)}
				{#if tool === 'equerre' && !drawing.guide}
					<!-- Équerre au clavier : chaque droite est un bouton -->
					{#each targets.traits.filter(isStraight) as trait, i (i)}
						{@const g = guideToScreen(trait, scene, width, height)}
						{#if g}
							<line
								class="droite-cible"
								{...g}
								role="button"
								tabindex="0"
								aria-label="Droite {i + 1}"
								pointer-events="none"
								onkeydown={(event) => {
									if (event.key !== 'Enter' && event.key !== ' ') return;
									event.preventDefault();
									chooseLine(trait);
								}}
							/>
						{/if}
					{/each}
				{:else}
					<!-- Une intersection sur un point nommé : le bouton du point suffit -->
					{#each targets.intersections.filter((q) => ![...points.values()].some((p) => Math.hypot(p.x - q.x, p.y - q.y) < 1e-9)) as position, i (i)}
						{@const p = transformer.mathToSvg(position.x, position.y)}
						<circle
							class="point-cible"
							cx={p.x}
							cy={p.y}
							r="11"
							role="button"
							tabindex="0"
							aria-label="Intersection {i + 1}"
							pointer-events="none"
							onkeydown={(event) => handlePointKey(event, position)}
						/>
					{/each}
				{/if}
			{/if}
		{/if}
	</g>
{/snippet}

<div class="figure-a-completer {className}">
	<FigureBlockView {node} {errorsVisible} overlay={layer} {interactive} />
	{#if interactive}
		<div class="figure-a-completer-outils">
			{#if tools.length > 1}
				<div class="palette" role="group" aria-label="Instruments">
					{#each tools as t (t)}
						<Button
							variant={t === tool ? 'default' : 'outline'}
							size="sm"
							aria-pressed={t === tool}
							data-testid="outil-{t}"
							onclick={() => selectTool(t)}
						>
							{TOOL_LABELS[t]}
						</Button>
					{/each}
				</div>
			{/if}
			<Button variant="outline" size="sm" onclick={erase} disabled={!canErase(drawing)}>
				Effacer
			</Button>
		</div>
		{#if hintText}
			<p class="figure-a-completer-consigne" data-testid="consigne-outil">{hintText}</p>
		{/if}
	{/if}
	<!-- Zone toujours présente : une zone live insérée déjà remplie est souvent tue -->
	<p class="sr-only" role="status">
		{#if answer?.isCorrect === true}réponse juste{:else if answer?.isCorrect === false}réponse
			fausse{:else}{gridStatus}{/if}
	</p>
</div>

<style>
	.zone-de-trace {
		cursor: crosshair;
		/* Pas de double-tap pour zoomer : deux touchers rapides tracent une droite */
		touch-action: manipulation;
	}

	.droite-eleve {
		stroke: var(--color-primary);
		stroke-width: 2.5;
		stroke-linecap: round;
		pointer-events: none;
	}

	.droite-juste {
		stroke: var(--color-success);
	}

	.droite-travail {
		stroke: var(--color-muted-foreground);
	}

	.bonne-droite {
		stroke: var(--color-success);
		stroke-width: 2.5;
		stroke-dasharray: 8 5;
		pointer-events: none;
	}

	.point-eleve line {
		stroke: var(--color-primary);
		stroke-width: 2.5;
		stroke-linecap: round;
		pointer-events: none;
	}

	.point-juste line {
		stroke: var(--color-success);
	}

	.point-travail line {
		stroke: var(--color-muted-foreground);
	}

	.bon-point {
		pointer-events: none;
	}

	.bon-point circle {
		fill: none;
		stroke: var(--color-success);
		stroke-width: 2.5;
		stroke-dasharray: 4 3;
	}

	.bon-point text {
		fill: var(--color-success);
		font-size: 15px;
		font-style: italic;
	}

	.bon-point-segment {
		stroke: var(--color-success);
		stroke-width: 1.5;
		stroke-dasharray: 8 5;
	}

	.bon-point-codage {
		fill: none;
		stroke: var(--color-success);
		stroke-width: 1.5;
	}

	.depart {
		fill: none;
		stroke: var(--color-primary);
		stroke-width: 2.5;
		pointer-events: none;
	}

	.curseur {
		fill: none;
		stroke: var(--color-ring);
		stroke-width: 2;
		stroke-dasharray: 3 2;
		pointer-events: none;
	}

	.zone-de-trace:focus-visible {
		outline: none;
	}

	.point-cible {
		fill: transparent;
		outline: none;
	}

	.point-cible:focus-visible {
		stroke: var(--color-ring);
		stroke-width: 2;
	}

	.figure-a-completer-outils {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	.palette {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.figure-a-completer-consigne {
		margin-top: 0.25rem;
		text-align: center;
		font-size: 0.875rem;
		color: var(--color-muted-foreground);
	}

	.cercle-eleve {
		fill: none;
		stroke: var(--color-primary);
		stroke-width: 2;
		pointer-events: none;
	}

	.cercle-eleve.droite-juste {
		stroke: var(--color-success);
	}

	.cercle-eleve.droite-travail {
		stroke: var(--color-muted-foreground);
	}

	.droite-choisie {
		stroke: var(--color-ring);
		stroke-width: 6;
		stroke-opacity: 0.45;
		stroke-linecap: round;
		pointer-events: none;
	}

	.droite-cible {
		stroke: transparent;
		stroke-width: 12;
		outline: none;
	}

	.droite-cible:focus-visible {
		stroke: var(--color-ring);
		stroke-opacity: 0.6;
	}
</style>
