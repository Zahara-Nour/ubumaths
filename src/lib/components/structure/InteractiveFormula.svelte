<!--
	Formule interactive : écrire, explorer, déplacer
	================================================

	Spécification F du glisser-déposer (`docs/wip/structure-glisser-deposer-progress.md`).
	La formule est rendue par MathLive dans la page (`convertLatexToMarkup`, pas de
	shadow DOM) : elle se redessine à chaque image pendant un déplacement.

	- Survol (`explore`, règles A) : la plus profonde sous-expression dont le cadre
	  contient le pointeur est encadrée. Les cadres sont imbriqués
	  (`frame-geometry.ts`) : sur la bordure du cadre de `2x`, hors des cadres de
	  `2` et de `x`, on vise `2x`. Si c'est une partie (terme, facteur, membre),
	  son groupe passe sur un fond clair avec son nom.
	- Clic court : la formule devient un champ de saisie, curseur au même endroit ;
	  Entrée ou un clic ailleurs garde la saisie (`onedit`), Échap l'annule.
	- Appui sur une partie puis mouvement (`move`) : elle part sur une carte, une
	  boîte de dépôt s'ouvre à la place visée (`\hspace` animé), l'expression
	  s'élargit ; hors du groupe, la carte s'arrête au bord ; Échap la ramène. Au
	  lâcher, `onmove` reçoit l'expression réécrite (`rearrange.ts`).
	- Tactile (`touch`) : cadres des parties toujours visibles, bordures larges,
	  formule écartée autour des parties.
-->
<script lang="ts">
	import { convertLatexToMarkup, type MathfieldElement } from 'mathlive';
	import { onDestroy } from 'svelte';
	import {
		cardLatex,
		expressionLatex,
		findMarkerBlock,
		GAP_CLASS_PREFIX,
		markerIdFromClasses,
		MARKER_PREFIX,
		movableGroupOf,
		movedLatex,
		reorder,
		stripMarkers,
		withoutPart,
		type ExpressionStructure,
		type MovableGroup,
		type MovablePart
	} from '$lib/mathAST/structure';
	import { computeFrames, frameAt, fractionLimits, type Box } from './frame-geometry';

	// Types
	interface Props {
		/** Ce qui est écrit (affiché tel quel si `structure` est absente) */
		latex: string;
		/** La structure de `latex` ; absente : expression vide, incomplète ou non reconnue */
		structure: ExpressionStructure | null;
		/** Cadres au survol */
		explore?: boolean;
		/** Glisser les parties */
		move?: boolean;
		/** La partie saisie monte au-dessus de la ligne */
		lift?: boolean;
		/** Mode tactile : cadres visibles, bordures larges, formule écartée */
		touch?: boolean;
		/** Élève de 6e ou avant (G6, E5.4) */
		beforeFifthGrade?: boolean;
		/** Encadrer aussi un nombre ou une lettre seuls */
		frameLeaves?: boolean;
		/** Encadrer aussi les sous-expressions englobantes */
		showAncestors?: boolean;
		/** Sous-expression survolée (lisible par le parent : lecture survolée) */
		selectedId?: number | null;
		/** Imposée de l'extérieur (survol d'un mot de la lecture) */
		highlightId?: number | null;
		label?: string;
		onmove?: (latex: string) => void;
		onedit?: (latex: string) => void;
	}

	interface Pending {
		pointerId: number;
		startX: number;
		startY: number;
		group: MovableGroup | null;
		from: number;
	}

	interface Drag {
		pointerId: number;
		structure: ExpressionStructure;
		group: MovableGroup;
		from: number;
		part: MovablePart;
		remaining: MovablePart[];
		phantom: string;
		/** Largeur de l'espace à chaque place, en em */
		widths: number[];
		gaps: number[];
		target: number;
		grabX: number;
		grabY: number;
		boxes: HTMLDivElement[];
		boxTop: number;
		boxHeight: number;
		lastFrame: number | null;
		raf: number | null;
	}

	/** Cadres en em ; convertis en pixels à la mesure */
	interface FrameEm {
		padX: number;
		padY: number;
		band: number;
		groupPad: number;
	}

	// Constantes
	const DRAG_THRESHOLD_PX = 4;
	const EASING_MS = 70;
	const SETTLE_MS = 150;
	const LIFT_MS = 120;
	const LIFT_RATIO = 0.95;
	const BOX_INSET_EM = 0.06;
	const BOX_PAD_EM = 0.1;
	const BOX_MIN_PX = 6;
	/** Marge où la carte peut aller autour du groupe, en em (G5 : elle s'arrête au bord) */
	const CARD_MARGIN_EM = 0.6;
	const SIBLING_SHARE = 0.4;
	const FRAME_EM: Record<'mouse' | 'touch', FrameEm> = {
		mouse: { padX: 0.06, padY: 0.06, band: 0.2, groupPad: 0.3 },
		touch: { padX: 0.08, padY: 0.08, band: 0.3, groupPad: 0.3 }
	};

	let {
		latex,
		structure,
		explore = true,
		move = false,
		lift = true,
		touch = false,
		beforeFifthGrade = false,
		frameLeaves = true,
		showAncestors = false,
		selectedId = $bindable(null),
		highlightId = null,
		label = 'Expression',
		onmove,
		onedit
	}: Props = $props();

	// Variables
	/** Parties déplaçables et leur niveau (nombre de niveaux de parties contenues) */
	const movable = $derived(
		structure && explore && move ? movableLevels(structure) : new Map<number, number>()
	);

	let wrapper = $state<HTMLDivElement>();
	let stage = $state<HTMLDivElement>();
	let probe = $state<HTMLDivElement>();
	let floating = $state<HTMLDivElement>();
	let boxLayer = $state<HTMLDivElement>();
	let outlineLayer = $state<HTMLDivElement>();
	let ancestorLayer = $state<HTMLDivElement>();
	let groupFrame = $state<HTMLDivElement>();
	let groupLabel = $state<HTMLDivElement>();
	let partFrame = $state<HTMLDivElement>();
	let isDragging = $state(false);
	/** Clic court : le curseur va au même endroit relatif (0 : bord gauche, 1 : bord droit) */
	let editAt = $state<{ rx: number; ry: number } | null>(null);

	// Hors réactivité : modifié à chaque image
	let pending: Pending | null = null;
	let drag: Drag | null = null;
	let settling = false;
	/** Cadres du dernier rendu, relatifs au champ ; vidé à chaque rendu */
	let frameCache: Map<number, Box> | null = null;
	/** Pose en cours (150 ms) : annulée au démontage */
	let settleTimer: ReturnType<typeof setTimeout> | null = null;

	// Rendu au repos (et après un déplacement, un changement de réglage)
	$effect(() => {
		if (!stage || drag || settling || editAt) return;
		stage.innerHTML = latex.trim() ? convertLatexToMarkup(display(structure?.latex ?? latex)) : '';
		frameCache = null;
		drawOutlines();
		showFrames(null);
	});

	// Sens inverse : un mot de la lecture survolé encadre sa sous-expression
	$effect(() => {
		if (drag || settling || editAt) return;
		// Le mot quitté : l'encadré imposé s'efface
		showFrames(highlightId !== null && frameable(highlightId) ? highlightId : null, false);
	});

	// Fonctions
	function mode(): 'mouse' | 'touch' {
		return touch ? 'touch' : 'mouse';
	}

	function rearrange() {
		return { beforeFifthGrade };
	}

	function movableLevels(s: ExpressionStructure): Map<number, number> {
		const out = new Map<number, number>();
		const visit = (id: number): number => {
			let deepest = 0;
			for (const child of s.nodes[id].children) {
				const d = visit(child);
				deepest = Math.max(deepest, isMovable(s, child) ? d + 1 : d);
			}
			if (isMovable(s, id)) out.set(id, deepest);
			return deepest;
		};
		visit(s.root);
		return out;
	}

	function isMovable(s: ExpressionStructure, id: number): boolean {
		return movableGroupOf(s, id, rearrange()) !== null;
	}

	/** Un nombre ou une lettre seuls ne s'encadrent pas si le réglage est décoché */
	function frameable(id: number): boolean {
		const node = structure?.nodes[id];
		if (!node) return false;
		return frameLeaves || node.children.length > 0 || node.parent === null;
	}

	/**
	 * Le LaTeX affiché. Mode tactile : un espace autour de chaque partie
	 * déplaçable, à la mesure de sa bordure, pour que les cadres voisins ne se
	 * chevauchent pas et qu'une bordure se vise au doigt. Ailleurs : tel quel.
	 */
	function display(latexToShow: string): string {
		return touch && movable.size > 0 ? spaced(latexToShow) : latexToShow;
	}

	function spaced(latexToShow: string): string {
		const em = FRAME_EM.touch;
		let out = '';
		let i = 0;
		while (i < latexToShow.length) {
			const match = new RegExp(`^\\\\class\\{${MARKER_PREFIX}(\\d+)\\}\\{`).exec(
				latexToShow.slice(i)
			);
			const id = match ? Number(match[1]) : null;
			const block = id === null ? null : findMarkerBlock(latexToShow.slice(i), id);
			if (id === null || !block) {
				out += latexToShow[i];
				i++;
				continue;
			}
			const inner = spaced(latexToShow.slice(i + block.contentStart, i + block.contentEnd));
			const marked = `${latexToShow.slice(i, i + block.contentStart)}${inner}}`;
			const level = movable.get(id);
			if (level === undefined) out += marked;
			else {
				const width = em.padX + level * em.band;
				const space = `\\mathord{\\hspace{${width.toFixed(3)}em}}`;
				out += `${space}${marked}${space}`;
			}
			i += block.end;
		}
		return out;
	}

	function markerElement(root: HTMLElement, id: number): HTMLElement | null {
		return root.querySelector<HTMLElement>(`.${MARKER_PREFIX}${id}`);
	}

	function emPx(): number {
		return wrapper ? parseFloat(getComputedStyle(wrapper).fontSize) : 16;
	}

	function union(a: DOMRect, b: DOMRect): DOMRect {
		const left = Math.min(a.left, b.left);
		const top = Math.min(a.top, b.top);
		return new DOMRect(
			left,
			top,
			Math.max(a.right, b.right) - left,
			Math.max(a.bottom, b.bottom) - top
		);
	}

	/** L'élément est-il dessiné par la sous-expression `id` (ou un descendant) ? */
	function belongsTo(element: Element | null, id: number): boolean {
		if (!structure) return true;
		const marker = element?.closest(`[class*="${MARKER_PREFIX}"]`);
		let owner = marker ? markerIdFromClasses(marker.classList) : null;
		while (owner !== null) {
			if (owner === id) return true;
			owner = structure.nodes[owner]?.parent ?? null;
		}
		return false;
	}

	/**
	 * Zone des caractères, caractère par caractère : la boîte d'un élément compte
	 * les cales invisibles de MathLive (dans une fraction, elles débordent sur la
	 * barre). `id` : seuls comptent ses caractères et ceux de ses descendants
	 * (l'exposant de `(x + 1)²` est logé dans le marqueur de la parenthèse). Les
	 * espaces du glisser comptent par leur largeur, leur fantôme (`\vphantom`) non.
	 */
	function contentRect(element: Element, id: number | null = null): DOMRect | null {
		const gapSelector = `[class^="${GAP_CLASS_PREFIX}"]`;
		const range = document.createRange();
		let rect: DOMRect | null = null;
		const add = (r: DOMRect) => {
			if (r.width === 0 && r.height === 0) return;
			rect = rect ? union(rect, r) : r;
		};
		const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
		for (let node = walker.nextNode(); node; node = walker.nextNode()) {
			// U+200B : MathLive en pose dans `ML__vlist-s` ; `trim` le garde
			if (!node.textContent?.replace(/\u200b/g, '').trim()) continue;
			if (node.parentElement?.closest(gapSelector)) continue;
			if (id !== null && !belongsTo(node.parentElement, id)) continue;
			range.selectNodeContents(node);
			for (const r of range.getClientRects()) add(r);
		}
		for (const extra of element.querySelectorAll('svg, .ML__frac-line')) {
			if (extra.closest(gapSelector) || (id !== null && !belongsTo(extra, id))) continue;
			add(extra.getBoundingClientRect());
		}
		for (const gap of element.querySelectorAll(gapSelector)) {
			const g = gap.getBoundingClientRect();
			if (g.width === 0) continue;
			const base: DOMRect = rect ?? g;
			add(new DOMRect(g.left, base.top, g.width, base.height));
		}
		return rect;
	}

	function nodeRect(id: number): DOMRect | null {
		const element = stage ? markerElement(stage, id) : null;
		return element ? contentRect(element, id) : null;
	}

	/** Cadres de toutes les sous-expressions, relatifs au champ (calculés une fois par rendu) */
	function frames(): Map<number, Box> {
		if (frameCache) return frameCache;
		const out = new Map<number, Box>();
		if (!structure || !wrapper) return out;
		const w = wrapper.getBoundingClientRect();
		const rects = new Map<number, Box>();
		for (const node of structure.nodes) {
			const r = nodeRect(node.id);
			if (r) {
				rects.set(node.id, {
					left: r.left - w.left,
					top: r.top - w.top,
					right: r.right - w.left,
					bottom: r.bottom - w.top
				});
			}
		}
		const em = emPx();
		const f = FRAME_EM[mode()];
		frameCache = computeFrames(structure.nodes, rects, {
			padX: f.padX * em,
			padY: f.padY * em,
			band: f.band * em,
			siblingShare: SIBLING_SHARE,
			groupPad: f.groupPad * em
		});
		return frameCache;
	}

	function invalidateFrames() {
		frameCache = null;
	}

	/** Fenêtre redimensionnée (rotation d'une tablette) : les contours se recalent */
	function handleResize() {
		frameCache = null;
		if (!drag && !settling) drawOutlines();
	}

	onDestroy(() => {
		if (settleTimer) clearTimeout(settleTimer);
		if (drag?.raf) cancelAnimationFrame(drag.raf);
		drag = null;
	});

	/** Pose un cadre (coordonnées relatives au champ) ; `null` : le cache */
	function placeFrame(element: HTMLElement | undefined, box: Box | null | undefined) {
		if (!element) return;
		if (!box) {
			element.hidden = true;
			return;
		}
		element.hidden = false;
		element.style.transform = `translate(${box.left}px, ${box.top}px)`;
		element.style.width = `${box.right - box.left}px`;
		element.style.height = `${box.bottom - box.top}px`;
	}

	/** « somme · 3 termes », « produit · 2 facteurs », « égalité · 2 membres » */
	function groupName(group: MovableGroup): string {
		const count = group.parts.length;
		if (group.kind === 'product') return `produit · ${count} facteurs`;
		if (group.kind === 'equality') return `égalité · ${count} membres`;
		const node = structure?.nodes[group.id];
		return `${node?.kind === 'difference' ? 'différence' : 'somme'} · ${count} termes`;
	}

	function showGroupPanel(group: MovableGroup | null, box: Box | null = null) {
		placeFrame(groupFrame, group ? (box ?? frames().get(group.id)) : null);
		if (!group || !structure) return;
		if (groupLabel) groupLabel.textContent = groupName(group);
		const rects = new Map<number, Box>(frames());
		const below = fractionLimits(structure.nodes, rects, group.id).inDenominator;
		groupFrame?.classList.toggle('label-below', below);
	}

	/**
	 * Encadre `id` (et ses englobantes si réglé) ; le fond de son groupe si c'est
	 * une partie. `hovered` faux : imposé par la lecture, ce n'est pas un survol.
	 */
	function showFrames(id: number | null, hovered = true) {
		if (hovered) selectedId = id;
		if (wrapper) {
			if (id === null) delete wrapper.dataset.framedId;
			else wrapper.dataset.framedId = String(id);
		}
		const box = id === null ? null : frames().get(id);
		placeFrame(partFrame, box);
		drawAncestors(id);
		const group =
			id !== null && structure && move && movable.has(id)
				? movableGroupOf(structure, id, rearrange())
				: null;
		showGroupPanel(group);
		wrapper?.classList.toggle('can-grab', group !== null);
	}

	function drawAncestors(id: number | null) {
		if (!ancestorLayer) return;
		const out: HTMLDivElement[] = [];
		if (showAncestors && id !== null && structure) {
			for (let p = structure.nodes[id].parent; p !== null; p = structure.nodes[p].parent) {
				const element = document.createElement('div');
				element.className = 'structure-frame ancestor';
				placeFrame(element, frames().get(p));
				out.push(element);
			}
		}
		ancestorLayer.replaceChildren(...out);
	}

	/** Au doigt : les cadres de toutes les parties déplaçables (rien ne se survole) */
	function drawOutlines() {
		if (!outlineLayer) return;
		const out: HTMLDivElement[] = [];
		if (touch) {
			for (const id of movable.keys()) {
				const element = document.createElement('div');
				element.className = 'part-outline';
				placeFrame(element, frames().get(id));
				out.push(element);
			}
		}
		outlineLayer.replaceChildren(...out);
	}

	function targetAt(event: PointerEvent): number | null {
		if (!structure || !wrapper || !explore) return null;
		const w = wrapper.getBoundingClientRect();
		return frameAt(
			structure.nodes,
			frames(),
			event.clientX - w.left,
			event.clientY - w.top,
			frameable
		);
	}

	function handlePointerMove(event: PointerEvent) {
		if (editAt) return;
		if (!pending && !drag && !settling) {
			if (event.pointerType === 'mouse' && highlightId === null) showFrames(targetAt(event));
			return;
		}
		if (pending && !drag && event.pointerId === pending.pointerId) {
			const p = pending;
			const distance = Math.hypot(event.clientX - p.startX, event.clientY - p.startY);
			if (distance < DRAG_THRESHOLD_PX) return;
			pending = null;
			// Appui hors de toute partie, puis mouvement : rien
			if (!p.group) return;
			beginDrag(p, p.group, event);
		}
		if (!drag || event.pointerId !== drag.pointerId) return;
		const point = clampToGroup(drag, event);
		moveFloating(drag, point);
		const target = targetSlot(drag, point.x);
		if (target !== drag.target) {
			drag.target = target;
			if (drag.raf === null) drag.raf = requestAnimationFrame(animate);
		}
	}

	function handlePointerDown(event: PointerEvent) {
		if (drag || settling || editAt || event.button !== 0) return;
		const id = targetAt(event);
		if (event.pointerType === 'mouse') showFrames(id);
		const group =
			id !== null && structure && move && movable.has(id)
				? movableGroupOf(structure, id, rearrange())
				: null;
		pending = {
			pointerId: event.pointerId,
			startX: event.clientX,
			startY: event.clientY,
			group,
			from: group ? group.parts.findIndex((part) => part.id === id) : -1
		};
		try {
			wrapper?.setPointerCapture(event.pointerId);
		} catch {
			// Pointeur déjà relâché (événement synthétique) : la capture est facultative
		}
		// Sans déplacement possible, le doigt garde le défilement de la page
		if (move) event.preventDefault();
	}

	function handlePointerUp(event: PointerEvent) {
		if (pending && event.pointerId === pending.pointerId) {
			pending = null;
			// Clic court : le curseur se place là
			if (event.type === 'pointerup') startEditing(event);
			return;
		}
		if (drag && event.pointerId === drag.pointerId) drop(drag);
	}

	/** Geste annulé par le système : comme Échap, rien ne change (E2.5) */
	function handlePointerCancel(event: PointerEvent) {
		if (pending && event.pointerId === pending.pointerId) pending = null;
		if (drag && event.pointerId === drag.pointerId) {
			drag.target = drag.from;
			drop(drag);
		}
	}

	/** Au clavier : Entrée ouvre la saisie, curseur en fin d'expression */
	function handleFieldKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter' || editAt || drag || event.target !== wrapper) return;
		event.preventDefault();
		showFrames(null);
		editAt = { rx: 1, ry: 0.5 };
	}

	function startEditing(event: PointerEvent) {
		showFrames(null);
		const formula = stage?.firstElementChild;
		const r = formula ? contentRect(formula) : null;
		editAt = r
			? {
					rx: (event.clientX - r.left) / Math.max(1, r.width),
					ry: (event.clientY - r.top) / Math.max(1, r.height)
				}
			: { rx: 1, ry: 0.5 };
	}

	function handleKeydown(event: KeyboardEvent) {
		// E2.5 : Échap pendant un déplacement, la partie revient à sa place
		if (event.key === 'Escape' && drag) {
			drag.target = drag.from;
			drop(drag);
		}
	}

	/** Mesure hors écran : largeur du groupe une fois `latexToMeasure` rendu */
	function measureGroup(latexToMeasure: string, groupId: number): number {
		if (!probe) return 0;
		probe.innerHTML = convertLatexToMarkup(display(latexToMeasure));
		const element = markerElement(probe, groupId);
		return element ? (contentRect(element)?.width ?? 0) : 0;
	}

	function beginDrag(p: Pending, group: MovableGroup, event: PointerEvent) {
		if (!structure || !stage || !floating || !wrapper || !boxLayer) return;
		const s = structure;
		const part = group.parts[p.from];
		const remaining = withoutPart(group.parts, p.from);
		const measure = (parts: readonly MovablePart[], gaps: readonly number[] = []) =>
			measureGroup(expressionLatex(s, group, parts, { gaps }), group.id);
		const baseWidth = measure(remaining);
		const unitGaps: number[] = [];
		unitGaps[remaining.length] = 10;
		const pxPerEm = (measure(remaining, unitGaps) - baseWidth) / 10 || emPx();
		const widths = group.parts.map(
			(_, k) => (measure(reorder(group.parts, p.from, k)) - baseWidth) / pxPerEm
		);
		const gaps = widths.map((w, k) => (k === p.from ? w : 0));

		// La carte, posée exactement sur la partie qu'elle emporte
		const termElement = markerElement(stage, part.id);
		const termRect = termElement ? contentRect(termElement, part.id) : null;
		floating.innerHTML = convertLatexToMarkup(stripMarkers(cardLatex(group, part)));
		floating.style.transition = 'none';
		floating.style.transform = 'translate(0px, 0px)';
		floating.style.top = '0px';
		floating.classList.remove('landing');
		floating.hidden = false;
		const w = wrapper.getBoundingClientRect();
		const inner = floating.firstElementChild ?? floating;
		const floatRect = contentRect(inner) ?? inner.getBoundingClientRect();
		const floatBox = floating.getBoundingClientRect();
		const left = termRect
			? termRect.right - (floatRect.right - floatBox.left) - w.left
			: event.clientX - w.left;
		const top = termRect
			? termRect.top +
				termRect.height / 2 -
				(floatRect.top + floatRect.height / 2 - floatBox.top) -
				w.top
			: event.clientY - w.top;

		const pad = BOX_PAD_EM * emPx();
		const boxes = widths.map(() => {
			const box = document.createElement('div');
			box.className = 'drop-box';
			box.hidden = true;
			return box;
		});
		boxLayer.replaceChildren(...boxes);
		outlineLayer?.replaceChildren();
		ancestorLayer?.replaceChildren();
		placeFrame(partFrame, null);

		drag = {
			pointerId: p.pointerId,
			structure: s,
			group,
			from: p.from,
			part,
			remaining,
			phantom: stripMarkers(part.marked),
			widths,
			gaps,
			target: p.from,
			grabX: left - (event.clientX - w.left),
			grabY: top - (event.clientY - w.top),
			boxes,
			boxTop: (termRect ? termRect.top - w.top : top) - pad,
			boxHeight: (termRect ? termRect.height : floatRect.height) + 2 * pad,
			lastFrame: null,
			raf: null
		};
		isDragging = true;
		renderLive(drag);
		moveFloating(drag, { x: event.clientX, y: event.clientY });
		if (lift) {
			// La carte monte en douceur : `top` s'anime, `transform` suit le pointeur
			void floating.offsetWidth;
			floating.style.transition = `top ${LIFT_MS}ms ease-out`;
			floating.style.top = `${-LIFT_RATIO * drag.boxHeight}px`;
		}
	}

	/** G5 : hors du groupe, la carte s'arrête au bord, au plus près du pointeur */
	function clampToGroup(d: Drag, event: PointerEvent): { x: number; y: number } {
		const group = nodeRect(d.group.id);
		if (!group) return { x: event.clientX, y: event.clientY };
		const margin = CARD_MARGIN_EM * emPx();
		return {
			x: Math.min(Math.max(event.clientX, group.left - margin), group.right + margin),
			y: Math.min(Math.max(event.clientY, group.top - margin), group.bottom + margin)
		};
	}

	function moveFloating(d: Drag, point: { x: number; y: number }) {
		if (!floating || !wrapper) return;
		const w = wrapper.getBoundingClientRect();
		floating.style.transform = `translate(${point.x - w.left + d.grabX}px, ${point.y - w.top + d.grabY}px)`;
	}

	/** Place visée : avant la première partie restante dont le milieu est à droite du point */
	function targetSlot(d: Drag, x: number): number {
		let slot = 0;
		for (const part of d.remaining) {
			const r = nodeRect(part.id);
			if (r && r.left + r.width / 2 < x) slot++;
		}
		return slot;
	}

	function renderLive(d: Drag) {
		if (!stage) return;
		const live = expressionLatex(d.structure, d.group, d.remaining, {
			gaps: d.gaps,
			phantom: d.phantom
		});
		stage.innerHTML = convertLatexToMarkup(display(live));
		frameCache = null;
		placeBoxes(d);
	}

	/** Pose chaque boîte de dépôt sur son espace ; le fond du groupe s'élargit avec */
	function placeBoxes(d: Drag) {
		if (!stage || !wrapper) return;
		const w = wrapper.getBoundingClientRect();
		const inset = BOX_INSET_EM * emPx();
		let open: DOMRect | null = null;
		for (const [k, box] of d.boxes.entries()) {
			const gap = stage.querySelector(`.${GAP_CLASS_PREFIX}${k}`);
			const r = gap?.getBoundingClientRect();
			if (r && r.width > 0) open = open ? union(open, r) : r;
			const width = r ? r.width - 2 * inset : 0;
			if (!r || width < BOX_MIN_PX) {
				box.hidden = true;
				continue;
			}
			box.hidden = false;
			box.style.transform = `translate(${r.left - w.left + inset}px, ${d.boxTop}px)`;
			box.style.width = `${width}px`;
			box.style.height = `${d.boxHeight}px`;
		}
		const panel = frames().get(d.group.id);
		const gapBox = open;
		showGroupPanel(
			d.group,
			panel && gapBox
				? {
						left: Math.min(panel.left, gapBox.left - w.left),
						top: panel.top,
						right: Math.max(panel.right, gapBox.right - w.left),
						bottom: panel.bottom
					}
				: panel
		);
	}

	function animate(time: number) {
		if (!drag) return;
		const d = drag;
		d.raf = null;
		const dt = d.lastFrame === null ? 16 : time - d.lastFrame;
		d.lastFrame = time;
		const blend = 1 - Math.exp(-dt / EASING_MS);
		let moving = false;
		d.gaps = d.gaps.map((gap, k) => {
			const goal = k === d.target ? d.widths[k] : 0;
			const next = gap + (goal - gap) * blend;
			if (Math.abs(goal - next) < 0.002) return goal;
			moving = true;
			return next;
		});
		renderLive(d);
		if (moving) d.raf = requestAnimationFrame(animate);
		else d.lastFrame = null;
	}

	function drop(d: Drag) {
		if (!stage || !floating || !wrapper) return;
		if (d.raf !== null) cancelAnimationFrame(d.raf);
		drag = null;
		settling = true;
		const finalLatex = movedLatex(d.structure, d.group, d.from, d.target);
		stage.innerHTML = convertLatexToMarkup(display(finalLatex));
		frameCache = null;
		boxLayer?.replaceChildren();
		showGroupPanel(null);
		const termElement = markerElement(stage, d.part.id);
		termElement?.style.setProperty('visibility', 'hidden');

		// La carte se pose (sans le signe, écrit par la somme) et s'efface
		const before = floating.getBoundingClientRect();
		floating.innerHTML = convertLatexToMarkup(stripMarkers(d.part.marked));
		const w = wrapper.getBoundingClientRect();
		const inner = floating.firstElementChild ?? floating;
		const floatRect = contentRect(inner) ?? inner.getBoundingClientRect();
		const goal = (termElement ? contentRect(termElement, d.part.id) : null) ?? floatRect;
		const x = goal.left - (floatRect.left - before.left) - w.left;
		const y = goal.top - (floatRect.top - before.top) - w.top;
		floating.style.transition = [
			'transform',
			'top',
			'background-color',
			'border-color',
			'box-shadow'
		]
			.map((property) => `${property} ${SETTLE_MS}ms ease-out`)
			.join(', ');
		floating.style.transform = `translate(${x}px, ${y}px)`;
		floating.style.top = '0px';
		floating.classList.add('landing');

		settleTimer = setTimeout(() => {
			settleTimer = null;
			termElement?.style.removeProperty('visibility');
			if (floating) floating.hidden = true;
			settling = false;
			isDragging = false;
			frameCache = null;
			// L'expression a changé d'ailleurs pendant le geste : elle gagne
			if (d.structure !== structure) return;
			if (d.target !== d.from) onmove?.(stripMarkers(finalLatex));
			else drawOutlines();
		}, SETTLE_MS);
	}

	/**
	 * Le champ de saisie qui remplace la formule après un clic court : même
	 * expression, curseur au même endroit. Entrée ou un clic ailleurs : retour à
	 * la formule (`onedit` si elle a changé) ; Échap : retour sans rien changer.
	 */
	function initEditor(element: MathfieldElement) {
		const opened = latex;
		element.value = opened;
		let cancelled = false;
		const finish = () => {
			const value = element.value;
			editAt = null;
			// Changée d'ailleurs pendant la saisie : la nouvelle expression gagne
			if (!cancelled && value !== opened && latex === opened) onedit?.(value);
		};
		const handleEditorKeydown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') cancelled = true;
			if (event.key === 'Enter' || event.key === 'Escape') {
				event.preventDefault();
				if (element.matches(':focus-within')) element.blur();
				else finish();
			}
		};
		element.addEventListener('focusout', finish);
		element.addEventListener('keydown', handleEditorKeydown);
		requestAnimationFrame(() => {
			element.focus();
			const content = element.shadowRoot?.querySelector('.ML__latex');
			if (!editAt || !content) return;
			const r = content.getBoundingClientRect();
			element.position = element.getOffsetFromPoint(
				r.left + editAt.rx * r.width,
				r.top + editAt.ry * r.height
			);
		});
		return {
			destroy: () => {
				element.removeEventListener('focusout', finish);
				element.removeEventListener('keydown', handleEditorKeydown);
			}
		};
	}
</script>

<svelte:window onresize={handleResize} onkeydown={handleKeydown} />

<div
	bind:this={wrapper}
	class="field"
	class:dragging={isDragging}
	class:touch
	class:editing={editAt !== null}
	class:lifted={lift}
	class:movable={move}
	data-field
	role="button"
	aria-roledescription="formule"
	tabindex="0"
	aria-label={label}
	onkeydown={handleFieldKeydown}
	onpointerenter={invalidateFrames}
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={handlePointerUp}
	onpointercancel={handlePointerCancel}
	onpointerleave={() => {
		if (!pending && !drag && !settling && highlightId === null) showFrames(null);
	}}
>
	<!-- Avant la formule : les cadres passent sous les caractères -->
	<div aria-hidden="true">
		<div bind:this={groupFrame} class="group-frame" hidden>
			<div bind:this={groupLabel} class="group-label"></div>
		</div>
		<div bind:this={outlineLayer}></div>
		<div bind:this={ancestorLayer}></div>
		<div bind:this={partFrame} class="structure-frame" hidden></div>
	</div>
	<div bind:this={stage} class="field-stage" data-field-stage hidden={editAt !== null}></div>
	{#if editAt}
		<!-- `main math-field` (app.css) impose sa taille en !important : la même que la formule -->
		<math-field
			use:initEditor
			class="field-editor"
			style:font-size|important="inherit"
			style:line-height|important="1.2"
			aria-label="Modifier l'expression"
		></math-field>
	{:else if !latex.trim()}
		<div class="field-placeholder">Cliquez pour écrire une expression</div>
	{/if}
	<div bind:this={boxLayer} aria-hidden="true"></div>
	<div bind:this={floating} class="field-card" hidden></div>
	<div bind:this={probe} class="field-probe" aria-hidden="true"></div>
</div>

<style>
	.field {
		position: relative;
		padding: 2.5rem 1.5rem;
		border-radius: 0.75rem;
		background: var(--color-muted);
		font-size: 2.75rem;
		text-align: center;
		user-select: none;
		cursor: text;
	}

	/* La carte soulevée monte : de la place en haut */
	.field.lifted {
		padding-top: 4rem;
	}

	/* Seulement si l'on peut déplacer : sinon le doigt fait défiler la page */
	.field.movable {
		touch-action: none;
	}

	.field:global(.can-grab) {
		cursor: grab;
	}

	.field.dragging {
		cursor: grabbing;
	}

	/* Positionnée, après les cadres : ses caractères passent par-dessus */
	.field-stage {
		position: relative;
	}

	.field-placeholder {
		font-size: 1rem;
		color: var(--color-muted-foreground);
	}

	.group-frame,
	.structure-frame,
	.field :global(.structure-frame),
	.field :global(.part-outline),
	.field :global(.drop-box) {
		position: absolute;
		left: 0;
		top: 0;
		box-sizing: border-box;
		pointer-events: none;
	}

	.group-frame {
		border: 1.5px solid color-mix(in oklab, var(--color-muted-foreground) 60%, transparent);
		border-radius: 0.3em;
		background-color: color-mix(in oklab, var(--color-card) 85%, transparent);
	}

	.group-label {
		position: absolute;
		left: 0.5rem;
		bottom: 100%;
		margin-bottom: 0.2rem;
		padding: 0 0.45rem;
		border: 1px solid var(--color-border);
		border-radius: 999px;
		background-color: var(--color-card);
		color: var(--color-muted-foreground);
		font-size: 0.8rem;
		line-height: 1.5;
		white-space: nowrap;
	}

	.group-frame:global(.label-below) .group-label {
		top: 100%;
		bottom: auto;
		margin-top: 0.2rem;
		margin-bottom: 0;
	}

	.structure-frame {
		border: 2px solid var(--color-primary);
		border-radius: 0.2em;
		background-color: color-mix(in oklab, var(--color-primary) 14%, transparent);
	}

	.field :global(.structure-frame.ancestor) {
		border: 1.5px dotted var(--color-muted-foreground);
		border-radius: 0.2em;
		background: transparent;
	}

	.field :global(.part-outline) {
		border: 1.5px dashed color-mix(in oklab, var(--color-muted-foreground) 55%, transparent);
		border-radius: 0.2em;
	}

	.field.dragging :global(.part-outline),
	.field.editing :global(.part-outline) {
		display: none;
	}

	.field :global(.drop-box) {
		border: 2px dashed var(--color-primary);
		border-radius: 0.2em;
		background-color: color-mix(in oklab, var(--color-primary) 15%, transparent);
	}

	.field-card {
		position: absolute;
		left: 0;
		top: 0;
		padding: 0.04em 0.16em;
		border: 2px solid var(--color-primary);
		border-radius: 0.25em;
		background-color: var(--color-card);
		box-shadow: 0 0.2em 0.5em rgb(0 0 0 / 0.25);
		pointer-events: none;
		white-space: nowrap;
		color: var(--color-card-foreground);
	}

	.field-card:global(.landing) {
		border-color: transparent;
		background-color: transparent;
		box-shadow: none;
	}

	.field-editor {
		display: inline-block;
		min-width: 4em;
		background: var(--color-card);
		border-radius: 0.3em;
	}

	.field-probe {
		position: absolute;
		left: -10000px;
		top: 0;
		visibility: hidden;
		white-space: nowrap;
	}
</style>
