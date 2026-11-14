/**
 * Segments tracés par la tortue : arrondi, normalisation (pour comparer deux tracés sans tenir
 * compte du chemin suivi) et test du cadre affiché.
 *
 * Unité : le carreau. Repère mathématique : x vers la droite, y vers le haut.
 */

// =============================================================================
// Types
// =============================================================================

export interface Point {
	x: number;
	y: number;
}

export interface Segment {
	de: Point;
	a: Point;
}

// =============================================================================
// Constantes
// =============================================================================

/** Demi-côté du quadrillage affiché (20 × 20 carreaux, tortue au centre). */
export const DEMI_COTE_CADRE = 10;

/** Précision des coordonnées : nettoie les restes de cos / sin (2.9999999999 → 3). */
const PRECISION = 1e9;

/** Tolérance de comparaison après arrondi. */
const EPSILON = 1e-6;

// =============================================================================
// Fonctions
// =============================================================================

/** Arrondit au milliardième ; `-0` devient `0`. */
export function arrondir(valeur: number): number {
	return Math.round(valeur * PRECISION) / PRECISION || 0;
}

function comparerPoints(p: Point, q: Point): number {
	if (Math.abs(p.x - q.x) > EPSILON) return p.x - q.x;
	if (Math.abs(p.y - q.y) > EPSILON) return p.y - q.y;
	return 0;
}

function comparerSegments(s: Segment, t: Segment): number {
	return comparerPoints(s.de, t.de) || comparerPoints(s.a, t.a);
}

/**
 * Forme canonique d'un tracé : chaque segment orienté du plus petit point au plus grand, segments
 * nuls retirés, segments d'une même droite qui se touchent ou se chevauchent fusionnés, liste
 * triée. Deux programmes qui dessinent la même figure donnent la même forme.
 */
export function normaliserSegments(segments: readonly Segment[]): Segment[] {
	// Regroupement par droite : direction unitaire (sens fixé) et distance signée à l'origine.
	// Chaque droite est rangée dans une case de taille EPSILON ; une nouvelle droite cherche sa
	// pareille dans sa case et les cases voisines, pour qu'un arrondi à la frontière de deux
	// cases ne sépare pas deux morceaux d'une même droite.
	const droites: Droite[] = [];
	const cases = new Map<string, Droite[]>();

	for (const segment of segments) {
		const de = { x: arrondir(segment.de.x), y: arrondir(segment.de.y) };
		const a = { x: arrondir(segment.a.x), y: arrondir(segment.a.y) };
		const longueur = Math.hypot(a.x - de.x, a.y - de.y);
		if (longueur < EPSILON) continue;

		const [debut, fin] = comparerPoints(de, a) <= 0 ? [de, a] : [a, de];
		const dx = (fin.x - debut.x) / longueur;
		const dy = (fin.y - debut.y) / longueur;
		const decalage = dx * debut.y - dy * debut.x;

		let droite = droiteVoisine(cases, dx, dy, decalage);
		if (!droite) {
			droite = { dx, dy, decalage, morceaux: [] };
			droites.push(droite);
			const cle = cleDeCase(caseDe(dx), caseDe(dy), caseDe(decalage));
			cases.set(cle, [...(cases.get(cle) ?? []), droite]);
		}
		droite.morceaux.push({
			t: droite.dx * debut.x + droite.dy * debut.y,
			tFin: droite.dx * fin.x + droite.dy * fin.y,
			de: debut,
			a: fin
		});
	}

	const resultat: Segment[] = [];
	for (const { morceaux } of droites) {
		morceaux.sort((m, n) => m.t - n.t);
		let courant = { ...morceaux[0] };
		for (const morceau of morceaux.slice(1)) {
			if (morceau.t <= courant.tFin + EPSILON) {
				if (morceau.tFin > courant.tFin) {
					courant.tFin = morceau.tFin;
					courant.a = morceau.a;
				}
			} else {
				resultat.push({ de: courant.de, a: courant.a });
				courant = { ...morceau };
			}
		}
		resultat.push({ de: courant.de, a: courant.a });
	}

	return resultat.sort(comparerSegments);
}

interface Droite {
	dx: number;
	dy: number;
	decalage: number;
	morceaux: { t: number; tFin: number; de: Point; a: Point }[];
}

function caseDe(valeur: number): number {
	return Math.round(valeur / EPSILON);
}

function cleDeCase(i: number, j: number, k: number): string {
	return `${i}|${j}|${k}`;
}

/** Droite déjà vue, à la tolérance près, dans la case de (dx, dy, décalage) ou une voisine. */
function droiteVoisine(
	cases: Map<string, Droite[]>,
	dx: number,
	dy: number,
	decalage: number
): Droite | undefined {
	const [i, j, k] = [caseDe(dx), caseDe(dy), caseDe(decalage)];
	for (const di of [-1, 0, 1]) {
		for (const dj of [-1, 0, 1]) {
			for (const dk of [-1, 0, 1]) {
				const trouvee = cases
					.get(cleDeCase(i + di, j + dj, k + dk))
					?.find(
						(droite) =>
							Math.abs(droite.dx - dx) <= EPSILON &&
							Math.abs(droite.dy - dy) <= EPSILON &&
							Math.abs(droite.decalage - decalage) <= EPSILON
					);
				if (trouvee) return trouvee;
			}
		}
	}
	return undefined;
}

/** Vrai si les deux tracés dessinent la même figure, quel que soit le chemin suivi. */
export function memesTraces(premier: readonly Segment[], second: readonly Segment[]): boolean {
	const a = normaliserSegments(premier);
	const b = normaliserSegments(second);
	return a.length === b.length && a.every((segment, i) => comparerSegments(segment, b[i]) === 0);
}

/** Les huit symétries du quadrillage : quarts de tour, et les mêmes après un retournement. */
const SYMETRIES: ((p: Point) => Point)[] = [
	(p) => ({ x: p.x, y: p.y }),
	(p) => ({ x: -p.y, y: p.x }),
	(p) => ({ x: -p.x, y: -p.y }),
	(p) => ({ x: p.y, y: -p.x }),
	(p) => ({ x: -p.x, y: p.y }),
	(p) => ({ x: p.y, y: p.x }),
	(p) => ({ x: p.x, y: -p.y }),
	(p) => ({ x: -p.y, y: -p.x })
];

/** Tracé déplacé pour que le coin bas gauche de son encadrement soit à l'origine. */
function auCoin(segments: readonly Segment[]): Segment[] {
	const points = segments.flatMap((segment) => [segment.de, segment.a]);
	const xMin = Math.min(...points.map((p) => p.x));
	const yMin = Math.min(...points.map((p) => p.y));
	const deplacer = (p: Point) => ({ x: arrondir(p.x - xMin), y: arrondir(p.y - yMin) });
	return segments.map((segment) => ({ de: deplacer(segment.de), a: deplacer(segment.a) }));
}

/**
 * Vrai si les deux tracés dessinent la même figure à un déplacement près : translation, quart
 * de tour, demi-tour, retournement (les huit symétries du quadrillage). Une rotation d'un autre
 * angle ne compte pas : la tortue part toujours vers la droite.
 */
export function memesFormes(premier: readonly Segment[], second: readonly Segment[]): boolean {
	const b = normaliserSegments(second);
	const a = normaliserSegments(premier);
	if (a.length !== b.length) return false;
	if (a.length === 0) return true;
	const cible = auCoin(b);
	return SYMETRIES.some((symetrie) => {
		const image = a.map((segment) => ({ de: symetrie(segment.de), a: symetrie(segment.a) }));
		return memesTraces(auCoin(image), cible);
	});
}

/** Vrai si un segment ou la tortue sort du quadrillage affiché (le cadre est convexe : les
 * extrémités suffisent). */
export function sortDuCadre(
	segments: readonly Segment[],
	tortue: Point,
	demiCote: number = DEMI_COTE_CADRE
): boolean {
	const dehors = (p: Point) =>
		Math.abs(p.x) > demiCote + EPSILON || Math.abs(p.y) > demiCote + EPSILON;
	return dehors(tortue) || segments.some((segment) => dehors(segment.de) || dehors(segment.a));
}
