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
	- report (lot 4, § 13) : deux touchers prennent l'écartement (trait fin),
	  chaque toucher suivant pique un cercle de ce rayon ; les bouts des
	  segments de la figure s'aimantent (longueurs à reporter) ;
	- rapporteur (lot 5, § 16) : le centre, puis un point de la base le posent ;
	  chaque toucher place un repère au degré entier le plus proche ; ‹ › (ou les
	  flèches, le rapporteur ayant le focus) le décalent d'un degré ; Retourner
	  passe le corps de l'autre côté ; à la correction, l'arc de l'angle codé ;
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
		repereAt,
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
		isDrawnReport,
		isDrawnRepere,
		parseConstructionAnswer,
		serializeConstructionAnswer,
		serializeMeasuredAnswer,
		splitMeasuredAnswer,
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
		flipProtractor,
		markDegree,
		nudgeMark,
		snapTap,
		snapWithInstruments,
		snapToGrid,
		solutionCircles,
		solutionCodages,
		solutionLines,
		solutionPoints,
		solutionAngle,
		solutionTriangle,
		type ConstructionAnswerInput,
		type Drawing,
		type Protractor as PosedProtractor
	} from '$lib/questions/construction/drawing';
	import { PROTRACTOR_RADIUS } from '$lib/constructions-v2/constants';
	import { protractorRadiusOf } from '$lib/questions/construction/angle';
	import Protractor from '$lib/constructions-v2/instruments/components/Protractor.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
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
		span?: { a: Position; b: Position } | null;
		protractor?: PosedProtractor | null;
	} | null>(null);
	/** Outil choisi dans la palette, lié au bloc comme `pending` */
	let chosen = $state.raw<{ node: FigureNode; tool: ConstructionTool } | null>(null);
	/** « Touche d'abord une droite. » (équerre), lié au bloc */
	let hint = $state.raw<{ node: FigureNode; text: string } | null>(null);

	let interactive = $derived(answer !== undefined && !answer.disabled);
	/** Angle à mesurer (lot 6, § 19) : la mesure se tape sous la figure, à part des repères */
	let measureCheck = $derived(node.construction?.checks.find((c) => c.kind === 'mesure') ?? null);
	let measured = $derived(measureCheck ? splitMeasuredAnswer(answer?.value ?? '') : null);
	let typedMeasure = $derived(measured?.measure ?? null);
	let objects = $derived(
		parseConstructionAnswer(measureCheck ? (measured?.drawn ?? '') : (answer?.value ?? '')) ?? []
	);
	let lines = $derived(objects.filter(isDrawnLine));
	let placedPoints = $derived(objects.filter(isDrawnPoint));
	let circles = $derived(objects.filter(isDrawnCircle));
	/** Cercles du report, dessinés comme ceux du compas */
	let reports = $derived(
		objects.filter(isDrawnReport).map((r) => ({
			cx: r.cx,
			cy: r.cy,
			radius: Math.hypot(r.bx - r.ax, r.by - r.ay)
		}))
	);
	/** Repères du rapporteur (lot 5) : des points, où le segment s'aimante */
	let marks = $derived(objects.filter(isDrawnRepere));
	// Plus de saisie (Valider, correction) ou autre bloc : le départ en attente disparaît
	let mine = $derived(interactive && pending?.node === node ? pending : null);
	let drawing: Drawing = $derived({
		objects,
		start: mine?.at ?? null,
		...(mine?.guide && { guide: mine.guide }),
		...(mine?.span && { span: mine.span }),
		...(mine?.protractor && { protractor: mine.protractor })
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
	/** Report : ce qu'attend le prochain toucher (dont : reprendre Report pour une autre longueur) */
	let reportHint = $derived.by(() => {
		if (!interactive) return '';
		if (tool === 'rapporteur') {
			if (drawing.protractor && measureCheck) {
				return 'Lis la mesure sur le rapporteur, puis tape-la sous la figure. Pour le reposer, touche Rapporteur.';
			}
			if (drawing.protractor) {
				return 'Touche le bord du rapporteur pour placer un repère, ‹ › pour l’ajuster. Pour le reposer, touche Rapporteur.';
			}
			if (drawing.start) return 'Touche un point du côté, pour y poser la base du rapporteur.';
			return 'Touche où piquer le centre du rapporteur.';
		}
		if (tool !== 'report') return '';
		if (drawing.span) return 'Touche où piquer le compas. Pour une autre longueur, touche Report.';
		return 'Touche les deux bouts de la longueur à reporter.';
	});
	let hintText = $derived(interactive && hint?.node === node ? hint.text : reportHint);
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
		pending =
			next.start || next.guide || next.span || next.protractor
				? {
						node,
						at: next.start,
						guide: next.guide ?? null,
						span: next.span ?? null,
						protractor: next.protractor ?? null
					}
				: null;
		hint = null;
		if (next.objects !== drawing.objects) {
			answer?.onChange(
				measureCheck
					? serializeMeasuredAnswer(next.objects, typedMeasure)
					: serializeConstructionAnswer(next.objects)
			);
		}
	}

	/** Mesure tapée (lot 6) : chiffres seulement, trois au plus ; vide = rien de tapé */
	function typeMeasure(event: Event & { currentTarget: HTMLInputElement }) {
		const digits = event.currentTarget.value.replace(/\D/g, '').slice(0, 3);
		event.currentTarget.value = digits;
		answer?.onChange(serializeMeasuredAnswer(objects, digits === '' ? null : Number(digits)));
	}

	/** Rayon du rapporteur à poser (unités de la figure), choisi par l'écran au premier toucher */
	let protractorRadius = $state(3);

	function tapAt(position: Position) {
		if (!interactive) return;
		apply(addTap(drawing, position, tool, { protractorRadius }));
	}

	/** ‹ › et flèches : décaler le repère du rapporteur */
	function nudge(delta: number) {
		if (!interactive) return;
		apply(nudgeMark(drawing, delta));
	}

	function flip() {
		if (!interactive) return;
		apply(flipProtractor(drawing));
	}

	/**
	 * Rayon du rapporteur : une part de la fenêtre, le même que celui du refus à la
	 * publication (`protractorRadiusOf`, décision de David, § 18)
	 */
	function radiusFor(scene: FigureScene): number {
		return protractorRadiusOf(scene.viewport);
	}

	/** Le rapporteur posé, à l'écran : centre, rotation (degrés SVG), échelle du dessin */
	function protractorOnScreen(
		protractor: PosedProtractor,
		scene: FigureScene,
		width: number,
		height: number
	) {
		const transformer = createTransformer(scene.viewport, width, height);
		const c = transformer.mathToSvg(protractor.center.x, protractor.center.y);
		const b = transformer.mathToSvg(protractor.base.x, protractor.base.y);
		const along = (Math.atan2(b.y - c.y, b.x - c.x) * 180) / Math.PI;
		// Le corps du dessin est du côté trigonométrique de sa base ; retourné : un demi-tour
		const rotation = protractor.sens === 1 ? along : along + 180;
		const pixelsPerUnit = (protractor.radius * transformer.scaleX) / PROTRACTOR_RADIUS;
		return { x: c.x, y: c.y, rotation, pixelsPerUnit };
	}

	/** Clavier, le rapporteur ayant le focus : flèches = ±1°, Maj + flèches = ±10° */
	function handleProtractorKey(event: KeyboardEvent) {
		const step = event.shiftKey ? 10 : 1;
		const delta =
			event.key === 'ArrowRight' || event.key === 'ArrowUp'
				? step
				: event.key === 'ArrowLeft' || event.key === 'ArrowDown'
					? -step
					: 0;
		if (delta === 0) return;
		event.preventDefault();
		nudge(delta);
	}

	/** Repère du rapporteur à l'écran : un petit trait dans l'axe du centre */
	function markTick(
		mark: (typeof marks)[number],
		scene: FigureScene,
		width: number,
		height: number
	) {
		const transformer = createTransformer(scene.viewport, width, height);
		const at = repereAt(mark);
		const c = transformer.mathToSvg(mark.vx, mark.vy);
		const m = transformer.mathToSvg(at.x, at.y);
		const length = Math.hypot(m.x - c.x, m.y - c.y);
		if (length === 0) return null;
		const u = { x: (m.x - c.x) / length, y: (m.y - c.y) / length };
		return { x1: m.x - u.x * 5, y1: m.y - u.y * 5, x2: m.x + u.x * 8, y2: m.y + u.y * 8 };
	}

	/** Arc codé de l'angle à la correction, et sa mesure écrite au milieu */
	const ANGLE_ARC_SVG = 30;

	function angleArc(
		arc: NonNullable<ReturnType<typeof solutionAngle>>,
		scene: FigureScene,
		width: number,
		height: number
	) {
		const transformer = createTransformer(scene.viewport, width, height);
		const c = transformer.mathToSvg(arc.center.x, arc.center.y);
		const unit = (p: Position) => {
			const q = transformer.mathToSvg(p.x, p.y);
			const length = Math.hypot(q.x - c.x, q.y - c.y);
			return { x: (q.x - c.x) / length, y: (q.y - c.y) / length };
		};
		const u = unit(arc.from);
		const v = unit(arc.to);
		const r = ANGLE_ARC_SVG;
		// Sens trigonométrique à l'écran (y vers le bas) : arc SVG de sens 0
		const sweep = arc.sens === 1 ? 0 : 1;
		const d = `M ${c.x + u.x * r} ${c.y + u.y * r} A ${r} ${r} 0 0 ${sweep} ${c.x + v.x * r} ${c.y + v.y * r}`;
		const mid = { x: u.x + v.x, y: u.y + v.y };
		const midLength = Math.hypot(mid.x, mid.y) || 1;
		const label = {
			x: c.x + (mid.x / midLength) * (r + 16),
			y: c.y + (mid.y / midLength) * (r + 16)
		};
		return { d, label, text: `${arc.measure}°` };
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

	/**
	 * Bouts des segments de la figure qui ne sont pas des points nommés : le
	 * report y prend l'écartement d'une longueur donnée (lot 4)
	 */
	function segmentEnds(scene: FigureScene): Position[] {
		const named = [...namedPointPositions(scene).values()];
		const ends: Position[] = [];
		for (const s of figureShapes(scene, node.header).segments) {
			for (const p of [s.a, s.b]) {
				const known = [...named, ...ends].some((q) => Math.hypot(p.x - q.x, p.y - q.y) < 1e-9);
				if (!known) ends.push(p);
			}
		}
		return ends;
	}

	/** Ce sur quoi les instruments s'aimantent ; intersections dans la fenêtre seulement */
	function snapTargets(scene: FigureScene): SnapTargets {
		const traits = traitsOf(scene);
		const { xMin, xMax, yMin, yMax } = scene.viewport;
		return {
			// Repères du rapporteur : le côté de l'angle se trace jusqu'à eux (lot 5)
			points: [...namedPointPositions(scene).values(), ...placedPoints, ...marks.map(repereAt)],
			// Bouts des segments (figure, élève : deux côtés finis au même endroit se rejoignent),
			// au rang des intersections : le plus proche du toucher l'emporte (revue du lot 4)
			ends: [
				...segmentEnds(scene),
				...lines
					.filter((l) => l.kind === 'segment')
					.flatMap((l) => [
						{ x: l.x1, y: l.y1 },
						{ x: l.x2, y: l.y2 }
					])
			],
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
		compas: 'Compas',
		report: 'Report',
		rapporteur: 'Rapporteur'
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
		// Rapporteur posé : le toucher vise une graduation (jamais aimanté)
		if (tool === 'rapporteur' && drawing.protractor) {
			if (markDegree(drawing.protractor, math) === null) {
				if (interactive) {
					hint = { node, text: 'Touche du côté des graduations, ou touche Retourner.' };
				}
				return;
			}
			tapAt(math);
			return;
		}
		if (tool === 'rapporteur') protractorRadius = radiusFor(scene);
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
			if (drawing.start && tool === 'report')
				return 'Report : premier point de l’écartement choisi';
			if (drawing.span && tool === 'report') return 'Report : écartement pris, touche un centre';
			if (drawing.protractor) {
				const last = marks.at(-1);
				return last ? `Rapporteur posé, repère à ${last.deg}` : 'Rapporteur posé';
			}
			if (drawing.start && tool === 'rapporteur') return 'Rapporteur : centre choisi';
			return drawing.start ? 'Départ choisi' : '';
		}
		const count = tool === 'point' ? placedPoints.length : lines.length;
		const plural = count > 1 ? 's' : '';
		const what =
			tool === 'point' ? `point${plural} placé${plural}` : `trait${plural} tracé${plural}`;
		return `Nœud ${cursor.x} ; ${cursor.y}${drawing.start ? ', départ choisi' : ''}, ${count} ${what}`;
	});

	function handlePointKey(event: KeyboardEvent, position: Position, scene: FigureScene) {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		if (tool === 'rapporteur' && !drawing.protractor) {
			protractorRadius = radiusFor(scene);
		}
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

	/** Codage d'une longueur (triangle) : `count` petits traits au milieu du segment, en SVG */
	function lengthTicks(
		mark: { from: Position; to: Position; count: number },
		scene: FigureScene,
		width: number,
		height: number
	) {
		const transformer = createTransformer(scene.viewport, width, height);
		const a = transformer.mathToSvg(mark.from.x, mark.from.y);
		const b = transformer.mathToSvg(mark.to.x, mark.to.y);
		const length = Math.hypot(b.x - a.x, b.y - a.y);
		if (length === 0) return [];
		const u = { x: (b.x - a.x) / length, y: (b.y - a.y) / length };
		const v = { x: -u.y, y: u.x };
		const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
		return Array.from({ length: mark.count }, (_, k) => {
			const shift = (k - (mark.count - 1) / 2) * 4;
			const m = { x: middle.x + u.x * shift, y: middle.y + u.y * shift };
			return {
				x1: m.x - (v.x * MARK) / 2,
				y1: m.y - (v.y * MARK) / 2,
				x2: m.x + (v.x * MARK) / 2,
				y2: m.y + (v.y * MARK) / 2
			};
		});
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
		{#each reports as c, i (i)}
			{@const center = transformer.mathToSvg(c.cx, c.cy)}
			{@const edge = transformer.mathToSvg(c.cx + c.radius, c.cy)}
			<circle
				data-testid="report-eleve"
				class="cercle-eleve"
				class:droite-juste={answer?.isCorrect === true}
				class:droite-travail={workDone}
				cx={center.x}
				cy={center.y}
				r={Math.hypot(edge.x - center.x, edge.y - center.y)}
			/>
		{/each}
		{#each marks as mark, i (i)}
			{@const t = markTick(mark, scene, width, height)}
			{#if t}
				<line
					data-testid="repere-eleve"
					class="repere-eleve"
					class:droite-juste={answer?.isCorrect === true}
					class:droite-travail={workDone}
					{...t}
				/>
			{/if}
		{/each}
		{#if interactive && drawing.protractor}
			{@const p = protractorOnScreen(drawing.protractor, scene, width, height)}
			<!-- Clavier : le rapporteur a le focus, les flèches mènent le repère -->
			<g
				data-testid="rapporteur"
				class="rapporteur"
				role="slider"
				tabindex="0"
				aria-label="Rapporteur : flèches pour placer le repère"
				aria-valuemin={0}
				aria-valuemax={180}
				aria-valuenow={marks.at(-1)?.deg ?? 0}
				onkeydown={handleProtractorKey}
			>
				<Protractor x={p.x} y={p.y} rotation={p.rotation} pixelsPerUnit={p.pixelsPerUnit} />
			</g>
		{/if}
		{#if interactive && drawing.span}
			{@const a = transformer.mathToSvg(drawing.span.a.x, drawing.span.a.y)}
			{@const b = transformer.mathToSvg(drawing.span.b.x, drawing.span.b.y)}
			<line data-testid="ecartement" class="ecartement" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
		{/if}
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
		{#if corrected}
			<!-- Cercle à construire (lot 3b) : le cercle, son centre, deux médiatrices en traits fins -->
			{#each solutionCircles(checks, expectedOf(), allPoints, figureShapes(scene, node.header)) as solution (solution.name)}
				{@const center = transformer.mathToSvg(solution.center.x, solution.center.y)}
				{@const edge = transformer.mathToSvg(
					solution.center.x + solution.radius,
					solution.center.y
				)}
				<g data-testid="bon-cercle" class="bon-cercle">
					{#each solution.mediatrices as line, i (i)}
						{@const s = toScreen(line, scene, width, height)}
						{#if s}
							<line
								data-testid="bon-cercle-mediatrice"
								class="bon-cercle-mediatrice"
								x1={s.x1}
								y1={s.y1}
								x2={s.x2}
								y2={s.y2}
							/>
						{/if}
					{/each}
					<circle
						class="bon-cercle-trait"
						cx={center.x}
						cy={center.y}
						r={Math.hypot(edge.x - center.x, edge.y - center.y)}
					/>
					<circle class="bon-cercle-centre" cx={center.x} cy={center.y} r="3.5" />
				</g>
			{/each}
		{/if}
		{#if corrected}
			<!-- Triangle à construire (lot 4) : arcs de report en traits fins, longueurs codées -->
			{@const triangle = solutionTriangle(
				checks,
				allPoints,
				figureShapes(scene, node.header),
				lines
			)}
			{#if triangle}
				<g data-testid="bon-triangle" class="bon-cercle">
					{#each triangle.arcs as arc, i (i)}
						{@const center = transformer.mathToSvg(arc.center.x, arc.center.y)}
						{@const edge = transformer.mathToSvg(arc.center.x + arc.radius, arc.center.y)}
						<circle
							data-testid="bon-triangle-arc"
							class="bon-triangle-arc"
							cx={center.x}
							cy={center.y}
							r={Math.hypot(edge.x - center.x, edge.y - center.y)}
						/>
					{/each}
					{#each triangle.marks as mark, i (i)}
						{#each lengthTicks(mark, scene, width, height) as t, j (j)}
							<line data-testid="bon-triangle-marque" class="bon-point-codage" {...t} />
						{/each}
					{/each}
				</g>
			{/if}
		{/if}
		{#if corrected}
			<!-- Angle à construire (lot 5) : l'arc de l'angle, codé de sa mesure -->
			{@const arc = solutionAngle(checks, allPoints, figureShapes(scene, node.header), lines)}
			{#if arc}
				{@const a = angleArc(arc, scene, width, height)}
				<g data-testid="bon-angle" class="bon-point">
					<path class="bon-point-codage" d={a.d} />
					<text x={a.label.x} y={a.label.y} text-anchor="middle" dominant-baseline="middle"
						>{a.text}</text
					>
				</g>
			{/if}
		{/if}
		{#each pointSolutions as solution (solution.name)}
			{@const p = transformer.mathToSvg(solution.at.x, solution.at.y)}
			{@const c = codage(solution, scene, width, height)}
			<g data-testid="bon-point" class="bon-point">
				<!-- 4e sommet (lot 4) : [CD], [DA] en pointillés, côtés opposés codés -->
				{#each solution.sides ?? [] as [from, to], i (i)}
					{@const p1 = transformer.mathToSvg(from.x, from.y)}
					{@const p2 = transformer.mathToSvg(to.x, to.y)}
					<line
						data-testid="bon-point-cote"
						class="bon-point-segment"
						x1={p1.x}
						y1={p1.y}
						x2={p2.x}
						y2={p2.y}
					/>
				{/each}
				{#each solution.marks ?? [] as mark, i (i)}
					{#each lengthTicks(mark, scene, width, height) as t, j (j)}
						<line class="bon-point-codage" {...t} />
					{/each}
				{/each}
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
					onkeydown={(event) => handlePointKey(event, position, scene)}
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
							onkeydown={(event) => handlePointKey(event, position, scene)}
						/>
					{/each}
					<!-- Repères du rapporteur (côté de l'angle) -->
					{#each marks as mark, i (i)}
						{@const position = repereAt(mark)}
						{@const p = transformer.mathToSvg(position.x, position.y)}
						<circle
							class="point-cible"
							cx={p.x}
							cy={p.y}
							r="11"
							role="button"
							tabindex="0"
							aria-label="Repère {i + 1}"
							pointer-events="none"
							onkeydown={(event) => handlePointKey(event, position, scene)}
						/>
					{/each}
					<!-- Bouts des segments donnés (report d'une longueur) -->
					{#each segmentEnds(scene) as position, i (i)}
						{@const p = transformer.mathToSvg(position.x, position.y)}
						<circle
							class="point-cible"
							cx={p.x}
							cy={p.y}
							r="11"
							role="button"
							tabindex="0"
							aria-label="Extrémité {i + 1}"
							pointer-events="none"
							onkeydown={(event) => handlePointKey(event, position, scene)}
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
			{#if drawing.protractor}
				<div class="palette" role="group" aria-label="Rapporteur">
					<Button
						variant="outline"
						size="sm"
						data-testid="rapporteur-moins"
						aria-label="Repère : un degré de moins"
						onclick={() => nudge(-1)}>‹ 1°</Button
					>
					<Button
						variant="outline"
						size="sm"
						data-testid="rapporteur-plus"
						aria-label="Repère : un degré de plus"
						onclick={() => nudge(1)}>1° ›</Button
					>
					<Button variant="outline" size="sm" data-testid="rapporteur-retourner" onclick={flip}>
						Retourner
					</Button>
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
	{#if measureCheck && answer !== undefined}
		{@const name = measureCheck.points.join('')}
		<!-- Angle à mesurer (lot 6) : la mesure lue au rapporteur, en degrés entiers -->
		<label class="figure-a-completer-mesure">
			<span>Mesure de l’angle {name} :</span>
			<Input
				class="w-20 text-center"
				type="text"
				inputmode="numeric"
				autocomplete="off"
				maxlength={3}
				data-testid="mesure-angle"
				aria-label="Mesure de l’angle {name}, en degrés"
				value={typedMeasure === null ? '' : String(typedMeasure)}
				disabled={!interactive}
				aria-invalid={answer.isCorrect === false || undefined}
				oninput={typeMeasure}
			/>
			<span aria-hidden="true">°</span>
		</label>
	{/if}
	<!-- Zone toujours présente : une zone live insérée déjà remplie est souvent tue -->
	<p class="sr-only" role="status">
		{#if answer?.isCorrect === true}réponse juste{:else if answer?.isCorrect === false}réponse
			fausse{:else}{gridStatus}{/if}
	</p>
</div>

<style>
	.figure-a-completer-mesure {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

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

	.bon-cercle {
		pointer-events: none;
	}

	.bon-cercle-trait {
		fill: none;
		stroke: var(--color-success);
		stroke-width: 2.5;
		stroke-dasharray: 8 5;
	}

	.bon-cercle-centre {
		fill: var(--color-success);
	}

	.bon-cercle-mediatrice {
		stroke: var(--color-success);
		stroke-width: 1;
		stroke-dasharray: 4 4;
		opacity: 0.7;
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

	.ecartement {
		stroke: var(--color-ring);
		stroke-width: 1.5;
		stroke-dasharray: 3 3;
		pointer-events: none;
	}

	.repere-eleve {
		stroke: var(--color-primary);
		stroke-width: 2;
		stroke-linecap: round;
		pointer-events: none;
	}

	.repere-eleve.droite-juste {
		stroke: var(--color-success);
	}

	.repere-eleve.droite-travail {
		stroke: var(--color-muted-foreground);
	}

	/* Le toucher passe à travers le rapporteur (zone de tracé dessous) ; le clavier le prend */
	.rapporteur {
		pointer-events: none;
		outline: none;
	}

	.rapporteur:focus-visible {
		filter: drop-shadow(0 0 2px var(--color-ring));
	}

	.bon-triangle-arc {
		fill: none;
		stroke: var(--color-success);
		stroke-width: 1;
		stroke-dasharray: 4 4;
		opacity: 0.7;
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
