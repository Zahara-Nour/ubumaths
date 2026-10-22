<script lang="ts">
	import '$lib/utils/mathlive-styles';
	import ElementPopover from './ElementPopover.svelte';
	import SliderControl from './SliderControl.svelte';
	import type { Snippet } from 'svelte';
	import type { InlineNode } from '$lib/ubumark';
	import { parseMarkdown } from '$lib/ubumark';
	import { convertLatexToMarkup } from 'mathlive';
	import { expressionToLatex } from '$lib/components/markdown/utils/math-utils';
	import { readContentLocale } from '$lib/components/markdown/content-locale';
	import { Figure } from '$lib/geometry-core/graph/figure';
	import type { GeoElement, GeoSlider } from '$lib/geometry-core/types/elements';
	import {
		createTransformer,
		type CoordinateTransformer
	} from '$lib/geometry-core/viewport/viewport';
	import type { Viewport } from '$lib/geometry-core/viewport/types';
	import {
		pointToSVG,
		segmentToSVG,
		lineToSVG,
		rayToSVG,
		vectorToSVG,
		circleToSVG,
		circleToPathSVG,
		arcToSVG,
		angleToSVG,
		segmentMarkToSVG,
		textToSVG,
		resolveScreenStyle,
		resolveStyle,
		functionToSVG,
		integralAreaToSVG,
		integralAreaBetweenToSVG,
		quadraticCurveToSVG,
		implicitCurveToSVG,
		tangentLineToSVG,
		tangentToQuadraticToSVG,
		tangentParametricToSVG,
		tangentVectorPositions,
		conicPolarToSVG,
		locusToSVG,
		parametricCurveToSVG,
		parametricCurveLabelPosition,
		traceToSVG,
		sectorToSVG,
		annulusToSVG,
		imageToSVG
	} from '$lib/geometry-core/rendering/svg-primitives';
	import { computeGridStep } from '$lib/geometry-core/viewport/grid';
	import {
		findPointNear,
		findElementNear,
		findElementsNear
	} from '$lib/geometry-core/interaction/hit-testing';
	import { snapToGrid } from '$lib/geometry-core/interaction/snap';
	import { numeric } from '$lib/geometry-core/types/geo-value';
	import {
		isPointElement,
		isVector,
		type GeoArcByAngles,
		type GeoArcByPoints
	} from '$lib/geometry-core/types/elements';
	import { conicClosestParam } from '$lib/geometry-core/graph/conic-helpers';
	import { geoToNumber } from '$lib/geometry-core/compute/to-number';
	import rough from 'roughjs';
	import {
		seedFromId,
		styleToRoughOptions,
		shouldRenderRough,
		roughLineHTML,
		roughCircleHTML,
		roughArcHTML,
		roughPolygonHTML,
		roughAngleHTML,
		roughSegmentMarkHTML,
		roughVectorHTML
	} from '$lib/geometry-core/rendering/rough-geometry';
	import type { PointDrag } from './point-drag';
	import type { CanvasTool } from './canvas-tool';

	/** L'aimantation d'un glisser délégué, en pixels (lot 3 de l'atelier, M2). */
	const SNAP_PIXELS = 8;
	/**
	 * Le chemin, en pixels, sous lequel un glisser délégué n'écrit rien : un clic
	 * qui tremble ne réécrit pas `(1/3 ; 2,25)` en `(0,3 ; 2,3)`.
	 */
	const DRAG_THRESHOLD_PIXELS = 4;

	/** La tolérance d'un clic d'outil autour d'un point, en pixels (lot 3 de l'atelier, M5). */
	const TOOL_PICK_PIXELS = { mouse: 8, touch: 20 } as const;

	interface Props {
		figure: Figure;
		center?: { x: number; y: number };
		pixelsPerUnit?: number;
		width?: number;
		height?: number;
		interactive?: boolean;
		showGrid?: boolean;
		showMinorGrid?: boolean;
		showGraduations?: boolean;
		snapOnRelease?: boolean;
		/** External version counter to trigger re-render when figure changes programmatically. */
		externalVersion?: number;
		/** Element IDs to exclude from rendering (used for animation overlay). */
		hiddenElementIds?: Set<string>;
		/** Rendering mode: 'normal' (clean SVG), 'rough' (hand-drawn), 'mixed' (per-element). */
		renderMode?: 'normal' | 'rough' | 'mixed';
		/**
		 * Notified whenever the local viewport changes (pan, zoom).
		 * Lets a wrapping canvas (e.g. construction overlay) keep an overlay in sync
		 * with the user's zoom/pan state. The viewport object is in math coords.
		 */
		onViewportChange?: (viewport: Viewport, pixelsPerUnit: number) => void;
		/**
		 * false : aucun objet ne se déplace à la souris (points, vecteurs, étiquettes,
		 * textes, images) et le double-clic n'ouvre plus le panneau de style ; les
		 * curseurs, le déplacement de la vue et le zoom restent actifs (figure
		 * stockée `deplacable: non`). Défaut true.
		 */
		objectsMovable?: boolean;
		/**
		 * Glisser DÉLÉGUÉ des points : la toile ne touche pas la figure, elle dit
		 * où va le point saisi à qui la possède (vue Géométrie de l'atelier). Passe
		 * avant `objectsMovable` : un point se glisse ainsi même objets figés.
		 */
		pointDrag?: PointDrag;
		/**
		 * Outil de construction DÉLÉGUÉ (barre d'outils de l'atelier) : un clic
		 * va à l'outil, rien ne se glisse. Absent : la toile glisse comme avant.
		 */
		canvasTool?: CanvasTool;
		/**
		 * Les gestes de la vue au doigt et sur le fond (vue Géométrie de
		 * l'atelier, M6) : deux doigts déplacent et zooment la vue, quel que soit
		 * l'outil ; sans outil, un glisser sur le fond (souris ou doigt) la
		 * déplace. Défaut false : les autres toiles gardent leurs gestes.
		 */
		viewGestures?: boolean;
		/**
		 * Calque dessiné SOUS les objets (repère d'une figure stockée), recalculé à
		 * chaque déplacement ou zoom de la vue. Son contenu doit être du SVG
		 * (composant en `<svelte:options namespace="svg" />`).
		 */
		underlay?: Snippet<[{ viewport: Viewport; width: number; height: number }]>;
		/** Calque dessiné AU-DESSUS des objets (fantôme d'une construction en cours), en SVG. */
		overlay?: Snippet<[{ viewport: Viewport; width: number; height: number }]>;
	}

	let {
		figure,
		center: initialCenter = { x: 0, y: 0 },
		pixelsPerUnit: initialPpu = 40,
		width = 800,
		height = 600,
		interactive = true,
		showGrid = true,
		showMinorGrid = false,
		showGraduations = true,
		snapOnRelease = false,
		externalVersion = 0,
		hiddenElementIds,
		renderMode = 'normal',
		onViewportChange,
		objectsMovable = true,
		pointDrag,
		canvasTool,
		viewGestures = false,
		underlay,
		overlay
	}: Props = $props();

	// Langue du contenu (séparateur décimal des étiquettes), posée par MarkdownRenderer
	const contentLocale = readContentLocale();

	let svgRef: SVGSVGElement | undefined = $state();
	let containerRef: HTMLDivElement | undefined = $state();
	let draggingId: string | null = $state(null);
	/** Offset from pointer to freeVector anchor at drag start (for smooth drag). */
	let dragOffset: { dx: number; dy: number } | null = $state(null);
	let hoveredId: string | null = $state(null);
	let version = $state(0);
	/** Un glisser délégué en cours (`pointDrag`) : la figure n'est pas touchée. */
	let delegated = $state(false);
	/**
	 * Le geste délégué : son pointeur (les autres sont ignorés), où il a commencé
	 * (pixels de l'écran), l'écart point − curseur (unités du repère), et s'il a
	 * passé le seuil.
	 */
	let delegatedGesture: {
		pointerId: number;
		startX: number;
		startY: number;
		dx: number;
		dy: number;
		moved: boolean;
	} | null = null;
	/** Le dernier mouvement d'un glisser délégué, pas encore transmis (une fois par image). */
	let pendingMove: { x: number; y: number } | null = null;
	let moveFrame: number | null = null;
	/** Un appui avec un outil (`canvasTool`) : un clic s'il ne bouge pas avant le relâcher. */
	let toolPress: { pointerId: number; startX: number; startY: number; moved: boolean } | null =
		null;

	// Slider elements (reactive to version changes). Un curseur CACHÉ n'a pas de
	// réglette : la vue Figure de l'atelier pilote les siens depuis les cartes
	// (géométrie v2, S4), et `masque(s)` cache désormais aussi la réglette.
	const sliders = $derived.by(() => {
		void version; // depend on version so sliders update when figure changes
		void externalVersion;
		return figure.getElementsByType('slider').filter((s: GeoSlider) => s.visible);
	});

	function handleSliderChange(sliderId: string, newValue: number) {
		figure.beginTransaction();
		figure.moveSlider(sliderId, newValue);
		figure.recompute();
		figure.commit();
		version++;
	}

	// Popover state
	let popoverElementId: string | null = $state(null);
	let popoverX = $state(0);
	let popoverY = $state(0);

	// Parametric curve hover tooltip state (D3): shows t, x, y at cursor.
	let parametricHover: {
		curveId: string;
		t: number;
		x: number;
		y: number;
		svgX: number;
		svgY: number;
	} | null = $state(null);

	// Label drag state
	let draggingLabelId: string | null = $state(null);
	let labelDragStart: { mx: number; my: number; dx: number; dy: number } | null = $state(null);

	// Local state for pan/zoom. Initialized from props, then diverges.
	// Pan/zoom modify these directly — prop changes after mount are ignored.
	// svelte-ignore state_referenced_locally
	let viewCenter = $state({ x: initialCenter.x, y: initialCenter.y });
	// svelte-ignore state_referenced_locally
	let ppu = $state(initialPpu);
	let isPanning = $state(false);
	let spaceHeld = $state(false);
	/** Le pointeur qui déplace la vue, et où il était (pixels de l'écran). */
	let panPointer: { pointerId: number; lastX: number; lastY: number } | null = null;
	/** Les doigts posés sur la toile (`viewGestures`), et où ils sont (pixels de l'écran). */
	const touches = new Map<number, { x: number; y: number }>();
	/** Deux doigts : la vue suit leur milieu et zoome comme leur écart (M6). */
	let pinch: { ids: [number, number]; lastMid: { x: number; y: number }; lastDist: number } | null =
		null;

	// Zoom limits
	// Bornes élargies autour de l'échelle initiale : une fenêtre d'en-tête de
	// 100 unités (4 px par unité) doit pouvoir encore dézoomer, une fenêtre d'une
	// unité (400 px par unité) rezoomer. Inchangées à 40 px par unité.
	// svelte-ignore state_referenced_locally
	const MIN_PPU = Math.min(5, initialPpu / 4);
	// svelte-ignore state_referenced_locally
	const MAX_PPU = Math.max(200, initialPpu * 4);

	// Viewport derived from center + pixelsPerUnit + SVG size.
	let viewport: Viewport = $derived({
		xMin: viewCenter.x - width / (2 * ppu),
		xMax: viewCenter.x + width / (2 * ppu),
		yMin: viewCenter.y - height / (2 * ppu),
		yMax: viewCenter.y + height / (2 * ppu)
	});

	let transformer: CoordinateTransformer = $derived(createTransformer(viewport, width, height));

	// Notify a wrapper component (e.g. construction overlay) when the viewport changes.
	$effect(() => {
		onViewportChange?.(viewport, ppu);
	});

	let gridStep = $derived(computeGridStep(ppu));

	let gridLines = $derived.by(() => {
		if (!showGrid)
			return {
				majorV: [] as number[],
				majorH: [] as number[],
				minorV: [] as number[],
				minorH: [] as number[]
			};
		const { major, minor } = gridStep;

		const majorV: number[] = [];
		const majorH: number[] = [];
		const startX = Math.ceil(viewport.xMin / major) * major;
		const startY = Math.ceil(viewport.yMin / major) * major;
		for (let x = startX; x <= viewport.xMax; x += major) majorV.push(x);
		for (let y = startY; y <= viewport.yMax; y += major) majorH.push(y);

		const minorV: number[] = [];
		const minorH: number[] = [];
		if (showMinorGrid) {
			const startMX = Math.ceil(viewport.xMin / minor) * minor;
			const startMY = Math.ceil(viewport.yMin / minor) * minor;
			for (let x = startMX; x <= viewport.xMax; x += minor) {
				// Skip positions that coincide with major lines
				if (Math.abs(x / major - Math.round(x / major)) > 0.01) minorV.push(x);
			}
			for (let y = startMY; y <= viewport.yMax; y += minor) {
				if (Math.abs(y / major - Math.round(y / major)) > 0.01) minorH.push(y);
			}
		}

		return { majorV, majorH, minorV, minorH };
	});

	let elements = $derived.by(() => {
		void version;
		void externalVersion;
		const all = figure.getAllElements();
		return all.filter((el) => el.visible && !(hiddenElementIds && hiddenElementIds.has(el.id)));
	});
	let dims = $derived({ width, height });

	// ─── Rough.js rendering ─────────────────────────────────────────
	let rc = $derived(svgRef ? rough.svg(svgRef) : null);

	function getRoughOpts(elId: string, sty: ReturnType<typeof resolveStyle>) {
		return styleToRoughOptions(sty, seedFromId(elId, sty.roughSeed), sty.roughness);
	}

	function isRough(sty: ReturnType<typeof resolveStyle>, elType: string): boolean {
		return shouldRenderRough(sty.render, elType, renderMode);
	}

	// ─── Drag projection helpers ───────────────────────────────────

	function projectOnSegment(
		mx: number,
		my: number,
		x1: number,
		y1: number,
		x2: number,
		y2: number
	): number {
		const dx = x2 - x1;
		const dy = y2 - y1;
		const lenSq = dx * dx + dy * dy;
		if (lenSq === 0) return 0;
		return Math.max(0, Math.min(1, ((mx - x1) * dx + (my - y1) * dy) / lenSq));
	}

	function projectOnLine(
		mx: number,
		my: number,
		x1: number,
		y1: number,
		x2: number,
		y2: number
	): number {
		const dx = x2 - x1;
		const dy = y2 - y1;
		const lenSq = dx * dx + dy * dy;
		if (lenSq === 0) return 0;
		return ((mx - x1) * dx + (my - y1) * dy) / lenSq;
	}

	function projectOnArc(
		fig: Figure,
		arcEl: GeoArcByAngles | GeoArcByPoints,
		mx: number,
		my: number
	): number {
		let cx: number, cy: number, startAngle: number, endAngle: number;

		if (arcEl.type === 'arcByAngles') {
			const centerPos = fig.getPosition(arcEl.centerId);
			if (!centerPos) return 0.5;
			cx = geoToNumber(centerPos.x);
			cy = geoToNumber(centerPos.y);
			startAngle = fig.resolveParam(arcEl.startAngle);
			endAngle = fig.resolveParam(arcEl.endAngle);
		} else {
			const centerPos = fig.getPosition(arcEl.centerId);
			const startPos = fig.getPosition(arcEl.startId);
			const endPos = fig.getPosition(arcEl.endId);
			if (!centerPos || !startPos || !endPos) return 0.5;
			cx = geoToNumber(centerPos.x);
			cy = geoToNumber(centerPos.y);
			startAngle = Math.atan2(geoToNumber(startPos.y) - cy, geoToNumber(startPos.x) - cx);
			endAngle = Math.atan2(geoToNumber(endPos.y) - cy, geoToNumber(endPos.x) - cx);
		}

		let sweep = endAngle - startAngle;
		if (sweep < 0) sweep += 2 * Math.PI;
		if (sweep === 0) return 0;
		const angle = Math.atan2(my - cy, mx - cx);
		let offset = angle - startAngle;
		offset = ((offset % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
		return Math.max(0, Math.min(1, offset / sweep));
	}

	/** Parse ubumark content to inline nodes. */
	function parseInlineNodes(content: string): InlineNode[] {
		try {
			const doc = parseMarkdown(content);
			if (doc.children.length > 0 && doc.children[0].type === 'paragraph') {
				return doc.children[0].children;
			}
			return [{ type: 'text', content, bold: false, italic: false, code: false }];
		} catch {
			return [{ type: 'text', content, bold: false, italic: false, code: false }];
		}
	}

	function escapeHtml(s: string): string {
		return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

	/**
	 * Convert inline nodes to static HTML string for use with {@html}.
	 *
	 * Uses convertLatexToMarkup() for math nodes instead of the <math-span> web
	 * component. This avoids the flicker caused by web component destruction/recreation
	 * during drag operations: <math-span> has a heavy lifecycle (Shadow DOM,
	 * IntersectionObserver, LaTeX parse → render) that causes visible disappearance
	 * when Svelte recreates the {#each} block on version change.
	 * convertLatexToMarkup() produces the same visual output as plain HTML, which
	 * Svelte can insert/replace instantaneously via innerHTML.
	 */
	function inlineNodesToHTML(nodes: InlineNode[]): string {
		return nodes
			.map((node) => {
				if (node.type === 'text') {
					let html = escapeHtml(node.content);
					if (node.bold) html = `<strong>${html}</strong>`;
					if (node.italic) html = `<em>${html}</em>`;
					if (node.code) html = `<code>${html}</code>`;
					return html;
				}
				if (node.type === 'math-inline') {
					const latex = expressionToLatex(node.expression, node.syntax, undefined, contentLocale());
					return convertLatexToMarkup(latex, { defaultMode: 'inline-math' });
				}
				// line-break, link, blank, hashtag, mention, hint-reference, internal-link
				// — not meaningful in a single-line SVG foreignObject label.
				// NOTE: if you add a 'link' branch, sanitise node.url (block javascript:/data: URIs).
				return '';
			})
			.join('');
	}

	// ─── Pointer events ─────────────────────────────────────────────

	function getMathCoords(e: PointerEvent | WheelEvent): { x: number; y: number } | null {
		if (!svgRef) return null;
		const rect = svgRef.getBoundingClientRect();
		const svgX = e.clientX - rect.left;
		const svgY = e.clientY - rect.top;
		return transformer.svgToMath(svgX, svgY);
	}

	/**
	 * Capturer le pointeur. Un pointeur déjà levé (ou synthétique) lève une
	 * erreur : le geste continue sans capture.
	 */
	function capture(e: PointerEvent) {
		try {
			svgRef?.setPointerCapture(e.pointerId);
		} catch {
			// Le pointeur n'est plus actif : rien à capturer
		}
	}

	/** Commencer à déplacer la vue avec ce pointeur. */
	function startPan(e: PointerEvent) {
		isPanning = true;
		panPointer = { pointerId: e.pointerId, lastX: e.clientX, lastY: e.clientY };
		capture(e);
		e.preventDefault();
	}

	function endPan() {
		isPanning = false;
		panPointer = null;
	}

	/** Le milieu (pixels de la toile) et l'écart des deux doigts du pincement. */
	function pinchFrame(
		ids: [number, number]
	): { mid: { x: number; y: number }; dist: number } | null {
		const a = touches.get(ids[0]);
		const b = touches.get(ids[1]);
		if (!a || !b || !svgRef) return null;
		const rect = svgRef.getBoundingClientRect();
		return {
			mid: { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top },
			dist: Math.hypot(a.x - b.x, a.y - b.y)
		};
	}

	/** Un second doigt se pose : le geste en cours tombe, la vue suit les deux doigts. */
	function startPinch() {
		const [first, second] = touches.keys();
		const ids: [number, number] = [first, second];
		const frame = pinchFrame(ids);
		if (frame === null) return;
		// Un appui d'outil devient un geste de vue : aucun clic au relâcher
		if (toolPress !== null) toolPress.moved = true;
		// Un glisser de la figure elle-même tombe : le point reste où il était
		if (draggingId) {
			figure.discard();
			draggingId = null;
			dragOffset = null;
		}
		endPan();
		hoveredId = null;
		canvasTool?.hover(null);
		pinch = { ids, lastMid: frame.mid, lastDist: frame.dist };
	}

	/**
	 * Les doigts ont bougé : le point du repère sous leur ancien milieu passe
	 * sous le nouveau, l'échelle suit le rapport des écarts.
	 */
	function movePinch() {
		if (pinch === null) return;
		const frame = pinchFrame(pinch.ids);
		if (frame === null) return;
		const factor = pinch.lastDist > 0 ? frame.dist / pinch.lastDist : 1;
		const newPpu = Math.max(MIN_PPU, Math.min(MAX_PPU, ppu * factor));
		const anchor = transformer.svgToMath(pinch.lastMid.x, pinch.lastMid.y);
		viewCenter = {
			x: anchor.x - (frame.mid.x - width / 2) / newPpu,
			y: anchor.y + (frame.mid.y - height / 2) / newPpu
		};
		ppu = newPpu;
		pinch.lastMid = frame.mid;
		pinch.lastDist = frame.dist;
	}

	/**
	 * Un pointeur se lève (ou est perdu) : il quitte les doigts posés, le
	 * pincement tombe. Sans outil, le doigt resté posé continue de déplacer la vue.
	 */
	function releaseTouch(e: PointerEvent) {
		touches.delete(e.pointerId);
		if (pinch === null || !pinch.ids.includes(e.pointerId)) return;
		pinch = null;
		const [remaining] = touches;
		if (remaining === undefined || canvasTool || delegated) return;
		isPanning = true;
		panPointer = { pointerId: remaining[0], lastX: remaining[1].x, lastY: remaining[1].y };
	}

	function onPointerDown(e: PointerEvent) {
		if (!interactive) return;
		// Un second doigt pendant un glisser délégué : ignoré, pas de re-saisie
		if (delegated) {
			e.preventDefault();
			return;
		}

		// Deux doigts déplacent et zooment la vue (M6) ; un troisième ne fait rien
		if (viewGestures && e.pointerType === 'touch') {
			touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
			if (touches.size >= 2) {
				if (pinch === null && touches.size === 2) startPinch();
				capture(e);
				e.preventDefault();
				return;
			}
		}

		// Middle button or space held = start panning
		if (e.button === 1 || spaceHeld) {
			startPan(e);
			return;
		}

		if (canvasTool) {
			// Un second doigt invalide l'appui en cours (pincement, paume) : aucun clic
			if (toolPress !== null && toolPress.pointerId !== e.pointerId) {
				toolPress.moved = true;
				e.preventDefault();
				return;
			}
			// Un appui d'outil : le clic part au relâcher, s'il n'a pas bougé
			if (e.button === 0) {
				toolPress = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, moved: false };
				capture(e);
				e.preventDefault();
			}
			return;
		}

		if (pointDrag && startDelegatedDrag(e, pointDrag)) return;

		// Un glisser sur le fond déplace la vue (M6)
		if (viewGestures && e.button === 0) {
			startPan(e);
			return;
		}

		// Objets figés (`deplacable: non`) : seule la vue se déplace
		if (!objectsMovable) return;

		const math = getMathCoords(e);
		if (!math) return;

		const threshold = 15 / ppu;
		const pointId = findPointNear(figure, math.x, math.y, threshold);

		if (pointId) {
			const el = figure.getElementById(pointId);
			if (el?.type === 'freePoint' && el.draggable) {
				draggingId = pointId;
				dragOffset = null;
				figure.beginTransaction();
				capture(e);
				e.preventDefault();
			} else if (
				(el?.type === 'pointOnCurve' ||
					el?.type === 'pointOnQuadraticCurve' ||
					el?.type === 'pointOnSegment' ||
					el?.type === 'pointOnLine' ||
					el?.type === 'pointOnCircle' ||
					el?.type === 'pointOnArc' ||
					el?.type === 'pointOnParametricCurve') &&
				el.draggable
			) {
				draggingId = pointId;
				dragOffset = null;
				figure.beginTransaction();
				capture(e);
				e.preventDefault();
			}
		} else {
			// No point hit — check for free vector drag
			const elementId = findElementNear(figure, math.x, math.y, threshold, viewport);
			if (elementId) {
				const el = figure.getElementById(elementId);
				if (el?.type === 'freeVector') {
					const ax = geoToNumber(el.anchorX);
					const ay = geoToNumber(el.anchorY);
					draggingId = elementId;
					dragOffset = { dx: ax - math.x, dy: ay - math.y };
					figure.beginTransaction();
					capture(e);
					e.preventDefault();
				}
			}
		}
	}

	/**
	 * Un glisser délégué commence-t-il ici ? Vrai aussi quand le point visé est
	 * REFUSÉ (`grab` faux) : le geste s'arrête là, rien d'autre ne le reprend.
	 */
	function startDelegatedDrag(e: PointerEvent, drag: PointDrag): boolean {
		const math = getMathCoords(e);
		if (!math) return false;
		const pointId = findPointNear(figure, math.x, math.y, 15 / ppu);
		if (pointId === null) return false;
		if (drag.grab(pointId)) {
			// Saisi un peu à côté, le point ne saute pas sous le curseur
			const position = figure.getPosition(pointId);
			delegatedGesture = {
				pointerId: e.pointerId,
				startX: e.clientX,
				startY: e.clientY,
				dx: position ? geoToNumber(position.x) - math.x : 0,
				dy: position ? geoToNumber(position.y) - math.y : 0,
				moved: false
			};
			delegated = true;
			capture(e);
		}
		e.preventDefault();
		return true;
	}

	/** Le point se glisse-t-il (la main au survol) : par la figure, ou par `pointDrag`. */
	function canDragPoint(el: GeoElement): boolean {
		if (!interactive || canvasTool) return false;
		if (pointDrag?.canGrab(el.id)) return true;
		return objectsMovable && 'draggable' in el && el.draggable === true;
	}

	/**
	 * Le point est-il en train d'être glissé ? Un glisser délégué demande à son
	 * possesseur : la figure refaite en plein geste change les ids.
	 */
	function isDragged(el: GeoElement): boolean {
		if (delegated) return pointDrag?.holds(el.id) ?? false;
		return draggingId === el.id;
	}

	/** Ce pointeur est-il étranger au glisser délégué en cours ? */
	function foreignPointer(e: PointerEvent): boolean {
		return delegatedGesture !== null && e.pointerId !== delegatedGesture.pointerId;
	}

	// Une toile retirée en plein glisser ferme le geste
	$effect(() => () => endDelegatedDrag());

	/** Transmettre le dernier mouvement du glisser délégué. */
	function flushDelegatedMove() {
		if (moveFrame !== null) cancelAnimationFrame(moveFrame);
		moveFrame = null;
		const move = pendingMove;
		pendingMove = null;
		if (move !== null && delegated) pointDrag?.move(move.x, move.y, SNAP_PIXELS / ppu, 1 / ppu);
	}

	/** Fin d'un glisser délégué : le dernier mouvement part, puis le relâcher. */
	function endDelegatedDrag() {
		if (!delegated) return;
		flushDelegatedMove();
		delegated = false;
		delegatedGesture = null;
		pointDrag?.release();
	}

	function onPointerMove(e: PointerEvent) {
		if (!interactive) return;

		if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
		if (pinch !== null) {
			if (pinch.ids.includes(e.pointerId)) movePinch();
			return;
		}

		// Panning: move center by pointer delta (suivi à la main : `movementX`
		// manque aux doigts de certains navigateurs)
		if (isPanning) {
			if (panPointer === null || e.pointerId !== panPointer.pointerId) return;
			const dx = e.clientX - panPointer.lastX;
			const dy = e.clientY - panPointer.lastY;
			panPointer.lastX = e.clientX;
			panPointer.lastY = e.clientY;
			viewCenter = {
				x: viewCenter.x - dx / ppu,
				y: viewCenter.y + dy / ppu // y inverted
			};
			return;
		}

		const math = getMathCoords(e);
		if (!math) return;

		if (canvasTool) {
			const press = toolPress;
			if (press !== null && press.pointerId === e.pointerId && !press.moved) {
				const path = Math.hypot(e.clientX - press.startX, e.clientY - press.startY);
				if (path >= DRAG_THRESHOLD_PIXELS) press.moved = true;
			}
			// Ce qu'un clic viserait, mis en évidence (M5) : le point, sinon l'objet le plus proche
			const radius = toolPickRadius(e) / ppu;
			hoveredId =
				findPointNear(figure, math.x, math.y, radius) ??
				findElementNear(figure, math.x, math.y, radius, viewport);
			canvasTool.hover(math);
			return;
		}

		// Au plus un mouvement par image : chacun recalcule tout l'atelier
		if (delegated) {
			const gesture = delegatedGesture;
			if (gesture === null || e.pointerId !== gesture.pointerId) return;
			if (!gesture.moved) {
				const path = Math.hypot(e.clientX - gesture.startX, e.clientY - gesture.startY);
				if (path < DRAG_THRESHOLD_PIXELS) return;
				gesture.moved = true;
			}
			pendingMove = { x: math.x + gesture.dx, y: math.y + gesture.dy };
			moveFrame ??= requestAnimationFrame(() => {
				moveFrame = null;
				flushDelegatedMove();
			});
			return;
		}

		if (draggingLabelId && labelDragStart) {
			const MAX_LABEL_RADIUS = 30; // pixels
			let dx = labelDragStart.dx + (e.clientX - labelDragStart.mx);
			let dy = labelDragStart.dy + (e.clientY - labelDragStart.my);
			const dist = Math.sqrt(dx * dx + dy * dy);
			if (dist > MAX_LABEL_RADIUS) {
				dx = (dx / dist) * MAX_LABEL_RADIUS;
				dy = (dy / dist) * MAX_LABEL_RADIUS;
			}
			figure.setLabelOffset(draggingLabelId, dx, dy);
			version++;
			return;
		}

		if (draggingId) {
			const dragEl = figure.getElementById(draggingId);
			if (dragEl?.type === 'freeVector') {
				// Drag free vector: move anchor, preserve components
				const newAx = math.x + (dragOffset?.dx ?? 0);
				const newAy = math.y + (dragOffset?.dy ?? 0);
				figure.moveFreeVector(draggingId, numeric(newAx), numeric(newAy));
			} else if (dragEl?.type === 'pointOnCurve') {
				figure.movePointOnCurve(draggingId, numeric(math.x));
			} else if (dragEl?.type === 'pointOnQuadraticCurve') {
				const curveEl = figure.getElementById(dragEl.curveId);
				if (curveEl?.type === 'quadraticCurve') {
					const newT = conicClosestParam(curveEl.conic, math.x, math.y);
					figure.movePointOnQuadraticCurve(draggingId, newT);
				}
			} else if (dragEl?.type === 'pointOnSegment') {
				const segEl = figure.getElementById(dragEl.segmentId);
				if (segEl?.type === 'segment') {
					const p1 = figure.getPosition(segEl.startId);
					const p2 = figure.getPosition(segEl.endId);
					if (p1 && p2) {
						const t = projectOnSegment(
							math.x,
							math.y,
							geoToNumber(p1.x),
							geoToNumber(p1.y),
							geoToNumber(p2.x),
							geoToNumber(p2.y)
						);
						figure.movePointOnSegment(draggingId, t);
					}
				}
			} else if (dragEl?.type === 'pointOnLine') {
				const lineEl = figure.getElementById(dragEl.lineId);
				if (lineEl && (lineEl.type === 'line' || lineEl.type === 'ray')) {
					const p1Id = lineEl.type === 'line' ? lineEl.point1Id : lineEl.originId;
					const p2Id = lineEl.type === 'line' ? lineEl.point2Id : lineEl.throughId;
					const p1 = figure.getPosition(p1Id);
					const p2 = figure.getPosition(p2Id);
					if (p1 && p2) {
						const t = projectOnLine(
							math.x,
							math.y,
							geoToNumber(p1.x),
							geoToNumber(p1.y),
							geoToNumber(p2.x),
							geoToNumber(p2.y)
						);
						figure.movePointOnLine(draggingId, t);
					}
				}
			} else if (dragEl?.type === 'pointOnCircle') {
				const circEl = figure.getElementById(dragEl.circleId);
				if (circEl && (circEl.type === 'circleByRadius' || circEl.type === 'circleByPoint')) {
					const center = figure.getPosition(circEl.centerId);
					if (center) {
						const cx = geoToNumber(center.x);
						const cy = geoToNumber(center.y);
						const theta = Math.atan2(math.y - cy, math.x - cx);
						figure.movePointOnCircle(draggingId, theta);
					}
				}
			} else if (dragEl?.type === 'pointOnArc') {
				const arcEl = figure.getElementById(dragEl.arcId);
				if (arcEl && (arcEl.type === 'arcByAngles' || arcEl.type === 'arcByPoints')) {
					const t = projectOnArc(figure, arcEl, math.x, math.y);
					figure.movePointOnArc(draggingId, t);
				}
			} else if (dragEl?.type === 'pointOnParametricCurve') {
				// Newton multi-start to find the closest t* on γ; dispatches to
				// movePointOnParametricCurve (numeric t) or moveSlider (slider t).
				figure.movePointOnParametricCurveFromCursor(draggingId, math.x, math.y);
			} else if (
				(dragEl?.type === 'text' || dragEl?.type === 'mathText' || dragEl?.type === 'richText') &&
				dragEl.position
			) {
				figure.moveText(draggingId, math.x + (dragOffset?.dx ?? 0), math.y + (dragOffset?.dy ?? 0));
			} else if (dragEl?.type === 'image' && dragEl.position) {
				figure.moveImage(
					draggingId,
					math.x + (dragOffset?.dx ?? 0),
					math.y + (dragOffset?.dy ?? 0)
				);
			} else {
				figure.movePoint(draggingId, numeric(math.x), numeric(math.y));
			}
			figure.recompute();
			version++;
		} else {
			const threshold = 15 / ppu;
			hoveredId = findElementNear(figure, math.x, math.y, threshold, viewport);
		}
	}

	/** La tolérance d'un clic d'outil, en pixels : plus large au doigt (M5). */
	function toolPickRadius(e: PointerEvent): number {
		return e.pointerType === 'touch' ? TOOL_PICK_PIXELS.touch : TOOL_PICK_PIXELS.mouse;
	}

	/** Le relâcher d'un appui d'outil : un clic, s'il n'a pas bougé. */
	function endToolPress(e: PointerEvent, tool: CanvasTool) {
		const press = toolPress;
		if (press === null || press.pointerId !== e.pointerId) return;
		toolPress = null;
		if (press.moved) return;
		const math = getMathCoords(e);
		if (!math) return;
		const radius = toolPickRadius(e) / ppu;
		const pointId = findPointNear(figure, math.x, math.y, radius);
		const elementIds = findElementsNear(figure, math.x, math.y, radius, viewport);
		tool.click(math.x, math.y, pointId, SNAP_PIXELS / ppu, { elementIds, radius, pixel: 1 / ppu });
	}

	function onPointerLeave() {
		if (!canvasTool) return;
		hoveredId = null;
		canvasTool.hover(null);
	}

	function onPointerCancel(e: PointerEvent) {
		releaseTouch(e);
		if (toolPress?.pointerId === e.pointerId) toolPress = null;
		if (foreignPointer(e)) return;
		// Un autre pointeur annulé (paume, doigt rejeté) : la vue continue de se déplacer
		if (panPointer !== null && e.pointerId !== panPointer.pointerId) return;
		// Le point délégué reste où il est arrivé : le geste se ferme (M7)
		endDelegatedDrag();
		if (draggingId) figure.discard();
		endPan();
		draggingId = null;
		dragOffset = null;
		draggingLabelId = null;
		labelDragStart = null;
	}

	function onPointerUp(e: PointerEvent) {
		releaseTouch(e);
		if (isPanning) {
			if (panPointer === null || e.pointerId === panPointer.pointerId) endPan();
			return;
		}

		if (draggingLabelId) {
			figure.commit();
			draggingLabelId = null;
			labelDragStart = null;
			return;
		}

		if (canvasTool) {
			endToolPress(e, canvasTool);
			return;
		}

		if (delegated) {
			if (!foreignPointer(e)) endDelegatedDrag();
			return;
		}

		if (!draggingId) return;

		if (snapOnRelease) {
			const math = getMathCoords(e);
			if (math) {
				const snapped = snapToGrid(math.x, math.y, gridStep.major);
				const dragEl = figure.getElementById(draggingId);
				if (dragEl?.type === 'freeVector') {
					const snapAx = geoToNumber(snapped.x) + (dragOffset?.dx ?? 0);
					const snapAy = geoToNumber(snapped.y) + (dragOffset?.dy ?? 0);
					figure.moveFreeVector(draggingId, numeric(snapAx), numeric(snapAy));
				} else if (dragEl?.type === 'pointOnCurve') {
					figure.movePointOnCurve(draggingId, snapped.x);
				} else if (
					dragEl?.type === 'pointOnSegment' ||
					dragEl?.type === 'pointOnLine' ||
					dragEl?.type === 'pointOnCircle' ||
					dragEl?.type === 'pointOnArc' ||
					dragEl?.type === 'pointOnParametricCurve'
				) {
					// Constrained points: no snap, keep current position
				} else {
					figure.movePoint(draggingId, snapped.x, snapped.y);
				}
				figure.recompute();
				version++;
			}
		}

		figure.commit();
		draggingId = null;
		dragOffset = null;
	}

	// ─── Wheel: zoom centered on cursor ─────────────────────────────

	function onWheel(e: WheelEvent) {
		if (!interactive) return;
		e.preventDefault();

		const math = getMathCoords(e);
		if (!math) return;

		// Zoom factor: scroll up = zoom in (more pixels per unit)
		const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
		const newPpu = Math.max(MIN_PPU, Math.min(MAX_PPU, ppu * factor));

		// Adjust center so the point under the cursor stays fixed
		// Before: math coords of cursor = viewCenter + (svgPos - svgCenter) / ppu
		// After: same math point = newCenter + (svgPos - svgCenter) / newPpu
		// => newCenter = math - (math - viewCenter) * (ppu / newPpu)
		const ratio = ppu / newPpu;
		viewCenter = {
			x: math.x - (math.x - viewCenter.x) * ratio,
			y: math.y - (math.y - viewCenter.y) * ratio
		};
		ppu = newPpu;
	}

	// ─── Keyboard: space for pan mode ───────────────────────────────

	function isTextInput(e: KeyboardEvent): boolean {
		const target = e.target as HTMLElement;
		return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
	}

	function onKeyDown(e: KeyboardEvent) {
		if (isTextInput(e)) return;
		if (e.code === 'Space' && !spaceHeld) {
			spaceHeld = true;
			e.preventDefault();
		}
		// Un glisser délégué : la figure n'a rien à annuler, son possesseur s'en charge
		if (delegated) return;
		// Undo: Ctrl+Z (or Cmd+Z on Mac)
		if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
			e.preventDefault();
			if (draggingId) {
				// Cancel current drag instead of corrupting undo history
				figure.discard();
				draggingId = null;
				dragOffset = null;
			} else {
				figure.undo();
			}
			figure.recompute();
			version++;
		}
		// Redo: Ctrl+Shift+Z or Ctrl+Y (ignored during drag)
		if (
			!draggingId &&
			(e.ctrlKey || e.metaKey) &&
			((e.code === 'KeyZ' && e.shiftKey) || e.code === 'KeyY')
		) {
			e.preventDefault();
			figure.redo();
			figure.recompute();
			version++;
		}
	}

	function onKeyUp(e: KeyboardEvent) {
		if (isTextInput(e)) return;
		if (e.code === 'Space') {
			spaceHeld = false;
			if (isPanning) isPanning = false;
		}
	}

	// ─── Double-click: open popover ─────────────────────────────────

	function onDblClick(e: MouseEvent) {
		if (!interactive || !objectsMovable) return;
		const math = getMathCoords(e as unknown as PointerEvent);
		if (!math) return;

		const threshold = 15 / ppu;
		const elementId = findElementNear(figure, math.x, math.y, threshold, viewport);
		if (elementId) {
			if (!containerRef) return;
			const rect = containerRef.getBoundingClientRect();
			popoverX = e.clientX - rect.left + 10;
			popoverY = e.clientY - rect.top + 10;
			popoverElementId = elementId;
		} else {
			popoverElementId = null;
		}
	}

	function openPopoverFor(elementId: string, e: MouseEvent) {
		e.stopPropagation();
		if (!containerRef) return;
		const rect = containerRef.getBoundingClientRect();
		popoverX = e.clientX - rect.left + 10;
		popoverY = e.clientY - rect.top + 10;
		popoverElementId = elementId;
	}

	function closePopover() {
		popoverElementId = null;
	}

	let popoverElement = $derived(
		popoverElementId ? figure.getElementById(popoverElementId) : undefined
	);

	function onLabelPointerDown(e: PointerEvent, elementId: string) {
		if (!interactive || !objectsMovable) return;
		e.stopPropagation();
		e.preventDefault();

		const el = figure.getElementById(elementId);
		if (!el) return;

		const sty = resolveScreenStyle(el, figure.defaults);
		const currentDx = el.labelOffset?.dx ?? sty.pointSize + 4;
		const currentDy = el.labelOffset?.dy ?? -(sty.pointSize + 2);

		draggingLabelId = elementId;
		labelDragStart = { mx: e.clientX, my: e.clientY, dx: currentDx, dy: currentDy };
		figure.beginTransaction();
		capture(e);
	}

	function formatGrad(n: number): string {
		// Avoid floating point display artifacts: 0.30000000000000004 -> "0.3"
		const rounded = Math.round(n * 1e10) / 1e10;
		return String(rounded);
	}

	function onWindowBlur() {
		toolPress = null;
		endDelegatedDrag();
		if (draggingId) figure.discard();
		if (draggingLabelId) figure.discard();
		spaceHeld = false;
		endPan();
		touches.clear();
		pinch = null;
		draggingId = null;
		dragOffset = null;
		draggingLabelId = null;
		labelDragStart = null;
	}
</script>

<svelte:window onkeydown={onKeyDown} onkeyup={onKeyUp} onblur={onWindowBlur} />

<div
	bind:this={containerRef}
	class="geometry-container"
	style="position: relative; display: inline-block;"
>
	<svg
		bind:this={svgRef}
		{width}
		{height}
		viewBox="0 0 {width} {height}"
		role="application"
		aria-label="Figure de geometrie interactive"
		class="geometry-canvas"
		class:interactive
		class:dragging={draggingId !== null || delegated}
		class:panning={isPanning || spaceHeld}
		class:tool={canvasTool !== undefined}
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerup={onPointerUp}
		onpointercancel={onPointerCancel}
		onpointerleave={onPointerLeave}
		onwheel={onWheel}
		ondblclick={onDblClick}
	>
		<!-- Grid -->
		{#if showGrid}
			<g class="grid">
				<!-- Minor grid (sub-divisions) -->
				{#if showMinorGrid}
					{#each gridLines.minorV as x (x)}
						{@const sv = transformer.mathToSvg(x, 0)}
						<line x1={sv.x} y1={0} x2={sv.x} y2={height} class="grid-line-minor" />
					{/each}
					{#each gridLines.minorH as y (y)}
						{@const sv = transformer.mathToSvg(0, y)}
						<line x1={0} y1={sv.y} x2={width} y2={sv.y} class="grid-line-minor" />
					{/each}
				{/if}
				<!-- Major grid -->
				{#each gridLines.majorV as x (x)}
					{@const sv = transformer.mathToSvg(x, 0)}
					<line x1={sv.x} y1={0} x2={sv.x} y2={height} class="grid-line" class:axis={x === 0} />
				{/each}
				{#each gridLines.majorH as y (y)}
					{@const sv = transformer.mathToSvg(0, y)}
					<line x1={0} y1={sv.y} x2={width} y2={sv.y} class="grid-line" class:axis={y === 0} />
				{/each}
				<!-- Graduations on axes -->
				{#if showGraduations}
					{@const axisY = transformer.mathToSvg(0, 0).y}
					{@const axisX = transformer.mathToSvg(0, 0).x}
					{#each gridLines.majorV as x (x)}
						{#if x !== 0}
							{@const sv = transformer.mathToSvg(x, 0)}
							<text
								x={sv.x}
								y={Math.min(Math.max(axisY + 16, 14), height - 4)}
								class="graduation"
								text-anchor="middle">{formatGrad(x)}</text
							>
						{/if}
					{/each}
					{#each gridLines.majorH as y (y)}
						{#if y !== 0}
							{@const sv = transformer.mathToSvg(0, y)}
							<text
								x={Math.min(Math.max(axisX - 6, 20), width - 4)}
								y={sv.y + 4}
								class="graduation"
								text-anchor="end">{formatGrad(y)}</text
							>
						{/if}
					{/each}
				{/if}
			</g>
		{/if}

		<!-- Calque sous les objets (repère d'une figure stockée) -->
		{#if underlay}
			<g class="underlay">{@render underlay({ viewport, width, height })}</g>
		{/if}

		<!-- Elements -->
		<g class="elements">
			<!-- Background images (couche="fond") — rendered behind all constructions -->
			{#each elements as el (`${el.id}_bgimg_${version}`)}
				{#if el.type === 'image' && el.layer === 'fond'}
					{@const svg = imageToSVG(el.id, figure, transformer)}
					{@const sty = resolveScreenStyle(el, figure.defaults)}
					{@const isDraggable = objectsMovable && !!el.position}
					{#if svg}
						{@const imgCx = svg.x + svg.width / 2}
						{@const imgCy = svg.y + (svg.height ?? svg.width) / 2}
						{@const imgRot = (-(svg.rotation ?? 0) * 180) / Math.PI}
						{@const imgSx = svg.flipped ? -1 : 1}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<g
							class:draggable-text={isDraggable}
							onpointerdown={isDraggable
								? (e: PointerEvent) => {
										if (e.button !== 0) return;
										draggingId = el.id;
										const math = getMathCoords(e);
										dragOffset = math
											? { dx: el.position!.x - math.x, dy: el.position!.y - math.y }
											: null;
										figure.beginTransaction();
										capture(e);
										e.preventDefault();
										e.stopPropagation();
									}
								: undefined}
						>
							<image
								href={svg.url}
								x={svg.x}
								y={svg.y}
								width={svg.width}
								height={svg.height}
								opacity={sty.opacity ?? 1}
								preserveAspectRatio="xMidYMid meet"
								transform={imgRot !== 0 || imgSx < 0
									? `translate(${imgCx},${imgCy}) rotate(${imgRot}) scale(1,${imgSx}) translate(${-imgCx},${-imgCy})`
									: undefined}
							/>
						</g>
					{/if}
				{/if}
			{/each}

			{#each elements as el (`${el.id}_${version}`)}
				{@const sty = resolveScreenStyle(el, figure.defaults)}
				{#if el.type === 'segment'}
					{@const svg = segmentToSVG(el.id, figure, transformer)}
					{#if svg}
						{#if isRough(sty, el.type) && rc}
							<line
								x1={svg.x1}
								y1={svg.y1}
								x2={svg.x2}
								y2={svg.y2}
								stroke="transparent"
								stroke-width="12"
								pointer-events="stroke"
								class="segment"
								class:hovered={hoveredId === el.id}
							/>
							<g opacity={sty.opacity} class="rough"
								>{@html roughLineHTML(rc, svg, getRoughOpts(el.id, sty))}</g
							>
						{:else}
							<line
								x1={svg.x1}
								y1={svg.y1}
								x2={svg.x2}
								y2={svg.y2}
								style:stroke={sty.color}
								stroke-width={sty.strokeWidth}
								stroke-dasharray={sty.dashArray}
								stroke-linecap="round"
								opacity={sty.opacity}
								class="segment"
								class:hovered={hoveredId === el.id}
							/>
						{/if}
						{#if el.label}
							{@const lx = (svg.x1 + svg.x2) / 2 + (el.labelOffset?.dx ?? 6)}
							{@const ly = (svg.y1 + svg.y2) / 2 + (el.labelOffset?.dy ?? -8)}
							<text
								x={lx}
								y={ly}
								class="label"
								style:fill={sty.color}
								stroke-width="3"
								paint-order="stroke">{el.label}</text
							>
						{/if}
					{/if}
				{:else if el.type === 'line'}
					{@const svg = lineToSVG(el.id, figure, transformer, dims)}
					{#if svg}
						{#if isRough(sty, el.type) && rc}
							<line
								x1={svg.x1}
								y1={svg.y1}
								x2={svg.x2}
								y2={svg.y2}
								stroke="transparent"
								stroke-width="12"
								pointer-events="stroke"
								class="geo-line"
								class:hovered={hoveredId === el.id}
							/>
							<g opacity={sty.opacity} class="rough"
								>{@html roughLineHTML(rc, svg, getRoughOpts(el.id, sty))}</g
							>
						{:else}
							<line
								x1={svg.x1}
								y1={svg.y1}
								x2={svg.x2}
								y2={svg.y2}
								style:stroke={sty.color}
								stroke-width={sty.strokeWidth}
								stroke-dasharray={sty.dashArray}
								stroke-linecap="round"
								opacity={sty.opacity}
								class="geo-line"
								class:hovered={hoveredId === el.id}
							/>
						{/if}
						{#if el.label}
							{@const t = 0.9}
							{@const mx = svg.x1 + t * (svg.x2 - svg.x1)}
							{@const my = svg.y1 + t * (svg.y2 - svg.y1)}
							{@const dx = svg.x2 - svg.x1}
							{@const dy = svg.y2 - svg.y1}
							{@const len = Math.sqrt(dx * dx + dy * dy) || 1}
							{@const nx = -dy / len}
							{@const ny = dx / len}
							{@const sign = ny > 0 ? -1 : 1}
							{@const offset = 10 + 5 * Math.abs(nx)}
							<text
								x={mx + (el.labelOffset?.dx ?? sign * nx * offset)}
								y={my + (el.labelOffset?.dy ?? sign * ny * offset)}
								class="label"
								style:fill={sty.color}
								stroke-width="3"
								paint-order="stroke">{el.label}</text
							>
						{/if}
					{/if}
				{:else if el.type === 'ray'}
					{@const svg = rayToSVG(el.id, figure, transformer, dims)}
					{#if svg}
						{#if isRough(sty, el.type) && rc}
							<line
								x1={svg.x1}
								y1={svg.y1}
								x2={svg.x2}
								y2={svg.y2}
								stroke="transparent"
								stroke-width="12"
								pointer-events="stroke"
								class="ray"
								class:hovered={hoveredId === el.id}
							/>
							<g opacity={sty.opacity} class="rough"
								>{@html roughLineHTML(rc, svg, getRoughOpts(el.id, sty))}</g
							>
						{:else}
							<line
								x1={svg.x1}
								y1={svg.y1}
								x2={svg.x2}
								y2={svg.y2}
								style:stroke={sty.color}
								stroke-width={sty.strokeWidth}
								stroke-dasharray={sty.dashArray}
								opacity={sty.opacity}
								class="ray"
								class:hovered={hoveredId === el.id}
							/>
						{/if}
						{#if el.label}
							{@const lx = (svg.x1 + svg.x2) / 2 + (el.labelOffset?.dx ?? 6)}
							{@const ly = (svg.y1 + svg.y2) / 2 + (el.labelOffset?.dy ?? -8)}
							<text
								x={lx}
								y={ly}
								class="label"
								style:fill={sty.color}
								stroke-width="3"
								paint-order="stroke">{el.label}</text
							>
						{/if}
					{/if}
				{:else if isVector(el)}
					{@const svg = vectorToSVG(el.id, figure, transformer)}
					{#if svg}
						{#if isRough(sty, el.type) && rc}
							<!-- Invisible hit area -->
							<line
								x1={svg.x1}
								y1={svg.y1}
								x2={svg.x2}
								y2={svg.y2}
								stroke="transparent"
								stroke-width="12"
								pointer-events="stroke"
								class="vector"
								class:hovered={hoveredId === el.id}
							/>
							<g opacity={sty.opacity} class="rough"
								>{@html roughVectorHTML(rc, svg, getRoughOpts(el.id, sty), sty.color)}</g
							>
						{:else}
							<!-- Invisible hit area -->
							<line
								x1={svg.x1}
								y1={svg.y1}
								x2={svg.x2}
								y2={svg.y2}
								stroke="transparent"
								stroke-width="12"
								pointer-events="stroke"
								class="vector"
								class:hovered={hoveredId === el.id}
							/>
							<!-- Shaft -->
							<line
								x1={svg.x1}
								y1={svg.y1}
								x2={svg.shaftX2}
								y2={svg.shaftY2}
								style:stroke={sty.color}
								stroke-width={sty.strokeWidth}
								stroke-dasharray={sty.dashArray}
								opacity={sty.opacity}
								pointer-events="none"
							/>
							<!-- Arrowhead -->
							<polygon
								points={svg.arrowPoints}
								style:fill={sty.color}
								opacity={sty.opacity}
								pointer-events="none"
							/>
						{/if}
						{#if el.label}
							{@const lx = (svg.x1 + svg.x2) / 2 + (el.labelOffset?.dx ?? 6)}
							{@const ly = (svg.y1 + svg.y2) / 2 + (el.labelOffset?.dy ?? -8)}
							<text
								x={lx}
								y={ly}
								class="label"
								style:fill={sty.color}
								stroke-width="3"
								paint-order="stroke">{el.label}</text
							>
						{/if}
					{/if}
				{:else if el.type === 'osculatingCircle'}
					{@const centre = figure.getPosition(el.id)}
					{@const radius = figure.getOsculatingCircleRadius(el.id)}
					{#if centre && radius !== null && Number.isFinite(radius)}
						{@const svgC = transformer.mathToSvg(geoToNumber(centre.x), geoToNumber(centre.y))}
						{@const rPx = Math.abs(radius * transformer.scaleX)}
						<circle
							cx={svgC.x}
							cy={svgC.y}
							r={rPx}
							style:stroke={sty.color}
							stroke-width={sty.strokeWidth}
							stroke-dasharray={sty.dashArray}
							opacity={sty.opacity}
							style:fill={sty.fillColor ?? 'none'}
							fill-opacity={sty.fillOpacity}
							class="circle"
							class:hovered={hoveredId === el.id}
						/>
					{/if}
				{:else if el.type === 'circleByRadius' || el.type === 'circleByPoint' || el.type === 'circleBy3Points'}
					{@const svg = circleToSVG(el.id, figure, transformer)}
					{#if svg}
						{#if isRough(sty, el.type) && rc}
							<circle
								cx={svg.cx}
								cy={svg.cy}
								r={svg.r}
								stroke="transparent"
								stroke-width="12"
								fill="transparent"
								pointer-events="all"
								class="circle"
								class:hovered={hoveredId === el.id}
							/>
							<g opacity={sty.opacity} class="rough"
								>{@html roughCircleHTML(rc, svg, getRoughOpts(el.id, sty))}</g
							>
						{:else if sty.dash !== 'solid'}
							{@const pathSvg = circleToPathSVG(el.id, figure, transformer)}
							{#if pathSvg}
								<path
									d={pathSvg.path}
									style:stroke={sty.color}
									stroke-width={sty.strokeWidth}
									stroke-dasharray={sty.dashArray}
									stroke-linecap="round"
									opacity={sty.opacity}
									style:fill={sty.fillColor ?? 'none'}
									fill-opacity={sty.fillOpacity}
									class="circle"
									class:hovered={hoveredId === el.id}
								/>
							{/if}
						{:else}
							<circle
								cx={svg.cx}
								cy={svg.cy}
								r={svg.r}
								style:stroke={sty.color}
								stroke-width={sty.strokeWidth}
								opacity={sty.opacity}
								style:fill={sty.fillColor ?? 'none'}
								fill-opacity={sty.fillOpacity}
								class="circle"
								class:hovered={hoveredId === el.id}
							/>
						{/if}
					{/if}
				{:else if el.type === 'polygon'}
					{@const verts = el.dependsOn.map((id) => figure.getPosition(id))}
					{#if verts.every((p) => p != null)}
						{@const pts = verts.map((p) => {
							const sv = transformer.mathToSvg(geoToNumber(p!.x), geoToNumber(p!.y));
							return [sv.x, sv.y] as [number, number];
						})}
						{#if isRough(sty, el.type) && rc}
							<polygon
								points={pts.map((p) => `${p[0]},${p[1]}`).join(' ')}
								stroke="transparent"
								fill="transparent"
								pointer-events="all"
								class:hovered={hoveredId === el.id}
							/>
							<g opacity={sty.opacity} class="rough"
								>{@html roughPolygonHTML(rc, pts, getRoughOpts(el.id, sty))}</g
							>
						{:else}
							<polygon
								points={pts.map((p) => `${p[0]},${p[1]}`).join(' ')}
								style:stroke={sty.color}
								stroke-width={sty.strokeWidth}
								stroke-dasharray={sty.dashArray}
								opacity={sty.opacity}
								style:fill={sty.fillColor ?? 'none'}
								fill-opacity={sty.fillOpacity}
								class:hovered={hoveredId === el.id}
							/>
						{/if}
					{/if}
				{:else if el.type === 'sectorByPoints' || el.type === 'sectorByAngles'}
					{@const svg = sectorToSVG(el.id, figure, transformer)}
					{#if svg}
						<path
							d={svg.path}
							style:stroke={sty.color}
							stroke-width={sty.strokeWidth}
							stroke-dasharray={sty.dashArray}
							opacity={sty.opacity}
							style:fill={sty.fillColor ?? sty.color}
							fill-opacity={sty.fillOpacity ?? 0.3}
							class:hovered={hoveredId === el.id}
						/>
					{/if}
				{:else if el.type === 'annulus'}
					{@const svg = annulusToSVG(el.id, figure, transformer)}
					{#if svg}
						<path
							d={svg.path}
							style:stroke={sty.color}
							stroke-width={sty.strokeWidth}
							opacity={sty.opacity}
							style:fill={sty.fillColor ?? sty.color}
							fill-opacity={sty.fillOpacity ?? 0.3}
							fill-rule="evenodd"
							class:hovered={hoveredId === el.id}
						/>
					{/if}
				{:else if el.type === 'tangentLine'}
					{@const svg = tangentLineToSVG(el.id, figure, transformer, dims)}
					{#if svg}
						<line
							x1={svg.x1}
							y1={svg.y1}
							x2={svg.x2}
							y2={svg.y2}
							style:stroke={sty.color}
							stroke-width={sty.strokeWidth}
							stroke-dasharray={sty.dashArray}
							stroke-linecap="round"
							opacity={sty.opacity}
							class="geo-line"
							class:hovered={hoveredId === el.id}
						/>
						{#if el.label}
							{@const t = 0.9}
							{@const mx = svg.x1 + t * (svg.x2 - svg.x1)}
							{@const my = svg.y1 + t * (svg.y2 - svg.y1)}
							{@const dx = svg.x2 - svg.x1}
							{@const dy = svg.y2 - svg.y1}
							{@const len = Math.sqrt(dx * dx + dy * dy) || 1}
							{@const nx = -dy / len}
							{@const ny = dx / len}
							{@const sign = ny > 0 ? -1 : 1}
							{@const offset = 10 + 5 * Math.abs(nx)}
							<text
								x={mx + (el.labelOffset?.dx ?? sign * nx * offset)}
								y={my + (el.labelOffset?.dy ?? sign * ny * offset)}
								class="label"
								style:fill={sty.color}
								stroke-width="3"
								paint-order="stroke">{el.label}</text
							>
						{/if}
					{/if}
				{:else if el.type === 'tangentToQuadratic'}
					{@const svg = tangentToQuadraticToSVG(el.id, figure, transformer, dims)}
					{#if svg}
						<line
							x1={svg.x1}
							y1={svg.y1}
							x2={svg.x2}
							y2={svg.y2}
							style:stroke={sty.color}
							stroke-width={sty.strokeWidth}
							stroke-dasharray={sty.dashArray}
							stroke-linecap="round"
							opacity={sty.opacity}
							class="geo-line"
							class:hovered={hoveredId === el.id}
						/>
					{/if}
				{:else if el.type === 'tangentParametric'}
					{@const svg = tangentParametricToSVG(el.id, figure, transformer, dims)}
					{#if svg}
						<line
							x1={svg.x1}
							y1={svg.y1}
							x2={svg.x2}
							y2={svg.y2}
							style:stroke={sty.color}
							stroke-width={sty.strokeWidth}
							stroke-dasharray={sty.dashArray}
							stroke-linecap="round"
							opacity={sty.opacity}
							class="geo-line"
							class:hovered={hoveredId === el.id}
						/>
						{#if el.label}
							{@const t = 0.9}
							{@const mx = svg.x1 + t * (svg.x2 - svg.x1)}
							{@const my = svg.y1 + t * (svg.y2 - svg.y1)}
							{@const dx = svg.x2 - svg.x1}
							{@const dy = svg.y2 - svg.y1}
							{@const len = Math.sqrt(dx * dx + dy * dy) || 1}
							{@const nx = -dy / len}
							{@const ny = dx / len}
							{@const sign = ny > 0 ? -1 : 1}
							{@const offset = 10 + 5 * Math.abs(nx)}
							<text
								x={mx + (el.labelOffset?.dx ?? sign * nx * offset)}
								y={my + (el.labelOffset?.dy ?? sign * ny * offset)}
								class="label"
								style:fill={sty.color}
								stroke-width="3"
								paint-order="stroke">{el.label}</text
							>
						{/if}
					{/if}
				{:else if el.type === 'tangentVector'}
					{@const tvPos = tangentVectorPositions(el.id, figure)}
					{#if tvPos}
						{@const sv1 = transformer.mathToSvg(tvPos.tailX, tvPos.tailY)}
						{@const sv2 = transformer.mathToSvg(tvPos.headX, tvPos.headY)}
						{@const sx = sv1.x}
						{@const sy = sv1.y}
						{@const ex = sv2.x}
						{@const ey = sv2.y}
						{@const vdx = ex - sx}
						{@const vdy = ey - sy}
						{@const vlen = Math.sqrt(vdx * vdx + vdy * vdy)}
						{#if vlen >= 1}
							{@const angle = Math.atan2(vdy, vdx)}
							{@const arrowLen = 12}
							{@const arrowAngle = Math.PI / 7}
							{@const w1x = ex - arrowLen * Math.cos(angle - arrowAngle)}
							{@const w1y = ey - arrowLen * Math.sin(angle - arrowAngle)}
							{@const w2x = ex - arrowLen * Math.cos(angle + arrowAngle)}
							{@const w2y = ey - arrowLen * Math.sin(angle + arrowAngle)}
							{@const shaftX2 = (w1x + w2x) / 2}
							{@const shaftY2 = (w1y + w2y) / 2}
							<!-- Shaft -->
							<line
								x1={sx}
								y1={sy}
								x2={shaftX2}
								y2={shaftY2}
								style:stroke={sty.color}
								stroke-width={sty.strokeWidth}
								opacity={sty.opacity}
								pointer-events="none"
							/>
							<!-- Arrowhead -->
							<polygon
								points={`${Math.round(w1x * 100) / 100},${Math.round(w1y * 100) / 100} ${Math.round(ex * 100) / 100},${Math.round(ey * 100) / 100} ${Math.round(w2x * 100) / 100},${Math.round(w2y * 100) / 100}`}
								style:fill={sty.color}
								opacity={sty.opacity}
								pointer-events="none"
							/>
							{#if el.label}
								<text
									x={(sx + ex) / 2 + (el.labelOffset?.dx ?? 6)}
									y={(sy + ey) / 2 + (el.labelOffset?.dy ?? -8)}
									class="label"
									style:fill={sty.color}
									stroke-width="3"
									paint-order="stroke">{el.label}</text
								>
							{/if}
						{/if}
					{/if}
				{:else if el.type === 'conicPolar'}
					{@const svg = conicPolarToSVG(el.id, figure, transformer, dims)}
					{#if svg}
						<line
							x1={svg.x1}
							y1={svg.y1}
							x2={svg.x2}
							y2={svg.y2}
							style:stroke={sty.color}
							stroke-width={sty.strokeWidth}
							stroke-dasharray={sty.dashArray}
							stroke-linecap="round"
							opacity={sty.opacity}
							class="geo-line"
							class:hovered={hoveredId === el.id}
						/>
					{/if}
				{:else if el.type === 'integralArea'}
					{@const svg = el.secondFunctionId
						? integralAreaBetweenToSVG(el.id, figure, transformer, dims)
						: integralAreaToSVG(el.id, figure, transformer, dims)}
					{#if svg}
						{@const baseFillOpacity = sty.fillOpacity ?? 0.3}
						{#each svg.paths as p, i (i)}
							<path
								d={p.d}
								style:fill={sty.color}
								fill-opacity={el.signed
									? p.sign === 'positive'
										? baseFillOpacity
										: baseFillOpacity * 0.5
									: baseFillOpacity}
								style:stroke={sty.color}
								stroke-width={0.5}
								stroke-opacity={0.5}
								class="integral-area"
								class:hovered={hoveredId === el.id}
							/>
						{/each}
						{#each svg.infinityEdges ?? [] as edge, i (i)}
							{@const arrowLen = 18}
							{@const arrowHead = 5}
							{@const inset = 4}
							{@const minOffsetFromAxis = 22}
							{@const sign = edge.direction === 'right' ? 1 : -1}
							{@const dyArea = edge.yCurve - edge.yAxis}
							{@const signY = dyArea === 0 ? -1 : Math.sign(dyArea)}
							{@const arrowY =
								Math.abs(dyArea) > minOffsetFromAxis * 2
									? (edge.yAxis + edge.yCurve) / 2
									: edge.yAxis + signY * minOffsetFromAxis}
							{@const arrowTipX = edge.x - sign * inset}
							{@const arrowTailX = arrowTipX - sign * arrowLen}
							<g class="integral-area-infinity" pointer-events="none">
								<line
									x1={arrowTailX}
									y1={arrowY}
									x2={arrowTipX}
									y2={arrowY}
									style:stroke={sty.color}
									stroke-width={2}
									stroke-opacity={0.95}
								/>
								<polyline
									points={`${arrowTipX - sign * arrowHead},${arrowY - arrowHead} ${arrowTipX},${arrowY} ${arrowTipX - sign * arrowHead},${arrowY + arrowHead}`}
									fill="none"
									style:stroke={sty.color}
									stroke-width={2}
									stroke-opacity={0.95}
								/>
								<text
									x={arrowTailX - sign * 4}
									y={arrowY + 5}
									style:fill={sty.color}
									font-size="16"
									font-weight="bold"
									font-style="italic"
									opacity={0.95}
									text-anchor={edge.direction === 'right' ? 'end' : 'start'}>∞</text
								>
							</g>
						{/each}
					{/if}
				{:else if el.type === 'function'}
					{@const svg = functionToSVG(el.id, figure, transformer, dims)}
					{#if svg}
						<path
							d={svg.path}
							style:stroke={sty.color}
							stroke-width={sty.strokeWidth}
							stroke-dasharray={sty.dashArray}
							stroke-linecap="round"
							stroke-linejoin="round"
							opacity={sty.opacity}
							fill="none"
							class="function-curve"
							class:hovered={hoveredId === el.id}
						/>
						{#if svg.endpointMarkers}
							{#each svg.endpointMarkers as marker (marker.cx + ',' + marker.cy)}
								{#if marker.bracketType === 'closed'}
									<circle cx={marker.cx} cy={marker.cy} r={marker.r} style:fill={sty.color} />
								{:else}
									<circle
										cx={marker.cx}
										cy={marker.cy}
										r={marker.r}
										class="open-endpoint"
										style:stroke={sty.color}
										stroke-width="2"
									/>
								{/if}
							{/each}
						{/if}
						{#if el.label && el.type === 'function'}
							{@const labelX = viewport.xMin + 0.85 * (viewport.xMax - viewport.xMin)}
							{@const labelY = el.compiledFn({ x: labelX })}
							{#if typeof labelY === 'number' && Number.isFinite(labelY)}
								{@const svgPt = transformer.mathToSvg(labelX, labelY)}
								{@const slope = el.compiledDerivative({ x: labelX })}
								{@const s = typeof slope === 'number' && Number.isFinite(slope) ? slope : 0}
								{@const len = Math.sqrt(1 + s * s)}
								{@const nx = -s / len}
								{@const ny = 1 / len}
								{@const sign = ny > 0 ? -1 : 1}
								{@const offset = 10 + 5 * Math.abs(nx)}
								<text
									x={svgPt.x + (el.labelOffset?.dx ?? sign * nx * offset)}
									y={svgPt.y + (el.labelOffset?.dy ?? sign * ny * offset)}
									class="label"
									style:fill={sty.color}
									stroke-width="3"
									paint-order="stroke">{el.label}</text
								>
							{/if}
						{/if}
					{/if}
				{:else if el.type === 'parametricCurve'}
					{@const svg = parametricCurveToSVG(el.id, figure, transformer, dims)}
					{#if svg}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<path
							d={svg.path}
							style:stroke={sty.color}
							stroke-width={sty.strokeWidth}
							stroke-dasharray={sty.dashArray}
							stroke-linecap="round"
							stroke-linejoin="round"
							opacity={sty.opacity}
							style:fill={svg.closed && sty.fillColor ? sty.fillColor : 'none'}
							fill-opacity={svg.closed && sty.fillColor ? sty.fillOpacity : 0}
							class="function-curve"
							class:hovered={hoveredId === el.id}
							onmousemove={(e) => {
								const rect = (
									e.currentTarget as SVGElement
								).ownerSVGElement?.getBoundingClientRect();
								if (!rect) return;
								const svgX = e.clientX - rect.left;
								const svgY = e.clientY - rect.top;
								const math = transformer.svgToMath(svgX, svgY);
								const info = figure.queryParametricCurveAtCursor(el.id, math.x, math.y);
								if (info) {
									parametricHover = {
										curveId: el.id,
										t: info.t,
										x: info.x,
										y: info.y,
										svgX,
										svgY
									};
								}
							}}
							onmouseleave={() => {
								if (parametricHover?.curveId === el.id) parametricHover = null;
							}}
						/>
						{#if el.label}
							{@const labelPos = parametricCurveLabelPosition(el.id, figure, transformer)}
							{#if labelPos}
								<text
									x={labelPos.x + (el.labelOffset?.dx ?? 10)}
									y={labelPos.y + (el.labelOffset?.dy ?? -10)}
									class="label"
									style:fill={sty.color}
									stroke-width="3"
									paint-order="stroke">{el.label}</text
								>
							{:else}
								<text
									x={dims.width / 2 + (el.labelOffset?.dx ?? 10)}
									y={dims.height / 2 + (el.labelOffset?.dy ?? -10)}
									class="label"
									style:fill={sty.color}
									stroke-width="3"
									paint-order="stroke">{el.label}</text
								>
							{/if}
						{/if}
					{/if}
				{:else if el.type === 'quadraticCurve'}
					{@const svg = quadraticCurveToSVG(el.id, figure, transformer, dims)}
					{#if svg}
						{#if isRough(sty, el.type) && rc}
							{#each svg.paths as pathD, i (i)}
								<g opacity={sty.opacity} class="rough"
									>{@html roughArcHTML(rc, pathD, getRoughOpts(el.id, sty))}</g
								>
							{/each}
						{:else}
							{#each svg.paths as pathD, i (i)}
								<path
									d={pathD}
									style:stroke={sty.color}
									stroke-width={sty.strokeWidth}
									stroke-dasharray={sty.dashArray}
									stroke-linecap="round"
									stroke-linejoin="round"
									opacity={sty.opacity}
									fill="none"
									class="function-curve"
									class:hovered={hoveredId === el.id}
								/>
							{/each}
						{/if}
						{#if el.label}
							{@const center = el.conic.center ?? el.conic.vertex}
							{#if center}
								{@const svgPt = transformer.mathToSvg(center.x, center.y)}
								<text
									x={svgPt.x + (el.labelOffset?.dx ?? 10)}
									y={svgPt.y + (el.labelOffset?.dy ?? -10)}
									class="label"
									style:fill={sty.color}
									stroke-width="3"
									paint-order="stroke">{el.label}</text
								>
							{/if}
						{/if}
					{/if}
				{:else if el.type === 'implicitCurve'}
					{@const svg = implicitCurveToSVG(el.id, figure, transformer, dims)}
					{#if svg}
						{#if isRough(sty, el.type) && rc}
							{#each svg.paths as pathD, i (i)}
								<g opacity={sty.opacity} class="rough"
									>{@html roughArcHTML(rc, pathD, getRoughOpts(el.id, sty))}</g
								>
							{/each}
						{:else}
							{#each svg.paths as pathD, i (i)}
								<path
									d={pathD}
									style:stroke={sty.color}
									stroke-width={sty.strokeWidth}
									stroke-dasharray={sty.dashArray}
									stroke-linecap="round"
									stroke-linejoin="round"
									opacity={sty.opacity}
									fill="none"
									class="function-curve"
									class:hovered={hoveredId === el.id}
								/>
							{/each}
						{/if}
						{#if el.label}
							<text
								x={dims.width / 2 + (el.labelOffset?.dx ?? 10)}
								y={dims.height / 2 + (el.labelOffset?.dy ?? -10)}
								class="label"
								style:fill={sty.color}
								stroke-width="3"
								paint-order="stroke">{el.label}</text
							>
						{/if}
					{/if}
				{:else if el.type === 'locus'}
					{@const svg = locusToSVG(el.id, figure, transformer, dims)}
					{#if svg}
						<path
							d={svg.path}
							style:stroke={sty.color}
							stroke-width={sty.strokeWidth}
							stroke-dasharray={sty.dashArray}
							stroke-linecap="round"
							stroke-linejoin="round"
							opacity={sty.opacity}
							fill="none"
							class="function-curve"
							class:hovered={hoveredId === el.id}
						/>
						{#if el.label}
							<text
								x={dims.width / 2 + (el.labelOffset?.dx ?? 10)}
								y={dims.height / 2 + (el.labelOffset?.dy ?? -10)}
								class="label"
								style:fill={sty.color}
								stroke-width="3"
								paint-order="stroke">{el.label}</text
							>
						{/if}
					{/if}
				{:else if el.type === 'trace'}
					{@const svg = traceToSVG(el.id, figure, transformer)}
					{#if svg}
						<path
							d={svg.path}
							style:stroke={sty.color}
							stroke-width={sty.strokeWidth}
							stroke-dasharray={sty.dashArray}
							stroke-linecap="round"
							stroke-linejoin="round"
							opacity={sty.opacity}
							fill="none"
							class="function-curve"
							class:hovered={hoveredId === el.id}
						/>
					{/if}
				{/if}
			{/each}

			<!-- Arcs (between circles and points) -->
			{#each elements as el (`${el.id}_arc_${version}`)}
				{#if el.type === 'arcByAngles' || el.type === 'arcByPoints'}
					{@const svg = arcToSVG(el.id, figure, transformer)}
					{@const sty = resolveScreenStyle(el, figure.defaults)}
					{#if svg}
						{#if isRough(sty, el.type) && rc}
							<path
								d={svg.path}
								stroke="transparent"
								stroke-width="12"
								fill="none"
								pointer-events="stroke"
								class="arc"
								class:hovered={hoveredId === el.id}
							/>
							<g opacity={sty.opacity} class="rough"
								>{@html roughArcHTML(rc, svg.path, getRoughOpts(el.id, sty))}</g
							>
						{:else}
							<path
								d={svg.path}
								style:stroke={sty.color}
								stroke-width={sty.strokeWidth}
								stroke-dasharray={sty.dashArray}
								stroke-linecap="round"
								opacity={sty.opacity}
								fill="none"
								class="arc"
								class:hovered={hoveredId === el.id}
							/>
						{/if}
					{/if}
				{/if}
			{/each}

			<!-- Angles (first-class GeoAngle: arc / arcs2 / arcs3 / carre / aucune, sweep flips for kind='rentrant') -->
			{#each elements as el (`${el.id}_ang_${version}`)}
				{#if el.type === 'angle'}
					{@const svg = angleToSVG(el.id, figure, transformer)}
					{@const sty = resolveScreenStyle(el, figure.defaults)}
					{#if svg}
						{#if isRough(sty, el.type) && rc && svg.paths.length > 0}
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<g ondblclick={(e) => openPopoverFor(el.id, e)}>
								{#each svg.paths as path, i (i)}
									<path d={path} stroke="transparent" stroke-width="12" fill="none" />
								{/each}
								<g opacity={sty.opacity} class="rough"
									>{@html roughAngleHTML(rc, svg, getRoughOpts(el.id, sty))}</g
								>
							</g>
						{:else if svg.paths.length > 0}
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<g ondblclick={(e) => openPopoverFor(el.id, e)}>
								{#if svg.fillPath && sty.fillColor}
									<path
										d={svg.fillPath}
										style:fill={sty.fillColor}
										fill-opacity={sty.fillOpacity}
										stroke="none"
										class="angle-sector-fill"
									/>
								{/if}
								{#each svg.paths as path, i (i)}
									<path d={path} stroke="transparent" stroke-width="12" fill="none" />
									<path
										d={path}
										style:stroke={sty.color}
										stroke-width={sty.strokeWidth}
										stroke-dasharray={sty.dashArray}
										opacity={sty.opacity}
										fill="none"
										class="angle-mark"
									/>
								{/each}
							</g>
						{/if}
						{#if svg.label}
							<text
								x={svg.labelX}
								y={svg.labelY}
								style:fill={sty.color}
								stroke-width="3"
								paint-order="stroke"
								font-size="14"
								font-family="KaTeX_Main, serif"
								text-anchor="middle"
								dominant-baseline="middle"
								class="angle-label">{svg.label}</text
							>
						{/if}
					{/if}
				{/if}
			{/each}

			<!-- Points -->
			{#each elements as el (`${el.id}_${version}`)}
				{#if isPointElement(el)}
					{@const svg = pointToSVG(el.id, figure, transformer)}
					{@const sty = resolveScreenStyle(el, figure.defaults)}
					{#if svg}
						{#if sty.pointShape === 'dot'}
							<circle
								cx={svg.cx}
								cy={svg.cy}
								r={sty.pointSize}
								style:fill={sty.color}
								opacity={sty.opacity}
								class="point"
								class:draggable={canDragPoint(el)}
								class:hovered={hoveredId === el.id}
								class:dragging={isDragged(el)}
							/>
						{:else if sty.pointShape === 'circle'}
							<circle
								cx={svg.cx}
								cy={svg.cy}
								r={sty.pointSize}
								fill="none"
								style:stroke={sty.color}
								stroke-width={sty.strokeWidth}
								opacity={sty.opacity}
								class="point"
								class:draggable={canDragPoint(el)}
								class:hovered={hoveredId === el.id}
								class:dragging={isDragged(el)}
							/>
						{:else if sty.pointShape === 'cross'}
							<g
								class="point"
								class:draggable={canDragPoint(el)}
								class:hovered={hoveredId === el.id}
								class:dragging={isDragged(el)}
								opacity={sty.opacity}
							>
								<line
									x1={svg.cx - sty.pointSize}
									y1={svg.cy - sty.pointSize}
									x2={svg.cx + sty.pointSize}
									y2={svg.cy + sty.pointSize}
									style:stroke={sty.color}
									stroke-width={sty.strokeWidth}
								/>
								<line
									x1={svg.cx + sty.pointSize}
									y1={svg.cy - sty.pointSize}
									x2={svg.cx - sty.pointSize}
									y2={svg.cy + sty.pointSize}
									style:stroke={sty.color}
									stroke-width={sty.strokeWidth}
								/>
							</g>
						{:else if sty.pointShape === 'square'}
							<rect
								x={svg.cx - sty.pointSize}
								y={svg.cy - sty.pointSize}
								width={sty.pointSize * 2}
								height={sty.pointSize * 2}
								style:fill={sty.color}
								opacity={sty.opacity}
								class="point"
								class:draggable={canDragPoint(el)}
								class:hovered={hoveredId === el.id}
								class:dragging={isDragged(el)}
							/>
						{/if}
						<!-- Nom masqué (`labelHidden`, DSL `etiquette="aucune"`, carte de l'atelier) : le point reste -->
						{#if el.label && !el.labelHidden}
							{@const lx = svg.cx + (el.labelOffset?.dx ?? sty.pointSize + 4)}
							{@const ly = svg.cy + (el.labelOffset?.dy ?? -(sty.pointSize + 2))}
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<text
								x={lx}
								y={ly}
								class="label"
								class:label-dragging={draggingLabelId === el.id}
								style:fill={sty.color}
								stroke-width="3"
								paint-order="stroke"
								onpointerdown={(e) => onLabelPointerDown(e, el.id)}>{el.label}</text
							>
						{/if}
					{/if}
				{/if}
			{/each}

			<!-- Segment marks (on top of points so ticks are visible) -->
			{#each elements as el (`${el.id}_segm_${version}`)}
				{#if el.type === 'segmentMark'}
					{@const svg = segmentMarkToSVG(el.id, figure, transformer)}
					{@const sty = resolveScreenStyle(el, figure.defaults)}
					{#if svg}
						{#if isRough(sty, el.type) && rc}
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<g ondblclick={(e) => openPopoverFor(el.id, e)}>
								{#each svg.ticks as tick, i (i)}
									<line
										x1={tick.x1}
										y1={tick.y1}
										x2={tick.x2}
										y2={tick.y2}
										stroke="transparent"
										stroke-width="12"
									/>
								{/each}
								<g opacity={sty.opacity} class="rough"
									>{@html roughSegmentMarkHTML(rc, svg, getRoughOpts(el.id, sty))}</g
								>
							</g>
						{:else}
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<g ondblclick={(e) => openPopoverFor(el.id, e)}>
								{#each svg.ticks as tick, i (i)}
									<line
										x1={tick.x1}
										y1={tick.y1}
										x2={tick.x2}
										y2={tick.y2}
										stroke="transparent"
										stroke-width="12"
									/>
									<line
										x1={tick.x1}
										y1={tick.y1}
										x2={tick.x2}
										y2={tick.y2}
										style:stroke={sty.color}
										stroke-width={sty.strokeWidth}
										opacity={sty.opacity}
										class="segment-mark"
									/>
								{/each}
							</g>
						{/if}
					{/if}
				{/if}
			{/each}

			<!-- Text elements (on top of everything) -->
			{#each elements as el (`${el.id}_txt_${version}`)}
				{#if el.type === 'text'}
					{@const svg = textToSVG(el.id, figure, transformer)}
					{@const sty = resolveScreenStyle(el, figure.defaults)}
					{@const isDraggable = objectsMovable && !!el.position}
					{#if svg}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<g
							class:draggable-text={isDraggable}
							onpointerdown={isDraggable
								? (e) => {
										if (e.button !== 0) return;
										draggingId = el.id;
										const math = getMathCoords(e);
										dragOffset = math
											? { dx: el.position!.x - math.x, dy: el.position!.y - math.y }
											: null;
										figure.beginTransaction();
										capture(e);
										e.preventDefault();
										e.stopPropagation();
									}
								: undefined}
						>
							<rect
								x={svg.x - 4}
								y={svg.y - 12}
								width={svg.text.length * 8 + 8}
								height={16}
								rx={3}
								fill-opacity="0.85"
								class="text-bg"
							/>
							<text
								x={svg.x}
								y={svg.y}
								style:fill={sty.color}
								opacity={sty.opacity}
								class="geo-text">{svg.text}</text
							>
						</g>
					{/if}
				{/if}
			{/each}

			<!--
				Math text elements — uses convertLatexToMarkup() for static HTML rendering
				instead of the <math-span> web component. This eliminates the flicker that
				occurred during drag operations: the {#each} key includes `version`, which
				forces Svelte to destroy/recreate elements on every mutation. Recreating a
				web component (Shadow DOM + IntersectionObserver + LaTeX parse) is slow
				enough to cause visible disappearance, while recreating static HTML via
				{@html} is instantaneous.
			-->
			{#each elements as el (`${el.id}_mtxt_${version}`)}
				{#if el.type === 'mathText'}
					{@const svg = textToSVG(el.id, figure, transformer)}
					{@const isDraggable = objectsMovable && !!el.position}
					{#if svg}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<g
							class:draggable-text={isDraggable}
							onpointerdown={isDraggable
								? (e) => {
										if (e.button !== 0) return;
										draggingId = el.id;
										const math = getMathCoords(e);
										dragOffset = math
											? { dx: el.position!.x - math.x, dy: el.position!.y - math.y }
											: null;
										figure.beginTransaction();
										capture(e);
										e.preventDefault();
										e.stopPropagation();
									}
								: undefined}
						>
							<foreignObject x={svg.x - 4} y={svg.y - 36} width="250" height="64">
								<div class="geo-html-label" style="display:flex; align-items:center;">
									{@html convertLatexToMarkup(svg.text, { defaultMode: 'inline-math' })}
								</div>
							</foreignObject>
						</g>
					{/if}
				{/if}
			{/each}

			<!--
				Rich text elements — same static HTML approach as mathText above.
				Uses inlineNodesToHTML() instead of the InlineRenderer component to avoid
				the chain InlineRenderer → MathInline → <math-span> which has the same
				web component lifecycle overhead.
			-->
			{#each elements as el (`${el.id}_rtxt_${version}`)}
				{#if el.type === 'richText'}
					{@const svg = textToSVG(el.id, figure, transformer)}
					{@const isDraggable = objectsMovable && !!el.position}
					{#if svg}
						{@const inlineNodes = parseInlineNodes(svg.text)}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<g
							class:draggable-text={isDraggable}
							onpointerdown={isDraggable
								? (e) => {
										if (e.button !== 0) return;
										draggingId = el.id;
										const math = getMathCoords(e);
										dragOffset = math
											? { dx: el.position!.x - math.x, dy: el.position!.y - math.y }
											: null;
										figure.beginTransaction();
										capture(e);
										e.preventDefault();
										e.stopPropagation();
									}
								: undefined}
						>
							<foreignObject x={svg.x - 4} y={svg.y - 20} width="350" height="32">
								<div class="geo-html-label">
									{@html inlineNodesToHTML(inlineNodes)}
								</div>
							</foreignObject>
						</g>
					{/if}
				{/if}
			{/each}

			<!-- Foreground images (default layer) -->
			{#each elements as el (`${el.id}_img_${version}`)}
				{#if el.type === 'image' && el.layer !== 'fond'}
					{@const svg = imageToSVG(el.id, figure, transformer)}
					{@const sty = resolveScreenStyle(el, figure.defaults)}
					{@const isDraggable = objectsMovable && !!el.position}
					{#if svg}
						{@const imgCx2 = svg.x + svg.width / 2}
						{@const imgCy2 = svg.y + (svg.height ?? svg.width) / 2}
						{@const imgRot2 = (-(svg.rotation ?? 0) * 180) / Math.PI}
						{@const imgSx2 = svg.flipped ? -1 : 1}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<g
							class:draggable-text={isDraggable}
							onpointerdown={isDraggable
								? (e: PointerEvent) => {
										if (e.button !== 0) return;
										draggingId = el.id;
										const math = getMathCoords(e);
										dragOffset = math
											? { dx: el.position!.x - math.x, dy: el.position!.y - math.y }
											: null;
										figure.beginTransaction();
										capture(e);
										e.preventDefault();
										e.stopPropagation();
									}
								: undefined}
						>
							<image
								href={svg.url}
								x={svg.x}
								y={svg.y}
								width={svg.width}
								height={svg.height}
								opacity={sty.opacity ?? 1}
								preserveAspectRatio="xMidYMid meet"
								transform={imgRot2 !== 0 || imgSx2 < 0
									? `translate(${imgCx2},${imgCy2}) rotate(${imgRot2}) scale(1,${imgSx2}) translate(${-imgCx2},${-imgCy2})`
									: undefined}
							/>
						</g>
					{/if}
				{/if}
			{/each}
		</g>

		<!-- Calque au-dessus des objets (fantôme d'une construction en cours) -->
		{#if overlay}
			<g class="overlay">{@render overlay({ viewport, width, height })}</g>
		{/if}
	</svg>

	{#if sliders.length > 0}
		<div class="sliders-panel">
			{#each sliders as slider (slider.id)}
				<SliderControl
					label={slider.label ?? slider.id}
					value={slider.value}
					min={slider.min}
					max={slider.max}
					step={slider.step}
					onchange={(v) => handleSliderChange(slider.id, v)}
				/>
			{/each}
		</div>
	{/if}

	{#if popoverElement}
		<ElementPopover
			element={popoverElement}
			{figure}
			x={popoverX}
			y={popoverY}
			onclose={closePopover}
			onchange={() => version++}
		/>
	{/if}

	{#if parametricHover}
		<div
			class="parametric-tooltip"
			style:left="{parametricHover.svgX + 12}px"
			style:top="{parametricHover.svgY - 28}px"
		>
			t = {parametricHover.t.toFixed(2)} ; ({parametricHover.x.toFixed(2)}, {parametricHover.y.toFixed(
				2
			)})
		</div>
	{/if}
</div>

<style>
	/*
	 * Habillage sur les tokens du thème (lot 2) : le fond suit celui des cartes.
	 * Pas de style inline ici, pour que les états (survol…) restent maîtres.
	 */
	.geometry-canvas {
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		background: var(--color-card);
		touch-action: none;
		user-select: none;
	}

	.parametric-tooltip {
		position: absolute;
		background: var(--color-popover);
		color: var(--color-popover-foreground);
		border: 1px solid var(--color-border);
		font-family: monospace;
		font-size: 0.75rem;
		padding: 4px 8px;
		border-radius: 4px;
		pointer-events: none;
		white-space: nowrap;
		z-index: 10;
	}

	.geometry-canvas.interactive {
		cursor: default;
	}

	/* Un outil de construction (atelier) : on vise, on ne saisit pas */
	.geometry-canvas.interactive.tool {
		cursor: crosshair;
	}

	.geometry-canvas.dragging {
		cursor: grabbing;
	}

	.geometry-canvas.panning {
		cursor: grab;
	}

	.geometry-canvas.panning.dragging {
		cursor: grabbing;
	}

	.sliders-panel {
		border-top: 1px solid var(--color-border);
		padding: 0.25rem 0;
		background: var(--color-muted);
		border-radius: 0 0 0.375rem 0.375rem;
	}

	.grid-line-minor {
		stroke: var(--color-border);
		stroke-width: 0.3;
	}

	.grid-line {
		stroke: var(--color-border);
		stroke-width: 0.5;
	}

	.grid-line.axis {
		stroke: var(--color-muted-foreground);
		stroke-width: 1.5;
	}

	.graduation {
		font-size: 11px;
		font-family: 'KaTeX_Main', serif;
		fill: var(--color-muted-foreground);
		pointer-events: none;
	}

	.segment.hovered,
	.geo-line.hovered,
	.ray.hovered,
	.vector.hovered,
	.circle.hovered,
	.function-curve.hovered {
		filter: brightness(1.3);
		stroke-width: 4;
		cursor: pointer;
	}

	.vector.hovered {
		cursor: grab;
	}

	.angle-mark:hover,
	.segment-mark:hover {
		filter: brightness(1.3);
		stroke-width: 3;
		cursor: pointer;
	}

	.point.draggable {
		cursor: grab;
	}

	/*
	 * États : la couleur d'auteur est peinte en `style:` (inline). `!important`
	 * fait gagner le surlignage sur ce style inline — pour les points dont
	 * l'élément `.point` porte lui-même le contour (cercle, point plein). Un point
	 * en croix n'est PAS surligné : `.point` est sur le <g>, ses <line> ont leur
	 * propre couleur, qui l'emporte sur l'héritage (comme avant le lot 2).
	 */
	.point.draggable:hover,
	.point.hovered {
		stroke: var(--color-warning) !important;
		stroke-width: 2;
		r: 7;
	}

	.point.dragging {
		stroke: var(--color-warning) !important;
		stroke-width: 3;
		r: 8;
		cursor: grabbing;
	}

	/* Halo des étiquettes : la couleur du fond de la figure */
	.label,
	.angle-label {
		stroke: var(--color-card);
	}

	.open-endpoint {
		fill: var(--color-card);
	}

	.label {
		font-size: 14px;
		font-family: 'KaTeX_Main', serif;
		cursor: grab;
	}

	.label:hover {
		filter: brightness(1.3);
	}

	.label-dragging {
		cursor: grabbing;
	}

	.geo-text {
		font-size: 12px;
		font-family: 'KaTeX_Main', serif;
		pointer-events: none;
	}

	.text-bg {
		fill: var(--color-card);
		pointer-events: none;
	}

	.geo-html-label {
		color: var(--color-popover-foreground);
		background: color-mix(in srgb, var(--color-popover) 92%, transparent);
		font-size: 14px;
		padding: 2px 6px;
		border-radius: 4px;
		width: fit-content;
	}

	.draggable-text {
		cursor: grab;
	}

	.draggable-text :global(*) {
		pointer-events: auto;
	}

	.draggable-text:active {
		cursor: grabbing;
	}
</style>
