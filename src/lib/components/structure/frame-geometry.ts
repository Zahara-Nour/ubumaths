/**
 * Champ de formule — géométrie des cadres imbriqués
 * =================================================
 *
 * Les cadres des sous-expressions, calculés à partir des zones de leurs
 * caractères (mesurées par le composant, en pixels). Spécification F2 du
 * glisser-déposer (`docs/wip/structure-glisser-deposer-progress.md`) :
 * - une marge fine autour des caractères ;
 * - à gauche et à droite, une bordure de plus que les cadres contenus : sur la
 *   bordure du cadre de `2x`, hors des cadres de `2` et de `x`, on vise `2x` ;
 * - jamais plus de 40 % du chemin vers une voisine (le signe qui les sépare
 *   reste dehors), ni au-delà du fond du groupe ;
 * - jamais à travers la barre d'une fraction (la boîte de police d'un chiffre
 *   déborde sous son dessin : le `5` de `⅖` passait 6 px sous la barre).
 */

// Types
export interface Box {
	readonly left: number;
	readonly top: number;
	readonly right: number;
	readonly bottom: number;
}

/** Ce que la géométrie lit d'une sous-expression (`StructureNode` convient) */
export interface FrameNode {
	readonly id: number;
	readonly parent: number | null;
	readonly children: readonly number[];
	readonly role: string | null;
}

/** En pixels */
export interface FrameOptions {
	/** Marge autour des caractères */
	readonly padX: number;
	readonly padY: number;
	/** Bordure de plus qu'un cadre contenu, à gauche et à droite */
	readonly band: number;
	/** Part du chemin vers une voisine qu'un cadre peut prendre (0,4) */
	readonly siblingShare: number;
	/** Marge du fond d'un groupe : un cadre en prend au plus 80 % */
	readonly groupPad: number;
}

export interface VerticalLimits {
	readonly top: number;
	readonly bottom: number;
	/** La fraction la plus proche place la sous-expression au dénominateur */
	readonly inDenominator: boolean;
}

// Constantes
/** Écart gardé de part et d'autre de la barre d'une fraction, en pixels */
const FRACTION_GAP = 2;
const GROUP_SHARE = 0.8;

// Fonctions
/** Les cadres de toutes les sous-expressions mesurées */
export function computeFrames(
	nodes: readonly FrameNode[],
	rects: ReadonlyMap<number, Box>,
	options: FrameOptions
): Map<number, Box> {
	const raw = new Map<number, Box>();
	// Des sous-expressions contenues vers celles qui les contiennent
	const visit = (id: number): Box[] => {
		const inner: Box[] = [];
		for (const child of nodes[id].children) inner.push(...visit(child));
		const r = rects.get(id);
		if (!r) return inner;
		let left = r.left - options.padX;
		let right = r.right + options.padX;
		for (const f of inner) {
			left = Math.min(left, f.left - options.band);
			right = Math.max(right, f.right + options.band);
		}
		const frame = { left, top: r.top - options.padY, right, bottom: r.bottom + options.padY };
		raw.set(id, frame);
		return [frame];
	};
	for (const node of nodes) if (node.parent === null) visit(node.id);

	const out = new Map<number, Box>();
	for (const [id, frame] of raw) {
		const r = rects.get(id);
		if (!r) continue;
		const { left, right } = clampHorizontally(nodes, rects, id, r, frame, options);
		const limits = fractionLimits(nodes, rects, id);
		const top = Math.max(frame.top, limits.top);
		const bottom = Math.max(top + 1, Math.min(frame.bottom, limits.bottom));
		out.set(id, { left, top, right, bottom });
	}
	return out;
}

/** Bornes de gauche et de droite : voisines de la même ligne, fond du groupe */
function clampHorizontally(
	nodes: readonly FrameNode[],
	rects: ReadonlyMap<number, Box>,
	id: number,
	r: Box,
	frame: Box,
	options: FrameOptions
): { left: number; right: number } {
	const parent = nodes[id].parent;
	if (parent === null) return { left: frame.left, right: frame.right };
	let minLeft = -Infinity;
	let maxRight = Infinity;
	for (const sibling of nodes[parent].children) {
		const s = sibling === id ? null : rects.get(sibling);
		// Sur la même ligne seulement (pas le dénominateur sous le numérateur)
		if (!s || s.bottom < r.top || s.top > r.bottom) continue;
		if (s.right <= r.left + 1) {
			minLeft = Math.max(minLeft, r.left - options.siblingShare * Math.max(0, r.left - s.right));
		}
		if (s.left >= r.right - 1) {
			maxRight = Math.min(maxRight, r.right + options.siblingShare * Math.max(0, s.left - r.right));
		}
	}
	const group = rects.get(parent);
	if (group) {
		minLeft = Math.max(minLeft, group.left - GROUP_SHARE * options.groupPad);
		maxRight = Math.min(maxRight, group.right + GROUP_SHARE * options.groupPad);
	}
	return {
		left: Math.max(frame.left, Math.min(minLeft, r.left)),
		right: Math.min(frame.right, Math.max(maxRight, r.right))
	};
}

/**
 * Bornes verticales d'une sous-expression : dans un numérateur, rien sous la
 * barre de sa fraction ; dans un dénominateur, rien au-dessus. Pour chaque
 * fraction qui la contient (elle comprise).
 */
export function fractionLimits(
	nodes: readonly FrameNode[],
	rects: ReadonlyMap<number, Box>,
	id: number
): VerticalLimits {
	let top = -Infinity;
	let bottom = Infinity;
	let inDenominator = false;
	let nearest = true;
	for (let current: number | null = id; current !== null; current = nodes[current].parent) {
		const node = nodes[current];
		if ((node.role !== 'numerator' && node.role !== 'denominator') || node.parent === null)
			continue;
		const [numerator, denominator] = nodes[node.parent].children;
		const above = rects.get(numerator);
		const below = rects.get(denominator);
		if (above && below) {
			const line = (above.bottom + below.top) / 2;
			if (node.role === 'numerator') bottom = Math.min(bottom, line - FRACTION_GAP);
			else top = Math.max(top, line + FRACTION_GAP);
		}
		if (nearest) inDenominator = node.role === 'denominator';
		nearest = false;
	}
	return { top, bottom, inDenominator };
}

/**
 * La sous-expression visée en (x, y) : la plus profonde dont le cadre contient le
 * point (règle A1). `candidate` écarte celles qui ne s'encadrent pas (un nombre
 * ou une lettre seuls, si le réglage est décoché).
 */
export function frameAt(
	nodes: readonly FrameNode[],
	frames: ReadonlyMap<number, Box>,
	x: number,
	y: number,
	candidate: (id: number) => boolean = () => true
): number | null {
	let best: { id: number; depth: number } | null = null;
	for (const [id, f] of frames) {
		if (!candidate(id) || x < f.left || x > f.right || y < f.top || y > f.bottom) continue;
		const depth = depthOf(nodes, id);
		if (!best || depth > best.depth) best = { id, depth };
	}
	return best?.id ?? null;
}

function depthOf(nodes: readonly FrameNode[], id: number): number {
	let depth = 0;
	for (let p = nodes[id].parent; p !== null; p = nodes[p].parent) depth++;
	return depth;
}
