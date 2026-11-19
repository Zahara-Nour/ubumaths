/**
 * Vecteur à tracer dans un repère — réponse, juge, phrases, correction
 * ===================================================================
 *
 * L'élève trace le vecteur d'un bloc ```courbe (`tracer: vecteur u = (3 ; -2)`,
 * chantier `docs/archive/wip/points-repere-progress.md` § 3 et § 10, lot 3) en posant
 * son origine puis son extrémité sur les nœuds de la grille ; une flèche les
 * relie. Origine imposée (`depuis A`) : il ne pose que l'extrémité.
 *
 * Réponse de la case (une seule) : `x1;y1/x2;y2`, origine puis extrémité (la même
 * écriture que la droite à tracer). Réponse attendue : `vecteur 3;-2`, ou
 * `vecteur 3;-2 depuis -1;2` quand l'origine est imposée ; juste si l'extrémité
 * moins l'origine donne le vecteur (et si l'origine est la bonne, imposée).
 *
 * Calcul pur, sans Svelte.
 *
 * @module ubumark/utils/courbe-vecteur
 */

import {
	clean,
	courbeGridSteps,
	gridNodeValues,
	isGridNode,
	isMultiple,
	pointAnswer,
	pointText,
	readPointAnswer,
	type CourbeGridSpec,
	type CourbePlacedPoint
} from './courbe-placer';
import { decimalString } from './number-line-placer';
import { combinationMistake } from './courbe-combinaison';
import type { CourbeVectorTerm } from '../types/courbe';

// Types

/** Le vecteur attendu : ses coordonnées, l'origine imposée s'il y en a une */
export interface ExpectedVector {
	u: CourbePlacedPoint;
	origin?: CourbePlacedPoint;
}

/** Ce que la phrase de correction sait du vecteur (le nom vient du bloc) */
export interface VectorForMistake extends ExpectedVector {
	/** Nom du vecteur (`u`), '' sans nom */
	name: string;
	/** Combinaison écrite (`tracer: vecteur u + v`) : la phrase la nomme */
	terms?: CourbeVectorTerm[];
}

/**
 * Phrase de la correction ; `latex` : à écrire en formule après le texte, puis
 * « . » ; `markdown` : le texte est de l'ubumark en ligne (formules `$…$`)
 */
export interface TracedVectorMistake {
	text: string;
	latex?: string;
	markdown?: boolean;
}

// Constantes

/** Écart relatif toléré (calculs en virgule flottante) */
const RELATIVE_TOLERANCE = 1e-9;

const EXPECTED_REGEX =
	/^vecteur (-?\d+(?:\.\d+)?;-?\d+(?:\.\d+)?)(?: depuis (-?\d+(?:\.\d+)?;-?\d+(?:\.\d+)?))?$/;

const BOTH_MISSING = 'Il faut placer l’origine et l’extrémité.';
const END_MISSING = 'Il faut placer l’extrémité.';
const SAME_POINT = 'Ton origine et ton extrémité sont au même endroit.';
/** Origine imposée, bon vecteur ailleurs : réponse que l'écran ne produit pas (origine posée d'office) */
const WRONG_ORIGIN = 'Ta flèche ne part pas de l’origine imposée.';

// Functions

function sameNumber(a: number, b: number): boolean {
	return Math.abs(a - b) <= RELATIVE_TOLERANCE * Math.max(1, Math.abs(a), Math.abs(b));
}

function sameVector(p: CourbePlacedPoint, q: CourbePlacedPoint): boolean {
	return sameNumber(p.x, q.x) && sameNumber(p.y, q.y);
}

/** Réponse attendue d'une case : `vecteur 3;-2`, `vecteur 3;-2 depuis -1;2` */
export function vectorExpected(u: CourbePlacedPoint, origin?: CourbePlacedPoint): string {
	const base = `vecteur ${pointAnswer(u.x, u.y)}`;
	return origin === undefined ? base : `${base} depuis ${pointAnswer(origin.x, origin.y)}`;
}

/** Le vecteur d'une réponse attendue écrite par `vectorExpected` ; null sinon */
export function readVectorExpected(expected: string): ExpectedVector | null {
	const match = EXPECTED_REGEX.exec(expected.trim());
	if (!match) return null;
	const u = readPointAnswer(match[1]);
	if (u === null) return null;
	const origin = match[2] === undefined ? null : readPointAnswer(match[2]);
	return origin === null ? { u } : { u, origin };
}

/** Les deux points d'une réponse `x1;y1/x2;y2` (null : pas posé) */
function readEnds(answer: string): [CourbePlacedPoint | null, CourbePlacedPoint | null] {
	const [first = '', second = ''] = answer.split('/');
	return [readPointAnswer(first), readPointAnswer(second)];
}

/** Le vecteur de l'origine à l'extrémité */
function difference(p: CourbePlacedPoint, q: CourbePlacedPoint): CourbePlacedPoint {
	return { x: clean(q.x - p.x), y: clean(q.y - p.y) };
}

/** Le vecteur de l'élève (`x1;y1/x2;y2`) est-il celui attendu ? */
export function isTracedVectorCorrect(answer: string, expected: string): boolean {
	const vector = readVectorExpected(expected);
	const [p, q] = readEnds(answer);
	if (vector === null || !p || !q) return false;
	if (vector.origin !== undefined && !sameVector(p, vector.origin)) return false;
	return sameVector(difference(p, q), vector.u);
}

/** Coordonnées en LaTeX, virgule décimale : `(1{,}5\,;\,-2)` */
function coordinatesLatex(u: CourbePlacedPoint): string {
	const french = (v: number) => decimalString(v).replace('.', '{,}');
	return `(${french(u.x)}\\,;\\,${french(u.y)})`;
}

/** La phrase de la correction ; null si le vecteur est juste */
export function tracedVectorMistake(
	answer: string,
	vector: VectorForMistake
): TracedVectorMistake | null {
	const [p, q] = readEnds(answer);
	if (!p || !q) return { text: vector.origin !== undefined ? END_MISSING : BOTH_MISSING };
	const d = difference(p, q);
	if (d.x === 0 && d.y === 0) return { text: SAME_POINT };
	const { u } = vector;
	const fromOrigin = vector.origin === undefined || sameVector(p, vector.origin);
	if (sameVector(d, u)) return fromOrigin ? null : { text: WRONG_ORIGIN };
	if (vector.terms !== undefined) {
		return { text: combinationMistake(d, vector.terms), markdown: true };
	}
	const drawn = `Ta flèche représente le vecteur ${pointText(d.x, d.y)}`;
	if (sameVector(d, { x: -u.x, y: -u.y })) {
		return {
			text: `Ta flèche va dans le mauvais sens : elle représente le vecteur ${pointText(d.x, d.y)}.`
		};
	}
	if (sameVector(d, { x: u.y, y: u.x }) && !sameVector(d, u)) {
		return { text: `${drawn} : tu as échangé l’abscisse et l’ordonnée.` };
	}
	if (vector.name !== '') {
		return { text: `${drawn}, pas`, latex: `\\vec{${vector.name}}\\,${coordinatesLatex(u)}` };
	}
	return { text: `${drawn}, pas ${pointText(u.x, u.y)}.` };
}

/** L'origine `p` porte-t-elle le vecteur dans la fenêtre (les deux bouts sur des nœuds) ? */
function fits(spec: CourbeGridSpec, p: CourbePlacedPoint, u: CourbePlacedPoint): boolean {
	return isGridNode(spec, p.x, p.y) && isGridNode(spec, p.x + u.x, p.y + u.y);
}

/**
 * Les origines possibles dans la fenêtre, de la plus proche de l'origine du
 * repère (en crans de grille) à la plus lointaine ; à égalité, l'abscisse puis
 * l'ordonnée la plus petite
 */
function originsByDistance(spec: CourbeGridSpec, u: CourbePlacedPoint): CourbePlacedPoint[] {
	const { xs, ys } = gridNodeValues(spec);
	const steps = courbeGridSteps(spec);
	const distance = (p: CourbePlacedPoint) => (p.x / steps.x) ** 2 + (p.y / steps.y) ** 2;
	return xs
		.flatMap((x) => ys.map((y) => ({ x: clean(x), y: clean(y) })))
		.filter((p) => fits(spec, p, u))
		.sort((p, q) => distance(p) - distance(q) || p.x - q.x || p.y - q.y);
}

/**
 * Ce qui empêche l'élève de tracer le vecteur (message sans « tracer : ») ; null
 * s'il peut le tracer
 */
export function vectorProblem(
	spec: CourbeGridSpec,
	u: CourbePlacedPoint,
	origin?: { name: string; x: number; y: number }
): string | null {
	if (u.x === 0 && u.y === 0) return 'vecteur nul : l’élève n’a rien à tracer';
	const steps = courbeGridSteps(spec);
	if (!isMultiple(u.x, steps.x) || !isMultiple(u.y, steps.y)) {
		return `les coordonnées ${pointText(u.x, u.y)} ne tombent pas sur la grille (pas ${decimalString(steps.x)} ; ${decimalString(steps.y)}) : régler grille:`;
	}
	if (origin !== undefined) {
		if (!isGridNode(spec, origin.x, origin.y)) {
			return `l’origine ${origin.name} n’est pas sur un nœud de la grille dans la fenêtre`;
		}
		if (!isGridNode(spec, origin.x + u.x, origin.y + u.y)) {
			return `depuis ${origin.name}, l’extrémité sort de la fenêtre (régler x:, y: ou l’origine)`;
		}
		return null;
	}
	if (originsByDistance(spec, u).length === 0) {
		return `le vecteur ${pointText(u.x, u.y)} ne tient pas dans la fenêtre (régler x: ou y:)`;
	}
	return null;
}

/**
 * La flèche juste de la correction : depuis l'origine imposée ; sinon depuis
 * celle de l'élève si elle tient dans la fenêtre, sinon depuis le nœud le plus
 * proche de l'origine du repère où elle tient. null si aucune ne tient
 */
export function solutionVector(
	spec: CourbeGridSpec,
	u: CourbePlacedPoint,
	studentOrigin: CourbePlacedPoint | null,
	origin?: CourbePlacedPoint
): { from: CourbePlacedPoint; to: CourbePlacedPoint } | null {
	const from =
		origin ??
		(studentOrigin !== null && fits(spec, studentOrigin, u)
			? studentOrigin
			: originsByDistance(spec, u)[0]);
	if (from === undefined) return null;
	return { from, to: { x: clean(from.x + u.x), y: clean(from.y + u.y) } };
}
