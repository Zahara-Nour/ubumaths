/**
 * Vecteur à tracer sur un solide — points cliquables, réponse, juge, phrases, correction
 * ======================================================================================
 *
 * ```solide
 * forme: cube 2
 * sommets: A B C D E F G H
 * tracer: vecteur AB + AD + AE depuis A
 * ```
 *
 * L'élève touche un point pour l'origine, puis un point pour l'extrémité, parmi
 * les **points cliquables** : les sommets nommés, puis les points déclarés
 * (`points:`). Origine imposée (`depuis A`) : posée d'office, il ne touche que
 * l'extrémité. Chantier `solide-vecteur`, lot 2 (`docs/wip/solide-vecteur-progress.md`,
 * Phase 0, points 2 à 5).
 *
 * Réponse de la case (une seule) : `A/G`, noms de l'origine puis de l'extrémité
 * (`A/` : extrémité pas posée). Réponse attendue : les couples justes séparés par
 * `|`, le couple de la correction d'abord (`A/G`, ou `A/B|D/C|E/F|H/G` quand
 * l'origine est libre : tout représentant). Le calcul en 3D (avec tolérance) se
 * fait à la génération ; le juge ne compare que des noms.
 *
 * Calcul pur, sans Svelte.
 *
 * @module ubumark/utils/solide-gestes
 */

import type { EspacePoint } from './espace-scene';
import { solidePoints3, type Point3, type SolideScene } from './espace-solides';
import type { SolideSpec, SolideTask, SolideVectorTerm } from '../types/espace';

// Types

/** Ce qu'il faut d'un solide pour situer ses points */
export type SolideGeometry = Pick<SolideSpec, 'form' | 'dims' | 'names' | 'points'>;

/** Un point que l'élève peut toucher : son indice (sommets, puis points déclarés), son nom, sa place en 3D */
export interface SolideClickablePoint {
	index: number;
	name: string;
	at: Point3;
}

/** Une flèche entre deux points (indices : sommets, puis points déclarés) */
export interface SolideVectorEnds {
	from: number;
	to: number;
}

/** Phrase de la correction ; `text` peut porter des formules `$…$` (LaTeX en ligne d'ubumark) */
export interface SolideVectorMistake {
	text: string;
}

// Constantes

/** Écart relatif toléré (calculs en virgule flottante, demis) */
const RELATIVE_TOLERANCE = 1e-9;

export const BOTH_MISSING = 'Il faut placer l’origine et l’extrémité.';
/** Origine imposée : posée d'office, seule l'extrémité manque */
export const END_MISSING = 'Il faut placer l’extrémité.';
export const SAME_POINT = 'Ton origine et ton extrémité sont au même endroit.';
export const WRONG_DIRECTION = 'Ta flèche va dans le mauvais sens.';
/** Origine imposée, bon vecteur ailleurs : réponse que l'écran ne produit pas (origine posée d'office) */
export const WRONG_ORIGIN = 'Ta flèche ne part pas de l’origine imposée.';

/** Séparateur des couples justes dans la réponse attendue */
const PAIRS_SEPARATOR = '|';

// Functions

/** Écart sous lequel deux positions sont confondues (relatif à la taille du solide) */
function toleranceOf(spec: SolideGeometry): number {
	return RELATIVE_TOLERANCE * Math.max(1, ...spec.dims);
}

const sub = (a: Point3, b: Point3): Point3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });

const close = (a: Point3, b: Point3, tolerance: number) =>
	Math.abs(a.x - b.x) <= tolerance &&
	Math.abs(a.y - b.y) <= tolerance &&
	Math.abs(a.z - b.z) <= tolerance;

const isNull = (u: Point3, tolerance: number) => close(u, { x: 0, y: 0, z: 0 }, tolerance);

/**
 * Les points cliquables : les sommets nommés (ordre de `sommets:`), puis les
 * points déclarés (ordre de `points:`)
 */
export function solideClickablePoints(spec: SolideGeometry): SolideClickablePoint[] {
	const at = solidePoints3(spec.form, spec.dims, spec.points);
	const vertexCount = at.length - spec.points.length;
	const clickable: SolideClickablePoint[] = [];
	(spec.names ?? []).forEach((name, index) => {
		if (name !== null) clickable.push({ index, name, at: at[index] });
	});
	spec.points.forEach((point, k) => {
		clickable.push({ index: vertexCount + k, name: point.name, at: at[vertexCount + k] });
	});
	return clickable;
}

/** Position à l'écran d'un point (indice : sommets, puis points déclarés) dans la scène */
export function solidePointAt(scene: SolideScene, index: number): EspacePoint {
	return index < scene.vertices.length
		? scene.vertices[index]
		: scene.points[index - scene.vertices.length];
}

/** Le vecteur de la combinaison, en 3D */
export function combinationVector(spec: SolideGeometry, terms: SolideVectorTerm[]): Point3 {
	const at = solidePoints3(spec.form, spec.dims, spec.points);
	return terms.reduce(
		(sum, t) => {
			const u = sub(at[t.to], at[t.from]);
			return { x: sum.x + t.coef * u.x, y: sum.y + t.coef * u.y, z: sum.z + t.coef * u.z };
		},
		{ x: 0, y: 0, z: 0 }
	);
}

/** La combinaison est-elle le vecteur nul ? */
export function isNullCombination(spec: SolideGeometry, terms: SolideVectorTerm[]): boolean {
	return isNull(combinationVector(spec, terms), toleranceOf(spec));
}

/**
 * Les flèches justes entre deux points cliquables : depuis l'origine imposée ;
 * origine libre, tout représentant. La flèche de la correction d'abord : depuis
 * l'origine imposée, sinon depuis le premier point du premier vecteur de la
 * combinaison (s'il la porte), puis dans l'ordre des points cliquables.
 */
export function solideVectorPairs(spec: SolideGeometry, task: SolideTask): SolideVectorEnds[] {
	const clickable = solideClickablePoints(spec);
	const u = combinationVector(spec, task.terms);
	const tolerance = toleranceOf(spec);
	if (isNull(u, tolerance)) return [];
	const origins =
		task.origin === null ? clickable : clickable.filter((p) => p.index === task.origin);
	const pairs: SolideVectorEnds[] = [];
	for (const p of origins) {
		for (const q of clickable) {
			if (close(sub(q.at, p.at), u, tolerance)) pairs.push({ from: p.index, to: q.index });
		}
	}
	const first = task.terms[0]?.from;
	const preferred = pairs.findIndex((pair) => pair.from === first);
	if (task.origin === null && preferred > 0) {
		const [pair] = pairs.splice(preferred, 1);
		pairs.unshift(pair);
	}
	return pairs;
}

/** Nom d'un point (indice : sommets, puis points déclarés) */
function nameOf(spec: SolideGeometry, index: number): string {
	const vertexCount = solidePoints3(spec.form, spec.dims, []).length;
	return index < vertexCount
		? (spec.names?.[index] ?? '')
		: (spec.points[index - vertexCount]?.name ?? '');
}

/** Réponse de la case : `A/G` (`A/` : extrémité pas posée) */
export function solideAnswer(from: string | null, to: string | null): string {
	return `${from ?? ''}/${to ?? ''}`;
}

/** Les deux noms d'une réponse `A/G` (null : pas posé) */
export function readSolideAnswer(answer: string): { from: string | null; to: string | null } {
	const [from = '', to = ''] = answer.trim().split('/');
	return { from: from.trim() || null, to: to.trim() || null };
}

/** Réponse attendue : les couples justes (`A/G|B/H`), celui de la correction d'abord */
export function expectedSolideAnswer(spec: SolideSpec): string {
	if (spec.task === undefined) return '';
	return solideVectorPairs(spec, spec.task)
		.map((pair) => solideAnswer(nameOf(spec, pair.from), nameOf(spec, pair.to)))
		.join(PAIRS_SEPARATOR);
}

/** La réponse de l'élève (`A/G`) est-elle l'un des couples justes ? */
export function isSolideAnswerCorrect(answer: string, expected: string): boolean {
	const { from, to } = readSolideAnswer(answer);
	if (from === null || to === null) return false;
	return expected
		.split(PAIRS_SEPARATOR)
		.some((pair) => pair.trim() !== '' && pair.trim() === solideAnswer(from, to));
}

/** La flèche juste de la correction ; null si aucune (bloc sans geste) */
export function solideSolutionVector(spec: SolideSpec): SolideVectorEnds | null {
	if (spec.task === undefined) return null;
	return solideVectorPairs(spec, spec.task)[0] ?? null;
}

/** `\overrightarrow{AB}` */
const arrowLatex = (from: string, to: string) => `\\overrightarrow{${from}${to}}`;

/** Un coefficient sans son signe : rien pour 1, `2`, `\frac{3}{2}` */
function coefficientLatex(coef: number): string {
	const size = Math.abs(coef);
	if (size === 1) return '';
	if (Number.isInteger(size)) return String(size);
	return `\\frac{${Math.round(size * 2)}}{2}`;
}

/** La combinaison en LaTeX : `\overrightarrow{AB}+\overrightarrow{AD}-\frac{1}{2}\overrightarrow{AE}` */
export function combinationLatex(spec: SolideSpec): string {
	const terms = spec.task?.terms ?? [];
	return terms
		.map((t, i) => {
			const sign = t.coef < 0 ? '-' : i === 0 ? '' : '+';
			return `${sign}${coefficientLatex(t.coef)}${arrowLatex(nameOf(spec, t.from), nameOf(spec, t.to))}`;
		})
		.join('');
}

/** La phrase de la correction ; null si la flèche est juste (ou sans geste) */
export function solideVectorMistake(answer: string, spec: SolideSpec): SolideVectorMistake | null {
	const task = spec.task;
	if (task === undefined) return null;
	const imposed = task.origin !== null;
	const clickable = solideClickablePoints(spec);
	const { from, to } = readSolideAnswer(answer);
	const p = clickable.find((c) => c.name === from);
	const q = clickable.find((c) => c.name === to);
	// Origine posée (par l'élève ou d'office) : seule l'extrémité manque
	if (q === undefined) return { text: imposed || p !== undefined ? END_MISSING : BOTH_MISSING };
	if (p === undefined) return { text: BOTH_MISSING };
	const tolerance = toleranceOf(spec);
	const drawn = sub(q.at, p.at);
	if (isNull(drawn, tolerance)) return { text: SAME_POINT };
	const u = combinationVector(spec, task.terms);
	if (close(drawn, u, tolerance)) {
		return !imposed || p.index === task.origin ? null : { text: WRONG_ORIGIN };
	}
	if (close(drawn, { x: -u.x, y: -u.y, z: -u.z }, tolerance)) return { text: WRONG_DIRECTION };
	return {
		text: `Ta flèche représente $${arrowLatex(p.name, q.name)}$, pas $${combinationLatex(spec)}$.`
	};
}
