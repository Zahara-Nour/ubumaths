<!--
	Une formule survolable
	======================

	Affiche le LaTeX marqué d'une structure (`math-span`) et encadre, au survol,
	la plus petite sous-expression sous le pointeur. Sur un écran tactile, un
	toucher encadre ; un nouveau toucher dans le cadre passe à la sous-expression
	qui la contient.

	L'encadré est dessiné PAR-DESSUS, à partir de la position réelle des
	caractères (pas de `\enclose`) : la formule ne bouge jamais. Les zones des
	sous-expressions sont mesurées au premier survol (pas au chargement : la page
	affiche tout le corpus) et remesurées après un redimensionnement.

	Sens inverse (Q10) : `highlightId`, imposé de l'extérieur (survol d'un mot de
	la lecture), encadre sa sous-expression avec le même cadre, à la place de
	la sous-expression survolée. MathLive est chargé par la page.
-->
<script lang="ts">
	import {
		markerIdFromClasses,
		MARKER_PREFIX,
		type ExpressionStructure,
		type StructureNode
	} from '$lib/mathAST/structure';

	// Types
	interface Props {
		structure: ExpressionStructure;
		/** Sous-expression survolée ou touchée (lisible et réinitialisable par le parent) */
		selectedId?: number | null;
		/** Sous-expression imposée de l'extérieur (sens inverse) : encadrée à la place de la survolée */
		highlightId?: number | null;
		/** Encadrer aussi un nombre ou une lettre seuls */
		frameLeaves?: boolean;
		/** Encadrer aussi les sous-expressions englobantes */
		showAncestors?: boolean;
		/** Formule du corpus : plus petite, marges réduites */
		compact?: boolean;
		label?: string;
	}

	interface Frame {
		/** Par rang : l'encadré glisse d'une sous-expression à l'autre au lieu de réapparaître */
		key: string;
		left: number;
		top: number;
		width: number;
		height: number;
		/** 0 : sous-expression survolée ; 1, 2… : celles qui la contiennent */
		rank: number;
	}

	// Constantes
	/** Marge entre le contenu et le cadre de la sous-expression survolée, puis en plus par rang */
	const PADDING = 4;
	const PADDING_STEP = 5;
	/** Un nombre ou une lettre seuls : marge horizontale réduite (`6a` est serré) */
	const LEAF_PADDING_X = 1;

	// Variables
	let {
		structure,
		selectedId = $bindable(null),
		highlightId = null,
		frameLeaves = true,
		showAncestors = false,
		compact = false,
		label = 'Expression à explorer'
	}: Props = $props();

	let stage = $state<HTMLDivElement>();
	/** Zones mesurées des sous-expressions (pas d'état réactif : un cache de mesures) */
	let rectCache: { latex: string; rects: Map<number, DOMRect> } | null = null;

	/**
	 * Sous-expression encadrée : l'imposée d'abord, sinon la survolée. L'imposée
	 * suit le réglage « nombres et lettres seuls » : décoché, un nombre ou une
	 * lettre désignés par la lecture n'encadrent rien (pas leur parent : le mot
	 * survolé ne le désigne pas).
	 */
	const framedId = $derived(
		highlightId !== null ? frameableHighlight(highlightId, frameLeaves) : selectedId
	);
	// Les mesures ne sont lues qu'une fois une sous-expression choisie (survol de la formule ou de la lecture)
	const frames = $derived(computeFrames(framedId, showAncestors));

	// Fonctions
	function ancestorsOf(node: StructureNode, nodes: readonly StructureNode[]): StructureNode[] {
		const result = [node];
		let current = node;
		while (current.parent !== null) {
			current = nodes[current.parent];
			result.push(current);
		}
		return result;
	}

	/**
	 * Zone occupée par chaque sous-expression, relative à la scène. Mesurée à la
	 * demande et gardée tant que l'expression ne change pas : relative à la scène,
	 * elle ne dépend pas du défilement.
	 */
	function subexpressionRects(): Map<number, DOMRect> {
		if (rectCache && rectCache.latex === structure.latex) return rectCache.rects;
		const rects = new Map<number, DOMRect>();
		const root = stage?.querySelector('math-span')?.shadowRoot;
		if (!root || !stage) return rects;
		const origin = stage.getBoundingClientRect();
		for (const element of root.querySelectorAll(`[class*="${MARKER_PREFIX}"]`)) {
			const id = markerIdFromClasses(element.classList);
			const rect = id === null ? null : contentRect(element, id);
			if (id === null || !rect) continue;
			rects.set(
				id,
				new DOMRect(rect.left - origin.left, rect.top - origin.top, rect.width, rect.height)
			);
		}
		rectCache = { latex: structure.latex, rects };
		return rects;
	}

	/**
	 * Plus petite sous-expression sous le pointeur : la plus profonde dont la zone
	 * contient le point. Pas l'élément sous le pointeur : dans une fraction,
	 * MathLive empile numérateur et dénominateur avec des boîtes absolues qui se
	 * chevauchent.
	 */
	function subexpressionUnderPointer(event: PointerEvent): number | null {
		if (!stage) return null;
		const origin = stage.getBoundingClientRect();
		const x = event.clientX - origin.left;
		const y = event.clientY - origin.top;
		let best: { id: number; depth: number; area: number } | null = null;
		for (const [id, r] of subexpressionRects()) {
			if (x < r.left || x > r.right || y < r.top || y > r.bottom) continue;
			const depth = ancestorsOf(structure.nodes[id], structure.nodes).length;
			const area = r.width * r.height;
			if (!best || depth > best.depth || (depth === best.depth && area < best.area)) {
				best = { id, depth, area };
			}
		}
		return best?.id ?? null;
	}

	function invalidateRects() {
		// Polices chargées, fenêtre redimensionnée : les zones sont à remesurer
		rectCache = null;
	}

	/** Nombre, lettre : sans sous-structure */
	function isLeaf(node: StructureNode): boolean {
		return node.children.length === 0;
	}

	/** Un nombre ou une lettre seuls ne s'encadrent pas si le réglage est décoché */
	function frameable(id: number | null): number | null {
		if (id === null) return null;
		const node = structure.nodes[id];
		if (!frameLeaves && isLeaf(node) && node.parent !== null) return node.parent;
		return id;
	}

	function frameableHighlight(id: number, withLeaves: boolean): number | null {
		const node = structure.nodes[id];
		if (!node) return null;
		return !withLeaves && isLeaf(node) && node.parent !== null ? null : id;
	}

	/**
	 * Rectangle réellement occupé par les caractères et traits de la
	 * sous-expression `id`. Seuls comptent les siens et ceux de ses descendants :
	 * l'exposant de `(x + 1)²` est écrit dans le marqueur de la parenthèse (pour
	 * que MathLive le place comme dans l'écriture usuelle), il n'en fait pas partie.
	 */
	function contentRect(element: Element, id: number): DOMRect | null {
		const rects: DOMRect[] = [];
		const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
		const range = document.createRange();
		while (walker.nextNode()) {
			// U+200B : MathLive en pose dans `ML__vlist-s` (un exposant qui descend) ; `trim` le garde
			if (!walker.currentNode.textContent?.replace(/\u200b/g, '').trim()) continue;
			if (!belongsTo(walker.currentNode.parentElement, id)) continue;
			range.selectNodeContents(walker.currentNode);
			rects.push(...Array.from(range.getClientRects()));
		}
		for (const line of element.querySelectorAll('svg, .ML__frac-line')) {
			if (belongsTo(line, id)) rects.push(line.getBoundingClientRect());
		}
		const visible = rects.filter((r) => r.width > 0 || r.height > 0);
		if (visible.length === 0) return null;
		const left = Math.min(...visible.map((r) => r.left));
		const top = Math.min(...visible.map((r) => r.top));
		const right = Math.max(...visible.map((r) => r.right));
		const bottom = Math.max(...visible.map((r) => r.bottom));
		return new DOMRect(left, top, right - left, bottom - top);
	}

	/** L'élément est-il dessiné par la sous-expression `id` (ou par l'un de ses descendants) ? */
	function belongsTo(element: Element | null, id: number): boolean {
		const marker = element?.closest(`[class*="${MARKER_PREFIX}"]`);
		let owner = marker ? markerIdFromClasses(marker.classList) : null;
		while (owner !== null) {
			if (owner === id) return true;
			owner = structure.nodes[owner]?.parent ?? null;
		}
		return false;
	}

	function computeFrames(id: number | null, withAncestors: boolean): Frame[] {
		const node = id === null ? undefined : structure.nodes[id];
		if (!node) return [];
		const rects = subexpressionRects();
		const ids = withAncestors ? ancestorsOf(node, structure.nodes).map((n) => n.id) : [node.id];
		const result: Frame[] = [];
		ids.forEach((subId, rank) => {
			const rect = rects.get(subId);
			if (!rect) return;
			const pad = PADDING + rank * PADDING_STEP;
			const padX = rank === 0 && isLeaf(structure.nodes[subId]) ? LEAF_PADDING_X : pad;
			result.push({
				key: `rang-${rank}`,
				left: rect.left - padX,
				top: rect.top - pad,
				width: rect.width + 2 * padX,
				height: rect.height + 2 * pad,
				rank
			});
		});
		return result;
	}

	function handlePointerMove(event: PointerEvent) {
		if (event.pointerType !== 'mouse') return;
		const id = frameable(subexpressionUnderPointer(event));
		if (id !== selectedId) selectedId = id;
	}

	function handlePointerLeave(event: PointerEvent) {
		if (event.pointerType === 'mouse') selectedId = null;
	}

	/** Tactile : un toucher encadre ; un nouveau toucher dans le cadre passe à la sous-expression englobante */
	function handlePointerDown(event: PointerEvent) {
		if (event.pointerType === 'mouse') return;
		const touched = frameable(subexpressionUnderPointer(event));
		if (touched === null) {
			selectedId = null;
			return;
		}
		if (selectedId !== null) {
			const current = selectedId;
			const insideSelection = ancestorsOf(structure.nodes[touched], structure.nodes).some(
				(n) => n.id === current
			);
			if (insideSelection) {
				selectedId = structure.nodes[current].parent ?? current;
				return;
			}
		}
		selectedId = touched;
	}
</script>

<svelte:window onresize={invalidateRects} />

<div
	bind:this={stage}
	class="structure-stage"
	class:compact
	role="application"
	aria-label={label}
	data-framed-id={framedId ?? undefined}
	onpointerenter={invalidateRects}
	onpointermove={handlePointerMove}
	onpointerleave={handlePointerLeave}
	onpointerdown={handlePointerDown}
>
	{#key structure.latex}
		<math-span class="structure-math">{structure.latex}</math-span>
	{/key}
	{#each frames as frame (frame.key)}
		<div
			class="structure-frame"
			class:ancestor={frame.rank > 0}
			style:left="{frame.left}px"
			style:top="{frame.top}px"
			style:width="{frame.width}px"
			style:height="{frame.height}px"
			style:opacity={frame.rank === 0 ? 1 : Math.max(0.25, 0.7 - 0.15 * frame.rank)}
		></div>
	{/each}
</div>

<style>
	.structure-stage {
		position: relative;
		padding: 2.5rem 1.5rem;
		border-radius: 0.75rem;
		background: var(--color-muted);
		font-size: 2.75rem;
		text-align: center;
		touch-action: manipulation;
		overflow-x: auto;
	}

	.structure-stage.compact {
		padding: 0.75rem 0.75rem;
		border-radius: 0.5rem;
		font-size: 1.35rem;
	}

	.structure-frame {
		position: absolute;
		pointer-events: none;
		border: 2px dashed light-dark(var(--color-amber-600, #d97706), var(--color-amber-400, #fbbf24));
		border-radius: 0.5rem;
		background: light-dark(rgb(251 191 36 / 0.12), rgb(251 191 36 / 0.1));
		transition:
			left 80ms ease-out,
			top 80ms ease-out,
			width 80ms ease-out,
			height 80ms ease-out;
	}

	.compact .structure-frame {
		border-width: 1.5px;
		border-radius: 0.3rem;
	}

	.structure-frame.ancestor {
		border-style: dotted;
		border-color: var(--color-muted-foreground);
		background: transparent;
	}

	@media (prefers-reduced-motion: reduce) {
		.structure-frame {
			transition: none;
		}
	}
</style>
