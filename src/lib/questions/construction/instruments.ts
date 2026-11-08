/**
 * Instruments sur papier uni (chantier `controles-figure`, lot 2b)
 * ================================================================
 *
 * Géométrie PURE des gestes de l'équerre et du compas, et de l'aimantation qui
 * rend une construction exacte : un toucher va au point nommé le plus proche,
 * sinon à l'intersection de deux traits la plus proche, sinon sur le trait le
 * plus proche (piquer le compas « sur l'axe »), sinon reste libre. Phase 0
 * validée par David le 2026-11-02 (`docs/archive/wip/controles-figure-progress.md` § 7).
 *
 * Coordonnées en pleine précision (jamais arrondies ici) : le juge compare les
 * points à 1e-9 près, une construction exacte doit arriver exacte.
 *
 * @module questions/construction/instruments
 */

import type { DrawnLine, DrawnObject, DrawnRegle, DrawnRepere } from './answer';
import type { Position } from './judge';

/** Droite (par deux points), demi-droite (origine `a`), segment, ou cercle */
export type Trait =
	| { kind: 'line' | 'ray' | 'segment'; a: Position; b: Position }
	| { kind: 'circle'; center: Position; radius: number };

/** Trait droit : ce que l'équerre peut longer */
export type StraightTrait = Extract<Trait, { a: Position }>;

/** Deux positions plus proches que ça (relatif) : la même */
const EPSILON = 1e-9;

/**
 * Demi-corde en dessous de laquelle deux intersections n'en font qu'une
 * (tangence) : l'erreur flottante d'un discriminant nul passe par une racine
 * carrée, elle vaut ~√ε, bien au-dessus de EPSILON (revue du lot 2b)
 */
const TANGENT_EPSILON = 1e-7;

const scaleOf = (...points: Position[]) =>
	Math.max(1, ...points.flatMap((p) => [Math.abs(p.x), Math.abs(p.y)]));

export function isStraight(trait: Trait): trait is StraightTrait {
	return trait.kind !== 'circle';
}

/** Le trait que dessine un objet de l'élève ; null pour un point (ou un repère du rapporteur, une règle posée) */
export function traitOf(object: DrawnObject): Trait | null {
	if (object.kind === 'point' || object.kind === 'repere' || object.kind === 'regle') return null;
	if (object.kind === 'cercle') {
		const radius = Math.hypot(object.x - object.cx, object.y - object.cy);
		return { kind: 'circle', center: { x: object.cx, y: object.cy }, radius };
	}
	if (object.kind === 'report') {
		const radius = Math.hypot(object.bx - object.ax, object.by - object.ay);
		return { kind: 'circle', center: { x: object.cx, y: object.cy }, radius };
	}
	return {
		kind: object.kind === 'droite' ? 'line' : 'segment',
		a: { x: object.x1, y: object.y1 },
		b: { x: object.x2, y: object.y2 }
	};
}

/**
 * Où est le repère du rapporteur (lot 5) : à `r` du centre, à `deg` degrés de
 * la base [centre, (ax ; ay)), dans le sens trigonométrique si `sens` = 1
 */
export function repereAt(mark: DrawnRepere): Position {
	const base = Math.atan2(mark.ay - mark.vy, mark.ax - mark.vx);
	const angle = base + (mark.sens * mark.deg * Math.PI) / 180;
	return { x: mark.vx + mark.r * Math.cos(angle) + 0, y: mark.vy + mark.r * Math.sin(angle) + 0 };
}

/** Direction (unitaire) de la règle posée, de son 0 vers ses graduations */
export function rulerDirection(ruler: DrawnRegle): Position {
	const length = Math.hypot(ruler.bx - ruler.ox, ruler.by - ruler.oy);
	return { x: (ruler.bx - ruler.ox) / length, y: (ruler.by - ruler.oy) / length };
}

/**
 * La graduation `mm` (millimètres depuis le 0) de la règle graduée posée
 * (chantier `regle-graduee`, ADR 0036 : 1 unité = 1 cm), en pleine précision :
 * le juge recalcule la même position
 */
export function rulerGraduation(ruler: DrawnRegle, mm: number): Position {
	const u = rulerDirection(ruler);
	return { x: ruler.ox + (mm / 10) * u.x + 0, y: ruler.oy + (mm / 10) * u.y + 0 };
}

/**
 * Le point `p` est-il sur une graduation de la règle (sur son bord, à un
 * millimètre entier de 0 à `rulerLength` cm) ? Rend la graduation, sinon null
 */
export function rulerGraduationOf(
	p: Position,
	ruler: DrawnRegle,
	rulerLength: number
): number | null {
	const o = { x: ruler.ox, y: ruler.oy };
	const u = rulerDirection(ruler);
	const t = (p.x - o.x) * u.x + (p.y - o.y) * u.y;
	const mm = Math.round(t * 10);
	if (mm < 0 || mm > rulerLength * 10) return null;
	const q = rulerGraduation(ruler, mm);
	return Math.hypot(p.x - q.x, p.y - q.y) <= EPSILON * scaleOf(p, q) ? mm : null;
}

/** La plus grande graduation (mm) de la règle qui est dans la fenêtre (le 0 y est) */
export function rulerMaxMm(ruler: DrawnRegle, rulerLength: number, frame?: Frame | null): number {
	let mm = rulerLength * 10;
	while (frame && mm > 0 && !isInFrame(rulerGraduation(ruler, mm), frame)) mm--;
	return mm;
}

/**
 * Le bout d'un segment touché près du bord de la règle posée : la graduation
 * du millimètre la plus proche (le long du bord, dans la fenêtre) ; null si le
 * toucher est loin du bord ou au-delà de la règle
 *
 * @param radius - Rayon d'aimantation, en unités de la figure
 */
export function rulerGraduationNear(
	tap: Position,
	ruler: DrawnRegle,
	rulerLength: number,
	radius: number,
	frame?: Frame | null
): Position | null {
	const u = rulerDirection(ruler);
	const dx = tap.x - ruler.ox;
	const dy = tap.y - ruler.oy;
	const t = dx * u.x + dy * u.y;
	if (Math.abs(u.x * dy - u.y * dx) > radius) return null;
	if (t < -radius || t > rulerLength + radius) return null;
	const mm = Math.min(Math.max(Math.round(t * 10), 0), rulerLength * 10);
	const graduation = rulerGraduation(ruler, mm);
	if (frame && !isInFrame(graduation, frame)) return null;
	return graduation;
}

/** Paramètre t (p = a + t·(b − a)) admis sur le trait droit, au jeu près */
function withinStraight(trait: StraightTrait, t: number, slack: number): boolean {
	if (trait.kind === 'line') return true;
	if (trait.kind === 'ray') return t >= -slack;
	return t >= -slack && t <= 1 + slack;
}

function paramOn(trait: StraightTrait, p: Position): number {
	const ux = trait.b.x - trait.a.x;
	const uy = trait.b.y - trait.a.y;
	return ((p.x - trait.a.x) * ux + (p.y - trait.a.y) * uy) / (ux * ux + uy * uy);
}

/** Jeu sur le paramètre : EPSILON rapporté à la longueur du trait */
function slackOf(trait: StraightTrait): number {
	const length = Math.hypot(trait.b.x - trait.a.x, trait.b.y - trait.a.y);
	return (EPSILON * scaleOf(trait.a, trait.b)) / length;
}

function onStraight(trait: StraightTrait, p: Position): boolean {
	return withinStraight(trait, paramOn(trait, p), slackOf(trait));
}

/** Droite × droite (porteuses), puis les bornes de chacun */
function intersectStraights(p: StraightTrait, q: StraightTrait): Position[] {
	const ux = p.b.x - p.a.x;
	const uy = p.b.y - p.a.y;
	const vx = q.b.x - q.a.x;
	const vy = q.b.y - q.a.y;
	const det = ux * vy - uy * vx;
	if (Math.abs(det) <= EPSILON * Math.hypot(ux, uy) * Math.hypot(vx, vy)) return [];
	const t = ((q.a.x - p.a.x) * vy - (q.a.y - p.a.y) * vx) / det;
	const at = { x: p.a.x + t * ux, y: p.a.y + t * uy };
	return onStraight(p, at) && onStraight(q, at) ? [at] : [];
}

function intersectStraightCircle(
	line: StraightTrait,
	circle: Extract<Trait, { kind: 'circle' }>
): Position[] {
	const ux = line.b.x - line.a.x;
	const uy = line.b.y - line.a.y;
	const fx = line.a.x - circle.center.x;
	const fy = line.a.y - circle.center.y;
	const a = ux * ux + uy * uy;
	const b = 2 * (fx * ux + fy * uy);
	const c = fx * fx + fy * fy - circle.radius * circle.radius;
	const disc = b * b - 4 * a * c;
	const scale = scaleOf(line.a, line.b, circle.center) + circle.radius;
	// Tangente : une seule solution (discriminant nul au calcul flottant près)
	if (disc < -EPSILON * b * b - EPSILON * scale) return [];
	const root = Math.sqrt(Math.max(0, disc));
	// Demi-corde, en unités de la figure : root / (2a) en paramètre, × la longueur de (a, b)
	const halfChord = root / (2 * Math.sqrt(a));
	const ts =
		halfChord <= TANGENT_EPSILON * scale
			? [-b / (2 * a)]
			: [(-b - root) / (2 * a), (-b + root) / (2 * a)];
	return ts
		.filter((t) => withinStraight(line, t, slackOf(line)))
		.map((t) => ({ x: line.a.x + t * ux, y: line.a.y + t * uy }));
}

function intersectCircles(
	p: Extract<Trait, { kind: 'circle' }>,
	q: Extract<Trait, { kind: 'circle' }>
): Position[] {
	const dx = q.center.x - p.center.x;
	const dy = q.center.y - p.center.y;
	const d = Math.hypot(dx, dy);
	const eps = EPSILON * (scaleOf(p.center, q.center) + p.radius + q.radius);
	if (d <= eps) return [];
	if (d > p.radius + q.radius + eps || d < Math.abs(p.radius - q.radius) - eps) return [];
	const along = (d * d + p.radius * p.radius - q.radius * q.radius) / (2 * d);
	const h = Math.sqrt(Math.max(0, p.radius * p.radius - along * along));
	const mx = p.center.x + (along * dx) / d;
	const my = p.center.y + (along * dy) / d;
	if (h <= TANGENT_EPSILON * (scaleOf(p.center, q.center) + p.radius + q.radius)) {
		return [{ x: mx, y: my }];
	}
	return [
		{ x: mx - (h * dy) / d, y: my + (h * dx) / d },
		{ x: mx + (h * dy) / d, y: my - (h * dx) / d }
	];
}

/** Points communs à deux traits (0, 1 ou 2) */
export function intersectTraits(p: Trait, q: Trait): Position[] {
	if (isStraight(p) && isStraight(q)) return intersectStraights(p, q);
	if (isStraight(p) && !isStraight(q)) return intersectStraightCircle(p, q);
	if (!isStraight(p) && isStraight(q)) return intersectStraightCircle(q, p);
	return intersectCircles(
		p as Extract<Trait, { kind: 'circle' }>,
		q as Extract<Trait, { kind: 'circle' }>
	);
}

/** Toutes les intersections deux à deux, sans doublon */
export function intersectionsOf(traits: readonly Trait[]): Position[] {
	const found: Position[] = [];
	for (let i = 0; i < traits.length; i++) {
		for (let j = i + 1; j < traits.length; j++) {
			for (const p of intersectTraits(traits[i], traits[j])) {
				const eps = EPSILON * scaleOf(p);
				if (!found.some((q) => Math.hypot(p.x - q.x, p.y - q.y) <= eps)) found.push(p);
			}
		}
	}
	return found;
}

/** Le point du trait le plus proche de `p` */
export function projectOnTrait(p: Position, trait: Trait): Position {
	if (!isStraight(trait)) {
		const dx = p.x - trait.center.x;
		const dy = p.y - trait.center.y;
		const d = Math.hypot(dx, dy);
		// Au centre : tout le cercle est à la même distance, on prend le point de droite
		if (d === 0) return { x: trait.center.x + trait.radius, y: trait.center.y };
		return {
			x: trait.center.x + (dx * trait.radius) / d,
			y: trait.center.y + (dy * trait.radius) / d
		};
	}
	let t = paramOn(trait, p);
	if (trait.kind !== 'line') t = Math.max(0, t);
	if (trait.kind === 'segment') t = Math.min(1, t);
	return { x: trait.a.x + t * (trait.b.x - trait.a.x), y: trait.a.y + t * (trait.b.y - trait.a.y) };
}

/** Distance de `p` au trait */
export function distanceToTrait(p: Position, trait: Trait): number {
	const q = projectOnTrait(p, trait);
	return Math.hypot(p.x - q.x, p.y - q.y);
}

/** `p` est-il sur un des traits (au calcul flottant près) ? */
export function isOnSomeTrait(p: Position, traits: readonly Trait[]): boolean {
	return traits.some((trait) => distanceToTrait(p, trait) <= EPSILON * scaleOf(p));
}

function nearest(tap: Position, candidates: readonly Position[], radius: number): Position | null {
	let best: Position | null = null;
	let bestDistance = Infinity;
	for (const p of candidates) {
		const distance = Math.hypot(p.x - tap.x, p.y - tap.y);
		if (distance <= radius && distance < bestDistance) {
			best = p;
			bestDistance = distance;
		}
	}
	return best;
}

/** Ce sur quoi un toucher s'aimante : points, intersections, traits */
export interface SnapTargets {
	/** Points nommés de la figure et points déjà placés par l'élève */
	points: readonly Position[];
	/** Intersections deux à deux de `traits` (calculées une fois par l'appelant) */
	intersections: readonly Position[];
	/**
	 * Bouts des segments (de la figure, anonymes, ou de l'élève ; lot 4) : au même
	 * rang que les intersections, la plus proche du toucher l'emporte (revue du lot 4 :
	 * un bout posé à l'œil ne doit pas masquer une intersection plus proche)
	 */
	ends?: readonly Position[];
	traits: readonly Trait[];
}

/**
 * Où va un toucher, avec des instruments : point → intersection ou bout de
 * segment (le plus proche) → sur un trait → `null` (toucher libre : l'appelant l'arrondit).
 *
 * @param radius - Rayon d'aimantation, en unités de la figure
 */
export function snapInstrument(
	tap: Position,
	targets: SnapTargets,
	radius: number
): Position | null {
	const point = nearest(tap, targets.points, radius);
	if (point) return { x: point.x, y: point.y };
	const crossing = nearest(tap, [...targets.intersections, ...(targets.ends ?? [])], radius);
	if (crossing) return { x: crossing.x, y: crossing.y };
	let best: Position | null = null;
	let bestDistance = Infinity;
	for (const trait of targets.traits) {
		const q = projectOnTrait(tap, trait);
		const distance = Math.hypot(q.x - tap.x, q.y - tap.y);
		if (distance <= radius && distance < bestDistance) {
			best = q;
			bestDistance = distance;
		}
	}
	return best;
}

/** Le trait droit le plus proche du toucher (équerre : la droite à longer) ; null au-delà du rayon */
export function straightAt(
	tap: Position,
	traits: readonly Trait[],
	radius: number
): StraightTrait | null {
	let best: StraightTrait | null = null;
	let bestDistance = Infinity;
	for (const trait of traits) {
		if (!isStraight(trait)) continue;
		const distance = distanceToTrait(tap, trait);
		if (distance <= radius && distance < bestDistance) {
			best = trait;
			bestDistance = distance;
		}
	}
	return best;
}

/** Équerre : la perpendiculaire au trait par `through`, écrite comme une droite */
export function perpendicularThrough(guide: StraightTrait, through: Position): DrawnLine {
	const ux = guide.b.x - guide.a.x;
	const uy = guide.b.y - guide.a.y;
	return {
		kind: 'droite',
		x1: through.x,
		y1: through.y,
		x2: through.x - uy + 0,
		y2: through.y + ux + 0
	};
}

/** Cadre de la figure (fenêtre) */
interface Frame {
	xMin: number;
	xMax: number;
	yMin: number;
	yMax: number;
}

/** La droite (a, b) traverse-t-elle le cadre ? (les coins ne sont pas tous du même côté) */
export function lineCrossesFrame(a: Position, b: Position, frame: Frame): boolean {
	const ux = b.x - a.x;
	const uy = b.y - a.y;
	const corners = [
		{ x: frame.xMin, y: frame.yMin },
		{ x: frame.xMax, y: frame.yMin },
		{ x: frame.xMin, y: frame.yMax },
		{ x: frame.xMax, y: frame.yMax }
	];
	const sides = corners.map((c) => ux * (c.y - a.y) - uy * (c.x - a.x));
	return Math.min(...sides) <= 0 && Math.max(...sides) >= 0;
}

/** Le point est-il dans le cadre (bords compris) ? */
export function isInFrame(p: Position, frame: Frame): boolean {
	const eps = EPSILON * scaleOf(p);
	return (
		p.x >= frame.xMin - eps &&
		p.x <= frame.xMax + eps &&
		p.y >= frame.yMin - eps &&
		p.y <= frame.yMax + eps
	);
}

/** Points de départ d'une construction : points de la figure, bouts de ses segments (même anonymes) */
export function basePointsOf(
	points: ReadonlyMap<string, Position>,
	segments: readonly { a: Position; b: Position }[]
): Position[] {
	return [...points.values(), ...segments.flatMap((s) => [s.a, s.b])];
}

/** Ce que l'élève a construit, de proche en proche (voir `constructionOf`) */
export interface Construction {
	/** Indices, dans les objets de l'élève, de ceux dont le trait est construit */
	readonly built: ReadonlySet<number>;
	/** Traits de la figure et traits construits de l'élève */
	readonly traits: readonly Trait[];
	/** `p` est-il un point de départ ou l'intersection de deux traits construits ? */
	isBuilt(p: Position): boolean;
}

/**
 * Le trait de l'objet tient-il sur des points construits ? Droite ou segment :
 * ses deux bouts, ou (droite à l'équerre) comme second point exactement celui que
 * pose l'équerre le long d'un trait droit construit (`perpendicularThrough`,
 * qu'un toucher à la règle n'atteint pas) et un départ construit ou posé SUR ce
 * trait-là (la parallèle « à la 6e » : perpendiculaire en un point quelconque du
 * côté) ; cercle : point de passage, et centre construit ou piqué SUR un trait
 * droit construit (le symétrique : compas piqué n'importe où sur l'axe) ; report :
 * centre et les deux bouts de l'écartement. Choix libres sur un trait : décisions
 * de David du 2026-11-03, § 15.
 */
function isSupported(
	object: DrawnObject,
	isBuilt: (p: Position) => boolean,
	traits: readonly Trait[],
	marks: readonly DrawnRepere[],
	eyeballed: readonly EyeballedArc[] = []
): boolean {
	if (object.kind === 'point' || object.kind === 'repere' || object.kind === 'regle') return false;
	if (object.kind === 'cercle' || object.kind === 'report') {
		const trait = traitOf(object);
		// Exception 4 : le cercle à l'œil, refait sur SES propres points (même centre, même
		// rayon, appui sur un point qu'il a lui-même construit), reste à l'œil
		const support =
			object.kind === 'cercle'
				? [{ x: object.x, y: object.y }]
				: [
						{ x: object.ax, y: object.ay },
						{ x: object.bx, y: object.by }
					];
		if (
			trait &&
			!isStraight(trait) &&
			eyeballed.some(
				(arc) =>
					sameCircle(arc.circle, trait) &&
					support.some((p) => arc.points.some((q) => samePosition(p, q)))
			)
		) {
			return false;
		}
	}
	if (object.kind === 'cercle') {
		const center = { x: object.cx, y: object.cy };
		if (!isBuilt({ x: object.x, y: object.y })) return false;
		return isBuilt(center) || isOnSomeTrait(center, traits.filter(isStraight));
	}
	if (object.kind === 'report') {
		return [
			{ x: object.cx, y: object.cy },
			{ x: object.ax, y: object.ay },
			{ x: object.bx, y: object.by }
		].every(isBuilt);
	}
	const p = { x: object.x1, y: object.y1 };
	const q = { x: object.x2, y: object.y2 };
	const start = isBuilt(p);
	if (start && isBuilt(q)) return true;
	if (isAngleSide(p, q, isBuilt, traits, marks)) return true;
	if (object.kind !== 'droite') return false;
	const eps = EPSILON * scaleOf(p, q);
	return traits.some((t) => {
		if (!isStraight(t) || (!start && !isOnSomeTrait(p, [t]))) return false;
		const square = perpendicularThrough(t, p);
		return Math.hypot(square.x2 - q.x, square.y2 - q.y) <= eps;
	});
}

/**
 * Côté d'angle (lot 7, § 21) : un trait droit qui part du centre d'un repère
 * construit et passe par ce repère (la règle posée du sommet au repère, ou le
 * côté tracé d'un trait à travers lui). Le repère seul ne construit toujours
 * rien : c'est la DIRECTION centre → repère qui l'est, et le trait la porte.
 */
function isAngleSide(
	p: Position,
	q: Position,
	isBuilt: (p: Position) => boolean,
	traits: readonly Trait[],
	marks: readonly DrawnRepere[]
): boolean {
	return marks.some((mark) => {
		const center = { x: mark.vx, y: mark.vy };
		const eps = EPSILON * scaleOf(center, p, q);
		const at = (r: Position) => Math.hypot(r.x - center.x, r.y - center.y) <= eps;
		const other = at(p) ? q : at(q) ? p : null;
		if (!other || !isMarkSupported(mark, isBuilt, traits)) return false;
		const m = repereAt(mark);
		const u = { x: other.x - center.x, y: other.y - center.y };
		const v = { x: m.x - center.x, y: m.y - center.y };
		const lengths = Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y);
		return lengths > 0 && Math.abs(u.x * v.y - u.y * v.x) <= EPSILON * scaleOf(m, other) * lengths;
	});
}

/**
 * Le sommet d'où part un côté d'angle construit (lot 7, revue de #2348) : le
 * centre du repère qui le porte, si l'objet est un trait droit construit qui part
 * de ce centre et passe par ce repère ; null sinon
 */
export function angleSideVertex(
	object: DrawnObject,
	marks: readonly DrawnRepere[],
	construction: Construction
): Position | null {
	if (object.kind !== 'droite' && object.kind !== 'segment') return null;
	const p = { x: object.x1, y: object.y1 };
	const q = { x: object.x2, y: object.y2 };
	const own = marks.find((mark) =>
		isAngleSide(p, q, construction.isBuilt, construction.traits, [mark])
	);
	return own ? { x: own.vx, y: own.vy } : null;
}

/**
 * Intersections des paires de cercles (compas ou report) non construits, de même
 * rayon, centrés sur deux points construits distincts : la médiatrice tracée avec
 * un écartement quelconque gardé (§ 15)
 */
function sameRadiusCrossings(
	objects: readonly DrawnObject[],
	built: ReadonlySet<number>,
	isBuilt: (p: Position) => boolean
): Position[] {
	const circles = objects.flatMap((object, index) => {
		if (built.has(index) || (object.kind !== 'cercle' && object.kind !== 'report')) return [];
		const trait = traitOf(object);
		if (!trait || isStraight(trait) || !isBuilt(trait.center)) return [];
		return [trait];
	});
	const found: Position[] = [];
	for (let i = 0; i < circles.length; i++) {
		for (let j = i + 1; j < circles.length; j++) {
			const [p, q] = [circles[i], circles[j]];
			const eps = EPSILON * (scaleOf(p.center, q.center) + p.radius + q.radius);
			if (Math.abs(p.radius - q.radius) > eps) continue;
			found.push(...intersectTraits(p, q));
		}
	}
	return found;
}

/**
 * Sur papier uni, ce que l'élève a CONSTRUIT (décision de David du 2026-11-03,
 * `docs/archive/wip/controles-figure-progress.md` § 14) : un point l'est s'il est un
 * point de départ (`base`, voir `basePointsOf`) ou l'intersection de deux traits
 * construits ; un trait de l'élève l'est quand il tient sur des points construits
 * (`isSupported`). Exception (§ 15) : deux cercles de même rayon, même pris à
 * l'œil, centrés sur deux points construits (la médiatrice « à écartement
 * quelconque ») construisent leurs DEUX intersections, sans devenir des traits.
 * Un repère du rapporteur (lot 5) n'y entre pas : sa DIRECTION seule est
 * construite, sa distance au centre est libre (`isBuiltMark`).
 * Exception 4 (lot 9, § 25), sur option (`arcsOnSides`, la bissectrice seule) : un
 * cercle à l'œil centré sur un point construit construit ses intersections avec
 * les traits droits construits QUI PASSENT PAR SON CENTRE (l'arc piqué au sommet
 * qui coupe les deux côtés), sans devenir un trait : refait sur ces points (même
 * centre, même rayon, appuyé sur l'un d'eux), il reste à l'œil. Bornée aux figures
 * qui vérifient une bissectrice : ailleurs, ces
 * points rendraient « construite » une longueur prise à l'œil (un côté de
 * triangle, par exemple).
 * On recommence tant que quelque chose s'ajoute : deux traits tracés à l'œil ne
 * construisent rien, un trait ne se justifie jamais par lui-même ni par un trait
 * qui dépend de lui, et l'ordre des tracés ne compte pas.
 */
export interface ConstructionOptions {
	/** Exception 4 (lot 9, § 25) : la bissectrice au compas */
	arcsOnSides?: boolean;
}

export function constructionOf(
	objects: readonly DrawnObject[],
	base: readonly Position[],
	figureTraits: readonly Trait[],
	options: ConstructionOptions = {}
): Construction {
	const built = new Set<number>();
	const traits: Trait[] = [...figureTraits];
	let crossings = intersectionsOf(traits);
	/** Intersections des paires de cercles de même rayon (exception du § 15) */
	const paired: Position[] = [];
	const isBuilt = (p: Position) => {
		const eps = EPSILON * scaleOf(p);
		const at = (q: Position) => Math.hypot(p.x - q.x, p.y - q.y) <= eps;
		return base.some(at) || crossings.some(at) || paired.some(at);
	};
	const marks = objects.filter((o): o is DrawnRepere => o.kind === 'repere');
	/** Cercles à l'œil dont l'exception 4 a construit des points, et ces points */
	const eyeballed: EyeballedArc[] = [];
	let grew = true;
	while (grew) {
		grew = false;
		objects.forEach((object, index) => {
			if (built.has(index)) return;
			const trait = traitOf(object);
			if (!trait || !isSupported(object, isBuilt, traits, marks, eyeballed)) return;
			built.add(index);
			traits.push(trait);
			crossings = intersectionsOf(traits);
			grew = true;
		});
		for (const p of sameRadiusCrossings(objects, built, isBuilt)) {
			if (isBuilt(p)) continue;
			paired.push(p);
			grew = true;
		}
		if (!options.arcsOnSides) continue;
		for (const arc of arcsOnSides(objects, built, isBuilt, traits)) {
			eyeballed.push(arc);
			for (const p of arc.points) {
				if (isBuilt(p)) continue;
				paired.push(p);
				grew = true;
			}
		}
	}
	return { built, traits, isBuilt };
}

/** Un cercle à l'œil et les points que l'exception 4 lui fait construire */
interface EyeballedArc {
	circle: Extract<Trait, { kind: 'circle' }>;
	points: Position[];
}

function samePosition(p: Position, q: Position): boolean {
	return Math.hypot(p.x - q.x, p.y - q.y) <= EPSILON * scaleOf(p, q);
}

/** Même centre, même rayon, au calcul flottant près */
function sameCircle(
	p: Extract<Trait, { kind: 'circle' }>,
	q: Extract<Trait, { kind: 'circle' }>
): boolean {
	const eps = EPSILON * (scaleOf(p.center, q.center) + p.radius + q.radius);
	const d = Math.hypot(p.center.x - q.center.x, p.center.y - q.center.y);
	return d <= eps && Math.abs(p.radius - q.radius) <= eps;
}

/**
 * Exception 4 (lot 9, § 25) : chaque cercle (compas ou report) non construit,
 * centré sur un point construit, et ses intersections avec les traits droits
 * construits qui passent par son centre
 */
function arcsOnSides(
	objects: readonly DrawnObject[],
	built: ReadonlySet<number>,
	isBuilt: (p: Position) => boolean,
	traits: readonly Trait[]
): EyeballedArc[] {
	return objects.flatMap((object, index) => {
		if (built.has(index) || (object.kind !== 'cercle' && object.kind !== 'report')) return [];
		const circle = traitOf(object);
		if (!circle || isStraight(circle) || !isBuilt(circle.center)) return [];
		const sides = traits.filter((t) => isStraight(t) && isOnSomeTrait(circle.center, [t]));
		const points = sides.flatMap((side) => intersectTraits(side, circle));
		return points.length > 0 ? [{ circle, points }] : [];
	});
}

/**
 * Repère du rapporteur construit (lot 5, § 16) : centre construit, et point de
 * la base construit ou posé SUR un trait droit construit qui passe par le centre
 * (la base longe le côté, touchée n'importe où). Seule la direction centre →
 * repère est construite : sa distance au centre est libre (revue du lot 5 : un
 * repère n'est jamais un point construit, il ne vaut que pour un trait tiré
 * depuis son propre centre).
 */
export function isBuiltMark(mark: DrawnRepere, construction: Construction): boolean {
	return isMarkSupported(mark, construction.isBuilt, construction.traits);
}

function isMarkSupported(
	mark: DrawnRepere,
	isBuilt: (p: Position) => boolean,
	traits: readonly Trait[]
): boolean {
	const center = { x: mark.vx, y: mark.vy };
	const base = { x: mark.ax, y: mark.ay };
	if (!isBuilt(center)) return false;
	if (isBuilt(base)) return true;
	return traits.some(
		(t) => isStraight(t) && isOnSomeTrait(center, [t]) && isOnSomeTrait(base, [t])
	);
}

/** Les traits de ce qu'a tracé l'élève */
export function traitsOfObjects(objects: readonly DrawnObject[]): Trait[] {
	return objects.flatMap((o) => {
		const trait = traitOf(o);
		return trait ? [trait] : [];
	});
}
