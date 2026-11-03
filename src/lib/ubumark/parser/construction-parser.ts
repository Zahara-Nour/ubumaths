/**
 * Blocs ```figure-a-completer et ```figure-de-travail — lecture de leurs lignes propres
 * ================================================================================
 *
 * Le bloc est une figure de départ : en-tête et langage de ```figure, plus
 * trois lignes d'en-tête à lui (`verifier: carre A ; B` ou
 * `rectangle A ; B ; C` avec l'outil segment, CP-060 ; `symetrique par d`,
 * `symetrique A ; B ; C par d`, symétrique sur quadrillage ; `point A' = <expression>`
 * avec l'outil point, une ligne par point à placer) :
 *
 * ```figure-a-completer
 * fenetre: 0 ; 10 ; 0 ; 6
 * outils: droite
 * verifier: droite_par A ; B
 * ---
 * A = point(1, 2)
 * B = point(7, 2)
 * ```
 *
 * ```figure-de-travail : mêmes lignes, sans `verifier:` (refusé) — l'élève
 * trace pour vérifier, rien n'est noté.
 *
 * `verifier: ?` : énoncé masqué d'une évaluation (chantier `fuite-enonce`), écrit
 * par le serveur avec `outils:` ; refusé dans un modèle par le générateur.
 *
 * `case: N` est posée par le générateur de questions, jamais écrite. Ces
 * lignes sont lues ici puis remplacées par des lignes vides : le reste passe
 * tel quel au parseur de ```figure (numéros de ligne inchangés). Aucun import
 * du parseur de figure ni de geometry-core (`figure-parser.ts` importe ce module).
 *
 * @module ubumark/parser/construction-parser
 */

import {
	CHECK_TOOL,
	CONSTRUCTION_CHECK_KINDS,
	CONSTRUCTION_TOOLS,
	INSTRUMENT_TOOLS,
	PLAIN_PAPER_TOOLS,
	type ConstructionCheck,
	type ConstructionCheckKind,
	type ConstructionSpec,
	type ConstructionTool,
	type TriangleLength
} from '../types/construction';
import type { FigureIssue } from '../types/figure';
import { isMaskedValue } from '../utils/masked-value';

const CONSTRUCTION_BLOCK_START_REGEX = /^```figure-(?:a-completer|de-travail)\s*$/;
const WORK_FIGURE_BLOCK_START_REGEX = /^```figure-de-travail\s*$/;
const SEPARATOR_REGEX = /^\s*---\s*$/;
const KEY_LINE_REGEX = /^(outils|verifier|vérifier|case)\s*:\s*(.*)$/i;
/** `grille:` de l'en-tête de la figure (lue par le parseur de ```figure) : `non` = papier uni */
const GRID_LINE_REGEX = /^grille\s*:\s*(.*)$/i;
const POINT_NAME_REGEX = /^[A-Za-z][A-Za-z0-9_']*$/;
const CASE_INDEX_REGEX = /^\d{1,3}$/;
/** `point A' = <expression>` : le nom, puis l'expression du langage des figures */
const POINT_CHECK_REGEX = /^([A-Za-z][A-Za-z0-9_']*)\s*=\s*(\S.*)$/;
/** Expression d'un `point …` : au-delà, refusée (ligne d'en-tête, pas un script) */
export const POINT_EXPRESSION_MAX_LENGTH = 200;

export const CONSTRUCTION_MISSING_CHECK_MESSAGE =
	'Vérification manquante : ajouter « verifier: droite_par A ; B »';

class LineError extends Error {}

/** Question dont les seules cases sont des figures de travail : rien à noter */
export const WORK_FIGURE_ALONE_MESSAGE =
	'Une figure de travail n’est pas notée : il faut au moins une case notée (choix, texte, formule…)';

export const WORK_FIGURE_CHECK_MESSAGE = 'une figure de travail n’est pas notée : pas de verifier:';

/** ```figure-a-completer ou ```figure-de-travail */
export function isConstructionBlockStart(line: string): boolean {
	return CONSTRUCTION_BLOCK_START_REGEX.test(line);
}

/** ```figure-de-travail : l'élève trace pour vérifier, rien n'est noté */
export function isWorkFigureBlockStart(line: string): boolean {
	return WORK_FIGURE_BLOCK_START_REGEX.test(line);
}

function readTools(value: string): ConstructionTool[] {
	const words = value
		.split(/[,;]/)
		.map((word) => word.trim().toLowerCase())
		.filter((word) => word !== '');
	if (words.length === 0) throw new LineError(`outils: écrire ${CONSTRUCTION_TOOLS.join(', ')}`);
	for (const word of words) {
		if (!(CONSTRUCTION_TOOLS as readonly string[]).includes(word)) {
			throw new LineError(`outil « ${word} » inconnu (${CONSTRUCTION_TOOLS.join(', ')})`);
		}
	}
	return [...new Set(words)] as ConstructionTool[];
}

/** L'en-tête a-t-il un quadrillage (`grille:` autre que `non`) ? */
function hasGrid(lines: readonly string[], headerEnd: number): boolean {
	return lines.slice(0, headerEnd).some((line) => {
		const match = GRID_LINE_REGEX.exec(line.trim());
		return match !== null && match[1].trim().toLowerCase() !== 'non';
	});
}

/** Vérifications à forme propre (pas une liste de points) */
type NamedKind = 'symetrique' | 'point' | 'droite' | 'cercle' | 'triangle' | 'angle' | 'mesure';

/** Nombre de points de chaque vérification, et comment l'écrire */
const CHECK_ARITY: Record<
	Exclude<ConstructionCheckKind, NamedKind>,
	{ count: number; example: string; word: string }
> = {
	droite_par: { count: 2, example: 'droite_par A ; B', word: 'deux' },
	carre: { count: 2, example: 'carre A ; B', word: 'deux' },
	rectangle: { count: 3, example: 'rectangle A ; B ; C', word: 'trois' }
};

/** Points d'une liste `A ; B ; C` (noms vides retirés) */
function splitPoints(text: string): string[] {
	return text
		.split(';')
		.map((name) => name.trim())
		.filter((name) => name !== '');
}

/** `symetrique par d` ou `symetrique A ; B ; C par d` */
function readSymetrique(rest: string, line: number): ConstructionCheck {
	const match = /^(.*?)\s*\bpar\s+(\S+)\s*$/.exec(rest);
	if (!match || !POINT_NAME_REGEX.test(match[2])) {
		throw new LineError('symetrique attend un axe ou un centre : « symetrique par d »');
	}
	const by = match[2];
	if (match[1].trim() === '') return { kind: 'symetrique', by, line };
	const points = splitPoints(match[1]);
	if (points.length < 2 || !points.every((name) => POINT_NAME_REGEX.test(name))) {
		throw new LineError('symetrique attend deux points au moins : « symetrique A ; B par d »');
	}
	if (new Set(points).size !== points.length) {
		throw new LineError('symetrique attend des points différents');
	}
	return { kind: 'symetrique', by, points, line };
}

const TRIANGLE_EXAMPLE = 'triangle ABC : AC = u ; BC = v';
const TRIANGLE_REGEX = /^([A-Z])([A-Z])([A-Z])\s*:\s*(.+)$/;
const TRIANGLE_LENGTH_REGEX = /^([A-Z])([A-Z])\s*=\s*(\S+)$/;
const POINT_PAIR_REGEX = /^([A-Z])([A-Z])$/;

/**
 * `triangle ABC : AC = u ; BC = v` (lot 4) : [AB] est tracé ; les longueurs de
 * [AC] et [BC], par un segment nommé ou deux points (`AC = AB`), dans
 * n'importe quel ordre ; rendues [AC] puis [BC]
 */
function readTriangle(rest: string, line: number): ConstructionCheck {
	const match = TRIANGLE_REGEX.exec(rest.trim());
	const parts = match ? match[4].split(';').map((part) => part.trim()) : [];
	const lengths = parts.map((part) => TRIANGLE_LENGTH_REGEX.exec(part));
	if (!match || lengths.length !== 2 || lengths.some((l) => l === null)) {
		throw new LineError(`triangle attend ses sommets et deux longueurs : « ${TRIANGLE_EXAMPLE} »`);
	}
	const [a, b, c] = [match[1], match[2], match[3]];
	if (new Set([a, b, c]).size !== 3)
		throw new LineError('triangle attend trois sommets différents');
	const read = (l: RegExpExecArray): TriangleLength | null => {
		const ends = [l[1], l[2]];
		if (!ends.includes(c)) return null;
		const other = ends.find((name) => name !== c);
		if (other !== a && other !== b) return null;
		const pair = POINT_PAIR_REGEX.exec(l[3]);
		if (!pair && !POINT_NAME_REGEX.test(l[3])) return null;
		return {
			side: [other, c],
			source: pair ? [pair[1], pair[2]] : [l[3]]
		};
	};
	const given = (lengths as RegExpExecArray[]).map(read);
	const ac = given.find((l) => l?.side[0] === a);
	const bc = given.find((l) => l?.side[0] === b);
	if (!ac || !bc) {
		throw new LineError(
			`triangle ${a}${b}${c} : donner les longueurs des côtés [${a}${c}] et [${b}${c}] ([${a}${b}] est tracé), un segment ou deux points chacune : « ${TRIANGLE_EXAMPLE} »`
		);
	}
	return { kind: 'triangle', points: [a, b, c], lengths: [ac, bc], line };
}

const ANGLE_EXAMPLE = 'angle AOy = 50';
/** `AOy = 50` : point du côté donné, sommet, nom du côté à tracer ; mesure entière (° permis) */
const ANGLE_REGEX = /^([A-Z])([A-Z])([A-Za-z])\s*=\s*(\d{1,3})\s*°?$/;
const ANGLE_MIN = 1;
const ANGLE_MAX = 179;

/** `angle AOy = 50` (lot 5) : [OA) est donné, l'élève trace [Oy) */
function readAngle(rest: string, line: number): ConstructionCheck {
	const match = ANGLE_REGEX.exec(rest.trim());
	if (!match) {
		throw new LineError(
			`angle attend un point du côté donné, le sommet, le nom du côté à tracer et une mesure entière en degrés : « ${ANGLE_EXAMPLE} »`
		);
	}
	const [a, o, side] = [match[1], match[2], match[3]];
	if (new Set([a, o, side]).size !== 3) {
		throw new LineError(
			`angle ${a}${o}${side} : le point, le sommet et le côté doivent être différents`
		);
	}
	const measure = Number(match[4]);
	if (measure < ANGLE_MIN || measure > ANGLE_MAX) {
		throw new LineError(
			`angle ${a}${o}${side} : mesure en degrés entière, de ${ANGLE_MIN} à ${ANGLE_MAX}`
		);
	}
	return { kind: 'angle', points: [a, o], side, measure, line };
}

const MEASURE_EXAMPLE = 'mesure AOB';
/** `AOB` : un point d'un côté, le sommet, un point de l'autre côté */
const MEASURE_REGEX = /^([A-Z])([A-Z])([A-Z])$/;

/** `mesure AOB` (lot 6) : l'angle est tracé, l'élève tape sa mesure */
function readMeasure(rest: string, line: number): ConstructionCheck {
	const match = MEASURE_REGEX.exec(rest.trim());
	if (!match) {
		throw new LineError(
			`mesure attend l’angle par trois points, le sommet au milieu : « ${MEASURE_EXAMPLE} »`
		);
	}
	const [a, o, b] = [match[1], match[2], match[3]];
	if (new Set([a, o, b]).size !== 3) {
		throw new LineError(`mesure ${a}${o}${b} : trois points différents`);
	}
	return { kind: 'mesure', points: [a, o, b], line };
}

const NAMED_EXAMPLES = {
	point: "point A' = symetrie(A, axe=d)",
	droite: 'droite m = mediatrice(A, B)',
	cercle: 'cercle c = cercle_circonscrit(A, B, C)'
} as const;

/**
 * `point A' = symetrie(A, axe=d)` ou `droite m = mediatrice(A, B)` : le nom et
 * l'expression, calculée au jugement
 */
function readNamed(
	kind: 'point' | 'droite' | 'cercle',
	rest: string,
	line: number
): ConstructionCheck {
	const match = POINT_CHECK_REGEX.exec(rest.trim());
	if (!match) {
		throw new LineError(`${kind} attend un nom et une expression : « ${NAMED_EXAMPLES[kind]} »`);
	}
	const expression = match[2].trim();
	if (expression.length > POINT_EXPRESSION_MAX_LENGTH) {
		throw new LineError(
			`${kind} : expression trop longue (${POINT_EXPRESSION_MAX_LENGTH} caractères au plus)`
		);
	}
	return { kind, name: match[1], expression, line };
}

function readCheck(value: string, line: number): ConstructionCheck {
	const [rawWord = '', ...rest] = value.split(/\s+/);
	// `symétrique` accentué, comme `vérifier:`
	const word = rawWord.toLowerCase() === 'symétrique' ? 'symetrique' : rawWord;
	if (word === 'symetrique') return readSymetrique(rest.join(' '), line);
	if (word === 'triangle') return readTriangle(rest.join(' '), line);
	if (word === 'angle') return readAngle(rest.join(' '), line);
	if (word === 'mesure') return readMeasure(rest.join(' '), line);
	if (word === 'point' || word === 'droite' || word === 'cercle') {
		return readNamed(word, rest.join(' '), line);
	}
	if (!(CONSTRUCTION_CHECK_KINDS as readonly string[]).includes(word)) {
		throw new LineError(
			`vérification « ${word} » inconnue (${CONSTRUCTION_CHECK_KINDS.join(', ')})`
		);
	}
	const kind = word as Exclude<ConstructionCheckKind, NamedKind>;
	const { count, example, word: countWord } = CHECK_ARITY[kind];
	const points = splitPoints(rest.join(' '));
	if (points.length !== count || !points.every((name) => POINT_NAME_REGEX.test(name))) {
		throw new LineError(`${kind} attend ${countWord} points : « ${example} »`);
	}
	if (new Set(points).size !== count) {
		throw new LineError(`${kind} attend ${countWord} points différents`);
	}
	if (kind === 'rectangle') {
		return { kind, points: [points[0], points[1], points[2]], line };
	}
	return { kind, points: [points[0], points[1]], line };
}

/**
 * Une vérification qui ne va pas avec les autres : son outil n'est pas celui
 * de la figure, ou c'est un second carré / rectangle (le juge compte les
 * segments en trop sur UN polygone).
 */
function coherenceError(
	check: ConstructionCheck,
	spec: ConstructionSpec,
	grid: boolean
): string | null {
	const tool = CHECK_TOOL[check.kind];
	// Lot 5 (§ 16) : le rapporteur ne sert qu'à l'angle (ses repères construisent des points) ;
	// lot 6 (§ 19) : ou à le mesurer
	if (check.kind !== 'angle' && check.kind !== 'mesure' && spec.tools.includes('rapporteur')) {
		return `le rapporteur ne sert qu’à construire un angle (« verifier: ${ANGLE_EXAMPLE} ») ou à le mesurer (« verifier: ${MEASURE_EXAMPLE} ») ; le retirer de outils:`;
	}
	if (!spec.tools.includes(tool))
		return check.kind === 'point'
			? 'point se place avec l’outil point (outils: point)'
			: `${check.kind} se trace avec l’outil ${tool} (outils: ${tool})`;
	if (check.kind === 'angle') {
		// Lot 5 (§ 16) : seul dans la figure, papier uni, rapporteur et segment
		const name = `${check.points[0]}${check.points[1]}${check.side}`;
		if (spec.checks.length > 1) {
			return `angle ${name} : un angle à construire ne se mêle pas à d’autres vérifications`;
		}
		const allowed = PLAIN_PAPER_TOOLS.angle ?? [];
		const other = spec.tools.find((t) => !allowed.includes(t));
		if (other) return `angle ${name} : outil ${other} hors de la palette (${allowed.join(', ')})`;
		if (!spec.tools.includes('segment')) {
			return `angle ${name} : le côté se trace au segment (outils: ${allowed.join(', ')})`;
		}
		if (grid) {
			return `angle ${name} : l’angle se construit sur papier uni ; retirer « grille: » (ou écrire « grille: non »)`;
		}
	} else if (check.kind === 'mesure') {
		// Lot 6 (§ 19) : seul dans la figure, papier uni, le rapporteur seul
		const name = check.points.join('');
		if (spec.checks.length > 1) {
			return `mesure ${name} : un angle à mesurer ne se mêle pas à d’autres vérifications`;
		}
		const other = spec.tools.find((t) => t !== 'rapporteur');
		if (other) return `mesure ${name} : outil ${other} hors de la palette (rapporteur)`;
		if (grid) {
			return `mesure ${name} : l’angle se mesure sur papier uni ; retirer « grille: » (ou écrire « grille: non »)`;
		}
	} else if (check.kind === 'triangle') {
		// Lot 4 (§ 13) : seul dans la figure, papier uni, palette du triangle
		const name = check.points.join('');
		if (spec.checks.length > 1) {
			return `triangle ${name} : un triangle à construire ne se mêle pas à d’autres vérifications`;
		}
		const allowed = PLAIN_PAPER_TOOLS.triangle ?? [];
		const other = spec.tools.find((t) => !allowed.includes(t));
		if (other)
			return `triangle ${name} : outil ${other} hors de la palette (${allowed.join(', ')})`;
		if (grid) {
			return `triangle ${name} : le triangle se construit sur papier uni ; retirer « grille: » (ou écrire « grille: non »)`;
		}
	} else if (check.kind === 'droite' || check.kind === 'cercle') {
		// Lots 3 et 3b : ce juge ignore les autres traits ; il ne juge rien d'autre
		const what = check.kind === 'droite' ? 'une droite' : 'un cercle';
		if (spec.checks.some((c) => c.kind !== check.kind)) {
			return `${check.kind} ${check.name} : ${what} à construire ne se mêle pas à d’autres vérifications`;
		}
		const first = spec.checks.find((c) => c.kind === check.kind && c.name === check.name);
		if (first !== check) {
			const twins = check.kind === 'droite' ? 'deux droites nommées' : 'deux cercles nommés';
			return `${twins} ${check.name.replace("'", '’')}`;
		}
		// Un point ou un segment tracé serait jugé comme une réponse forgée (revue du lot 3)
		const allowed = PLAIN_PAPER_TOOLS[check.kind] ?? [];
		const other = spec.tools.find((t) => !allowed.includes(t));
		if (other)
			return `${check.kind} ${check.name} : outil ${other} hors de la palette (${allowed.join(', ')})`;
		// Lot 3b (§ 11, décision de David) : le centre tombe rarement sur un nœud
		if (check.kind === 'cercle' && grid) {
			return `cercle ${check.name} : le cercle circonscrit se construit sur papier uni ; retirer « grille: » (ou écrire « grille: non »)`;
		}
	} else if (check.kind === 'point') {
		const first = spec.checks.find((c) => c.kind === 'point' && c.name === check.name);
		if (first !== check) return `deux points nommés ${check.name.replace("'", '’')}`;
	} else {
		const segmentChecks = spec.checks.filter(
			(c) =>
				c.kind !== 'droite_par' &&
				c.kind !== 'point' &&
				c.kind !== 'droite' &&
				c.kind !== 'cercle' &&
				c.kind !== 'triangle' &&
				c.kind !== 'angle' &&
				c.kind !== 'mesure'
		);
		if (check.kind !== 'droite_par' && segmentChecks[0] !== check) {
			const symmetry = check.kind === 'symetrique' || segmentChecks[0].kind === 'symetrique';
			return symmetry
				? 'un seul carré, rectangle ou symétrique par figure'
				: 'un seul carré ou rectangle par figure';
		}
	}
	const plainPaper = PLAIN_PAPER_TOOLS[check.kind];
	if (!plainPaper) {
		// Droite, carré, rectangle : le juge ne connaît que les traits de leur outil
		if (spec.tools.length > 1) return `${check.kind} : un seul outil par figure (outils: ${tool})`;
	} else if (!grid && !spec.tools.some((t) => INSTRUMENT_TOOLS.includes(t))) {
		return `sans quadrillage, ${check.kind} demande les instruments (outils: ${plainPaper.join(', ')}), ou ajouter « grille: 1 »`;
	}
	return null;
}

/**
 * Lire les lignes propres du bloc (avant `---`) : la spécification, les
 * erreurs situées, et le texte à donner au parseur de ```figure.
 * `work` : bloc ```figure-de-travail (`verifier:` refusé, aucune vérification exigée).
 */
export function readConstructionHeader(
	source: string,
	{ work = false }: { work?: boolean } = {}
): {
	figureSource: string;
	spec: ConstructionSpec;
	errors: FigureIssue[];
} {
	const lines = source.split('\n');
	const separator = lines.findIndex((l) => SEPARATOR_REGEX.test(l));
	const headerEnd = separator === -1 ? lines.length : separator;
	const errors: FigureIssue[] = [];
	const spec: ConstructionSpec = { tools: ['droite'], checks: [], ...(work && { work: true }) };
	let toolsSeen = false;
	let checkErrors = 0;

	for (let index = 0; index < headerEnd; index++) {
		const kv = KEY_LINE_REGEX.exec(lines[index].trim());
		if (!kv) continue;
		const line = index + 1;
		const key = kv[1].toLowerCase();
		const value = kv[2].trim();
		lines[index] = '';
		try {
			if (key === 'outils') {
				if (toolsSeen) throw new LineError('outils: écrit deux fois');
				toolsSeen = true;
				spec.tools = readTools(value);
			} else if (key === 'case') {
				if (!CASE_INDEX_REGEX.test(value)) {
					throw new LineError('case: attend un numéro de case (0, 1, 2…)');
				}
				spec.caseIndex = Number(value);
			} else if (work) {
				throw new LineError(WORK_FIGURE_CHECK_MESSAGE);
			} else if (isMaskedValue(value)) {
				// Énoncé masqué d'une évaluation (chantier `fuite-enonce`) : rien à vérifier ici
				spec.masked = true;
			} else {
				try {
					spec.checks.push(readCheck(value, line));
				} catch (error) {
					checkErrors++;
					throw error;
				}
			}
		} catch (error) {
			if (!(error instanceof LineError)) throw error;
			errors.push({ message: `Ligne ${line} : ${error.message}`, line });
		}
	}
	if (!work && !spec.masked && spec.checks.length === 0 && checkErrors === 0) {
		errors.push({ message: CONSTRUCTION_MISSING_CHECK_MESSAGE });
	}
	// `outils:` absent : l'outil de la première vérification (droite par défaut) ;
	// point ou symétrique sans quadrillage : les instruments (lot 2b)
	const grid = hasGrid(lines, headerEnd);
	if (!toolsSeen && spec.checks.length > 0) {
		const kind = spec.checks[0].kind;
		// La droite (lot 3) garde ses instruments sur quadrillage ; le cercle (lot 3b) y est refusé
		const keeps =
			kind === 'droite' ||
			kind === 'cercle' ||
			kind === 'triangle' ||
			kind === 'angle' ||
			kind === 'mesure';
		const plainPaper = grid && !keeps ? undefined : PLAIN_PAPER_TOOLS[kind];
		spec.tools = plainPaper ? [...plainPaper] : [CHECK_TOOL[kind]];
	}
	const coherent: ConstructionCheck[] = [];
	for (const check of spec.checks) {
		const message = coherenceError(check, spec, grid);
		if (message) errors.push({ message: `Ligne ${check.line} : ${message}`, line: check.line });
		else coherent.push(check);
	}
	spec.checks = coherent;
	return { figureSource: lines.join('\n'), spec, errors };
}
