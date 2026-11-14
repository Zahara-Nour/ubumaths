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
	LINE_GRID_TOOLS,
	bissectriceOf,
	centeredCircleOf,
	centeredCircleTools,
	PLAIN_PAPER_TOOLS,
	triangleTools,
	rightAngleOf,
	isRuledLength,
	isRuledPolygonCheck,
	isSquaresLength,
	RULED_POLYGON_TOOLS,
	type ConstructionCheck,
	type ConstructionCheckKind,
	type ConstructionSpec,
	type ConstructionTool,
	readLengthText,
	type RuledPolygonCheck,
	type TriangleAngle,
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
type NamedKind =
	| 'symetrique'
	| 'point'
	| 'droite'
	| 'cercle'
	| 'triangle'
	| 'angle'
	| 'mesure'
	| 'segment'
	| 'mesure_segment';

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

/** Mesure d'un angle à construire (lots 5 et 7), en degrés entiers */
const ANGLE_MIN = 1;
const ANGLE_MAX = 179;

const TRIANGLE_EXAMPLE = 'triangle ABC : AC = u ; BC = v';
const TRIANGLE_ANGLES_EXAMPLE = 'triangle ABC : CAB = 40 ; ABC = 65';
const TRIANGLE_REGEX = /^([A-Z])([A-Z])([A-Z])\s*:\s*(.+)$/;
const TRIANGLE_LENGTH_REGEX = /^([A-Z])([A-Z])\s*=\s*(\S+)$/;
/** `CAB = 40` : un angle du triangle, le sommet au milieu, mesure entière (° permis) */
const TRIANGLE_ANGLE_REGEX = /^([A-Z])([A-Z])([A-Z])\s*=\s*(\d{1,3})\s*°?$/;
const POINT_PAIR_REGEX = /^([A-Z])([A-Z])$/;
const TRIANGLE_RIGHT_EXAMPLE = 'triangle ABC : CAB = 90 ; AC = u';
const RULER_TRIANGLE_EXAMPLE = 'triangle ABC : CAB = 90 ; AC = 4 cm';
/** `AC = 3 carreaux` (n° 20) : une longueur sur quadrillage, l'unité obligatoire */
const TRIANGLE_SQUARES_REGEX = /^([A-Z])([A-Z])\s*=\s*(\d{1,3})\s*carreaux?$/;
/** `AC = 4 cm`, `AC = 3 cm 5 mm`, `AC = 35 mm` (PR 4 de `regle-graduee`) : lue par `readLengthText` */
const TRIANGLE_RULED_REGEX = /^([A-Z])([A-Z])\s*=\s*(\d.*(?:cm|mm))$/;
/** Longueur en carreaux d'un triangle rectangle (n° 20) */
const SQUARES_MIN = 1;
const SQUARES_MAX = 50;

/**
 * `triangle ABC : AC = u ; BC = v` (lot 4) : [AB] est tracé ; les longueurs de
 * [AC] et [BC], par un segment nommé ou deux points (`AC = AB`), dans
 * n'importe quel ordre ; rendues [AC] puis [BC].
 * Lot 7 (§ 21) : un angle s'écrit par trois points, le sommet (A ou B) au milieu
 * (`CAB = 40`) ; deux angles (un côté et deux angles), ou une longueur et
 * l'angle qu'elle forme avec [AB] (deux côtés et l'angle compris).
 */
function readTriangle(rest: string, line: number): ConstructionCheck {
	const match = TRIANGLE_REGEX.exec(rest.trim());
	const parts = match ? match[4].split(';').map((part) => part.trim()) : [];
	const usage = `« ${TRIANGLE_EXAMPLE} », « ${TRIANGLE_ANGLES_EXAMPLE} », « triangle ABC : AC = u ; CAB = 40 » ou « ${TRIANGLE_RIGHT_EXAMPLE} »`;
	// Triangle rectangle (n° 20) : l'angle droit peut être la seule donnée
	const aloneRight = parts.length === 1 && Number(TRIANGLE_ANGLE_REGEX.exec(parts[0])?.[4]) === 90;
	if (!match || (parts.length !== 2 && !aloneRight)) {
		throw new LineError(`triangle attend ses sommets et deux données : ${usage}`);
	}
	const [a, b, c] = [match[1], match[2], match[3]];
	if (new Set([a, b, c]).size !== 3)
		throw new LineError('triangle attend trois sommets différents');
	const name = `${a}${b}${c}`;
	/** Le sommet donné (A ou B) d'un côté qui va vers C ; null sinon */
	const sideEnd = (p: string, q: string): string | null => {
		const ends = [p, q];
		if (!ends.includes(c)) return null;
		const other = ends.find((end) => end !== c);
		return other === a || other === b ? other : null;
	};
	const readLength = (l: RegExpExecArray): TriangleLength | null => {
		const other = sideEnd(l[1], l[2]);
		if (!other) return null;
		const pair = POINT_PAIR_REGEX.exec(l[3]);
		if (!pair && !POINT_NAME_REGEX.test(l[3])) return null;
		return {
			side: [other, c],
			source: pair ? [pair[1], pair[2]] : [l[3]]
		};
	};
	const readAngleOf = (l: RegExpExecArray): TriangleAngle => {
		const vertex = l[2];
		const base = vertex === a ? b : vertex === b ? a : null;
		const outer = [l[1], l[3]].sort().join('');
		if (!base || outer !== [base, c].sort().join('')) {
			throw new LineError(
				`triangle ${name} : un angle donné a pour sommet ${a} ou ${b}, entre [${a}${b}] et le côté vers ${c} (« ${c}${a}${b} = 40 » ou « ${a}${b}${c} = 65 »)`
			);
		}
		const measure = Number(l[4]);
		if (measure < ANGLE_MIN || measure > ANGLE_MAX) {
			throw new LineError(
				`triangle ${name} : mesure d’angle en degrés entière, de ${ANGLE_MIN} à ${ANGLE_MAX}`
			);
		}
		return { vertex, base, measure };
	};
	const lengths: TriangleLength[] = [];
	const angles: TriangleAngle[] = [];
	for (const part of parts) {
		const angle = TRIANGLE_ANGLE_REGEX.exec(part);
		if (angle) {
			angles.push(readAngleOf(angle));
			continue;
		}
		const squares = TRIANGLE_SQUARES_REGEX.exec(part);
		const squaresEnd = squares ? sideEnd(squares[1], squares[2]) : null;
		if (squares && squaresEnd) {
			const count = Number(squares[3]);
			if (count < SQUARES_MIN || count > SQUARES_MAX) {
				throw new LineError(
					`triangle ${name} : longueur en carreaux entière, de ${SQUARES_MIN} à ${SQUARES_MAX}`
				);
			}
			lengths.push({ side: [squaresEnd, c], squares: count });
			continue;
		}
		// À la règle graduée (PR 4 de `regle-graduee`) : en millimètres entiers
		const ruled = TRIANGLE_RULED_REGEX.exec(part);
		const ruledEnd = ruled ? sideEnd(ruled[1], ruled[2]) : null;
		const ruledText = ruled ? readLengthText(ruled[3].trim()) : null;
		if (ruledEnd && ruledText) {
			if (!Number.isInteger(ruledText.length) || ruledText.length <= 0) {
				throw new LineError(
					`triangle ${name} : « ${part} » : une longueur à la règle graduée se donne au millimètre près (« ${ruledEnd}${c} = 4 cm », « ${ruledEnd}${c} = 3 cm 5 mm »)`
				);
			}
			lengths.push({ side: [ruledEnd, c], ...ruledText });
			continue;
		}
		const length = TRIANGLE_LENGTH_REGEX.exec(part);
		const read = length ? readLength(length) : null;
		if (!read) {
			throw new LineError(
				`triangle ${name} : « ${part} » n’est ni la longueur d’un côté [${a}${c}] ou [${b}${c}] (un segment ou deux points), ni un angle en ${a} ou en ${b} : ${usage}`
			);
		}
		lengths.push(read);
	}
	// Triangle rectangle (n° 20) : l'angle droit, seul ou avec la longueur du côté qui le porte
	const right = angles.find((g) => g.measure === 90);
	if (right) {
		const vertex = right.vertex;
		const leg = `${vertex}${c}`;
		if (angles.length === 2) {
			throw new LineError(
				`triangle ${name} : l’angle droit en ${vertex} se construit à l’équerre ; il se donne seul ou avec la longueur de [${leg}], pas avec un autre angle`
			);
		}
		if (lengths.length === 1 && lengths[0].side[0] !== vertex) {
			throw new LineError(
				`triangle ${name} : l’angle droit en ${vertex} se donne avec la longueur de [${leg}] (le côté qui le porte), pas celle de [${lengths[0].side.join('')}]`
			);
		}
		return { kind: 'triangle', points: [a, b, c], lengths, angles: [right], line };
	}
	if (lengths.length === 2) {
		const ac = lengths.find((l) => l.side[0] === a);
		const bc = lengths.find((l) => l.side[0] === b);
		if (!ac || !bc) {
			throw new LineError(
				`triangle ${name} : donner les longueurs des côtés [${a}${c}] et [${b}${c}] ([${a}${b}] est tracé), un segment ou deux points chacune : « ${TRIANGLE_EXAMPLE} »`
			);
		}
		return { kind: 'triangle', points: [a, b, c], lengths: [ac, bc], angles: [], line };
	}
	if (angles.length === 2) {
		const atA = angles.find((g) => g.vertex === a);
		const atB = angles.find((g) => g.vertex === b);
		if (!atA || !atB) {
			throw new LineError(
				`triangle ${name} : donner un angle en ${a} et un angle en ${b} : « ${TRIANGLE_ANGLES_EXAMPLE} »`
			);
		}
		if (atA.measure + atB.measure >= 180) {
			throw new LineError(
				`triangle ${name} : ces deux angles ne font pas un triangle (${atA.measure}° + ${atB.measure}° = ${atA.measure + atB.measure}°, il faut moins de 180°)`
			);
		}
		return { kind: 'triangle', points: [a, b, c], lengths: [], angles: [atA, atB], line };
	}
	// Deux côtés et l'angle compris : l'angle est au bout du côté donné ([AC] → l'angle en A)
	const [length] = lengths;
	const [angle] = angles;
	if (length.side[0] !== angle.vertex) {
		throw new LineError(
			`triangle ${name} : l’angle donné doit être compris entre [${a}${b}] et le côté [${length.side.join('')}] : l’angle en ${length.side[0]}`
		);
	}
	return { kind: 'triangle', points: [a, b, c], lengths: [length], angles: [angle], line };
}

const ANGLE_EXAMPLE = 'angle AOy = 50';
/** `AOy = 50` : point du côté donné, sommet, nom du côté à tracer ; mesure entière (° permis) */
const ANGLE_REGEX = /^([A-Z])([A-Z])([A-Za-z])\s*=\s*(\d{1,3})\s*°?$/;

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
/** `, rapporteur posé` (lot 8, § 23), accent facultatif */
const POSED_REGEX = /^rapporteur\s+pos[ée]$/;
/** Ce qui suit les trois lettres : la pose, ou autre chose (refusé) */
const MEASURE_SUFFIX_REGEX = /^([A-Z]{3})\s*(?:,\s*(.*)|\s+(.+))$/;

const SEGMENT_MEASURE_EXAMPLE = 'mesure AB';
/** `AB`, `AB en cm`, `AB en mm` (n° 26) : les deux bouts du segment, l'unité de la case */
const SEGMENT_MEASURE_REGEX = /^([A-Z])([A-Z])(?:\s*(.*))?$/;
const SEGMENT_MEASURE_UNIT_REGEX = /^en\s+(cm|mm)$/;

/**
 * `mesure AB` (n° 26) : le segment [AB] est tracé, l'élève le mesure à la règle
 * graduée et tape sa longueur, en cm entiers (`en mm` : en mm entiers)
 */
function readSegmentMeasure(match: RegExpExecArray, line: number): ConstructionCheck {
	const [a, b] = [match[1], match[2]];
	if (a === b) throw new LineError(`mesure ${a}${b} : deux points différents`);
	const suffix = match[3]?.trim() ?? '';
	if (suffix === '') return { kind: 'mesure_segment', points: [a, b], unit: 'cm', line };
	const unit = SEGMENT_MEASURE_UNIT_REGEX.exec(suffix);
	if (!unit) {
		throw new LineError(
			`mesure ${a}${b} : la longueur se tape en cm ou en mm : « mesure ${a}${b} » (cm) ou « mesure ${a}${b} en mm »`
		);
	}
	return { kind: 'mesure_segment', points: [a, b], unit: unit[1] as 'cm' | 'mm', line };
}

/**
 * `mesure AOB` (lot 6) : l'angle est tracé, l'élève tape sa mesure ;
 * `mesure AOB, rapporteur posé` (lot 8) : le rapporteur est déjà posé ;
 * `mesure AB` (n° 26) : le segment, à la règle graduée
 */
function readMeasure(rest: string, line: number): ConstructionCheck {
	const text = rest.trim();
	// Deux lettres (puis l'unité, ou autre chose) : un segment ; trois : un angle
	const segment = /^[A-Z]{2}(?![A-Z])/.test(text) ? SEGMENT_MEASURE_REGEX.exec(text) : null;
	if (segment) return readSegmentMeasure(segment, line);
	// Une suite qui vise la pose : une virgule, ou le mot rapporteur (`mesure AOB = 50` n'en est pas)
	const found = MEASURE_SUFFIX_REGEX.exec(text);
	const suffixed = found && (found[2] !== undefined || /rapporteur/i.test(found[3])) ? found : null;
	const letters = suffixed ? suffixed[1] : text;
	const suffix = suffixed ? (suffixed[2] ?? suffixed[3]).trim() : null;
	const match = MEASURE_REGEX.exec(letters);
	if (!match) {
		throw new LineError(
			`mesure attend un segment par ses deux bouts (« ${SEGMENT_MEASURE_EXAMPLE} ») ou un angle par trois points, le sommet au milieu (« ${MEASURE_EXAMPLE} »)`
		);
	}
	const [a, o, b] = [match[1], match[2], match[3]];
	if (new Set([a, o, b]).size !== 3) {
		throw new LineError(`mesure ${a}${o}${b} : trois points différents`);
	}
	if (suffix === null) return { kind: 'mesure', points: [a, o, b], line };
	// Une virgule, puis la pose : sans virgule ou autre mot, la forme est dite
	if (suffixed?.[2] === undefined || !POSED_REGEX.test(suffix)) {
		throw new LineError(
			`mesure ${a}${o}${b} : pour un rapporteur déjà posé, écrire « mesure ${a}${o}${b}, rapporteur posé »`
		);
	}
	return { kind: 'mesure', points: [a, o, b], posed: true, line };
}

const SEGMENT_EXAMPLE = 'segment AB = 6 cm';
/** `AB = …` : le point de départ (de la figure), le nom de l'autre bout, la longueur */
const SEGMENT_REGEX = /^([A-Z])([A-Z])\s*=\s*(.+)$/;
/** `… sur [Ax)` : la demi-droite x d'origine A (PR 2) */
const ON_RAY_REGEX = /^(.*?)\s+sur\s+(.*)$/;
const RAY_REGEX = /^\[([A-Z])([a-z][A-Za-z0-9]*)\)$/;

/**
 * `segment AB = 6 cm` (chantier `regle-graduee`, ADR 0036) : un segment de A, de
 * la longueur donnée (`5 cm 3 mm`, `5,3 cm`, `72 mm`), au millimètre près
 */
function readSegmentLength(rest: string, line: number): ConstructionCheck {
	const usage = `« ${SEGMENT_EXAMPLE} » (ou 5 cm 3 mm, 5,3 cm, 72 mm)`;
	const match = SEGMENT_REGEX.exec(rest.trim());
	if (!match) {
		throw new LineError(
			`segment attend le point de départ, le nom de l’autre bout et une longueur : ${usage}`
		);
	}
	const [point, end] = [match[1], match[2]];
	const name = `${point}${end}`;
	if (point === end) {
		throw new LineError(
			`segment ${name} : le point de départ et l’autre bout doivent être différents`
		);
	}
	const onRay = ON_RAY_REGEX.exec(match[3].trim());
	let ray: string | undefined;
	if (onRay) {
		const rayMatch = RAY_REGEX.exec(onRay[2].trim());
		if (!rayMatch) {
			throw new LineError(
				`segment ${name} : la demi-droite s’écrit avec son origine et son nom : « ${SEGMENT_EXAMPLE} sur [${point}x) »`
			);
		}
		if (rayMatch[1] !== point) {
			throw new LineError(
				`segment ${name} : la demi-droite part de ${point} (« sur [${point}${rayMatch[2]}) »)`
			);
		}
		ray = rayMatch[2];
	}
	const read = readLengthText((onRay ? onRay[1] : match[3]).trim());
	if (!read) {
		throw new LineError(`segment ${name} : longueur en cm ou en mm : ${usage}`);
	}
	if (Number.isNaN(read.length)) {
		throw new LineError(
			`segment ${name} : longueur au millimètre près (5,3 cm, 5 cm 3 mm ou 53 mm)`
		);
	}
	if (read.length <= 0) {
		throw new LineError(`segment ${name} : longueur plus grande que 0`);
	}
	return {
		kind: 'segment',
		point,
		end,
		length: read.length,
		unit: read.unit,
		...(ray ? { ray } : {}),
		line
	};
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

const RULED_SQUARE_EXAMPLE = 'carre A ; B ; C ; D';
const RULED_RECTANGLE_EXAMPLE = 'rectangle A ; B ; C ; D : BC = 3 cm';

/**
 * Carré / rectangle cotés sur papier uni (chantier `regle-graduee`, PR 6, Q19) :
 * quatre sommets nommés, `: BC = 3 cm` pour le rectangle ; null pour les formes
 * du quadrillage (`carre A ; B`, `rectangle A ; B ; C`), lues par l'appelant
 */
function readRuledPolygon(
	kind: 'carre' | 'rectangle',
	text: string,
	line: number
): RuledPolygonCheck | null {
	const colon = text.indexOf(':');
	const pointsText = colon === -1 ? text : text.slice(0, colon);
	const lengthText = colon === -1 ? null : text.slice(colon + 1).trim();
	const points = splitPoints(pointsText);
	// Pas quatre sommets : la forme du quadrillage, dont le message d'arité cite aussi celle-ci
	// (revue de #2508 : `rectangle A ; B ; C : BC = 3 cm` n'est pas « quatre sommets attendus »)
	if (points.length !== 4) return null;
	const example = kind === 'carre' ? RULED_SQUARE_EXAMPLE : RULED_RECTANGLE_EXAMPLE;
	if (points.length !== 4 || !points.every((name) => POINT_NAME_REGEX.test(name))) {
		throw new LineError(`${kind} sur papier uni attend quatre sommets : « ${example} »`);
	}
	if (new Set(points).size !== 4) {
		throw new LineError(`${kind} attend quatre sommets différents`);
	}
	const [a, b, c, d] = points;
	if (kind === 'carre') {
		if (lengthText !== null) {
			throw new LineError(
				`carré ${a}${b}${c}${d} : le côté est [${a}${b}], déjà tracé : pas de longueur à donner (« ${RULED_SQUARE_EXAMPLE} »)`
			);
		}
		return { kind, points: [a, b, c, d], ruled: true, line };
	}
	const usage = `« rectangle ${a} ; ${b} ; ${c} ; ${d} : ${b}${c} = 3 cm »`;
	if (lengthText === null) {
		throw new LineError(`rectangle ${a}${b}${c}${d} : donner la longueur de [${b}${c}], ${usage}`);
	}
	const match = /^([A-Z])([A-Z])\s*=\s*(.+)$/.exec(lengthText);
	if (!match || match[1] + match[2] !== b + c) {
		throw new LineError(
			`rectangle ${a}${b}${c}${d} : la longueur donnée est celle de [${b}${c}], ${usage}`
		);
	}
	const read = readLengthText(match[3].trim());
	if (!read) throw new LineError(`rectangle ${a}${b}${c}${d} : longueur en cm ou en mm, ${usage}`);
	if (!Number.isInteger(read.length) || read.length <= 0) {
		throw new LineError(
			`rectangle ${a}${b}${c}${d} : une longueur à la règle graduée se donne au millimètre près (3 cm, 3 cm 5 mm ou 35 mm)`
		);
	}
	return { kind, points: [a, b, c, d], ruled: true, height: read, line };
}

/** Les mots de `verifier:` (le segment à mesurer s'écrit `mesure AB`) */
const AUTHOR_CHECK_WORDS = CONSTRUCTION_CHECK_KINDS.filter((kind) => kind !== 'mesure_segment');

function readCheck(value: string, line: number): ConstructionCheck {
	const [rawWord = '', ...rest] = value.split(/\s+/);
	// `symétrique` accentué, comme `vérifier:`
	const word = rawWord.toLowerCase() === 'symétrique' ? 'symetrique' : rawWord;
	if (word === 'symetrique') return readSymetrique(rest.join(' '), line);
	if (word === 'triangle') return readTriangle(rest.join(' '), line);
	if (word === 'angle') return readAngle(rest.join(' '), line);
	if (word === 'mesure') return readMeasure(rest.join(' '), line);
	if (word === 'segment') return readSegmentLength(rest.join(' '), line);
	if (word === 'mesure_segment') {
		throw new LineError(`pour mesurer un segment, écrire « ${SEGMENT_MEASURE_EXAMPLE} »`);
	}
	if (word === 'carre' || word === 'rectangle') {
		const ruled = readRuledPolygon(word, rest.join(' '), line);
		if (ruled) return ruled;
	}
	if (word === 'point' || word === 'droite' || word === 'cercle') {
		return readNamed(word, rest.join(' '), line);
	}
	if (!(CONSTRUCTION_CHECK_KINDS as readonly string[]).includes(word)) {
		throw new LineError(`vérification « ${word} » inconnue (${AUTHOR_CHECK_WORDS.join(', ')})`);
	}
	const kind = word as Exclude<ConstructionCheckKind, NamedKind>;
	const { count, example, word: countWord } = CHECK_ARITY[kind];
	const points = splitPoints(rest.join(' '));
	if (points.length !== count || !points.every((name) => POINT_NAME_REGEX.test(name))) {
		// PR 6 de `regle-graduee` : la forme du papier uni, à quatre sommets
		const plain =
			kind === 'carre'
				? ` (sur papier uni : « ${RULED_SQUARE_EXAMPLE} »)`
				: kind === 'rectangle'
					? ` (sur papier uni : « ${RULED_RECTANGLE_EXAMPLE} »)`
					: '';
		throw new LineError(`${kind} attend ${countWord} points : « ${example} »${plain}`);
	}
	if (new Set(points).size !== count) {
		throw new LineError(`${kind} attend ${countWord} points différents`);
	}
	if (kind === 'rectangle') {
		return { kind, points: [points[0], points[1], points[2]], line };
	}
	// `carre` désigne aussi le carré coté (PR 6) : le discriminant seul ne suffit plus au typage
	if (kind === 'carre') return { kind, points: [points[0], points[1]], line };
	return { kind, points: [points[0], points[1]], line };
}

const RULER_CIRCLE_EXAMPLE = 'cercle c = cercle(O, rayon=4 cm)';

/**
 * `cercle c = cercle(O, rayon=4 cm)` (chantier `regle-graduee`, PR 3) : longueur au
 * mm près, plus de 0 ; papier uni ; palette Règle graduée · Compas, rien d'autre
 * (un segment ou un Report serait jugé comme une réponse forgée). Le cercle
 * ne se mêle qu'à d'autres cercles (règle des lots 3 et 3b).
 */
function rulerCircleError(
	check: Extract<ConstructionCheck, { kind: 'cercle' }>,
	spec: ConstructionSpec,
	grid: boolean
): string | null {
	const centered = centeredCircleOf(check.expression);
	if (centered?.kind !== 'longueur') return null;
	const label = `cercle ${check.name}`;
	if (Number.isNaN(centered.length)) {
		return `${label} : rayon au millimètre près (3,5 cm, 3 cm 5 mm ou 35 mm)`;
	}
	if (centered.length <= 0) return `${label} : rayon plus grand que 0`;
	if (spec.checks.some((c) => c.kind !== 'cercle')) {
		return `${label} : un cercle à construire ne se mêle pas à d’autres vérifications`;
	}
	const first = spec.checks.find((c) => c.kind === 'cercle' && c.name === check.name);
	if (first !== check) return `deux cercles nommés ${check.name.replace("'", '’')}`;
	const allowed: ConstructionTool[] = ['regle', 'compas'];
	const other = spec.tools.find((t) => !allowed.includes(t));
	if (other) return `${label} : outil ${other} hors de la palette (${allowed.join(', ')})`;
	if (!spec.tools.includes('regle') || !spec.tools.includes('compas')) {
		return `${label} : le rayon se prend à la règle graduée, puis au compas (outils: ${allowed.join(', ')})`;
	}
	if (grid) {
		return `${label} : la règle graduée sert sur papier uni (sur quadrillage, le carreau fait l’unité) ; retirer « grille: » (ou écrire « grille: non »)`;
	}
	return null;
}

/**
 * Carré / rectangle coté (PR 6 de `regle-graduee`) : seul dans la figure, papier
 * uni, palette Segment · Équerre · Règle graduée exactement (Q13 : l'angle droit à
 * l'équerre)
 */
function ruledPolygonError(
	check: RuledPolygonCheck,
	spec: ConstructionSpec,
	grid: boolean
): string | null {
	const name = `${check.kind === 'carre' ? 'carré' : 'rectangle'} ${check.points.join('')}`;
	if (spec.checks.length > 1) {
		return `${name} : un carré ou un rectangle coté ne se mêle pas à d’autres vérifications`;
	}
	if (grid) {
		return `${name} : la règle graduée sert sur papier uni (sur quadrillage : « carre A ; B » ou « rectangle A ; B ; C ») ; retirer « grille: » (ou écrire « grille: non »)`;
	}
	const other = spec.tools.find((t) => !RULED_POLYGON_TOOLS.includes(t));
	if (other)
		return `${name} : outil ${other} hors de la palette (${RULED_POLYGON_TOOLS.join(', ')})`;
	const labels: Record<string, string> = {
		segment: 'le segment',
		equerre: 'l’équerre',
		regle: 'la règle graduée'
	};
	const missing = RULED_POLYGON_TOOLS.find((t) => !spec.tools.includes(t));
	if (missing) {
		return `${name} : il faut ${labels[missing]} (outils: ${RULED_POLYGON_TOOLS.join(', ')})`;
	}
	return null;
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
	// lot 7 (§ 21) : ou à un triangle dont un angle est donné
	// lot 9 (§ 25) : ou à une bissectrice (si le prof l'ajoute à outils:)
	const protractorAllowed =
		check.kind === 'angle' ||
		check.kind === 'mesure' ||
		(check.kind === 'triangle' && check.angles.length > 0 && !rightAngleOf(check)) ||
		(check.kind === 'droite' && bissectriceOf(check.expression) !== null);
	// Chantier `regle-graduee` (ADR 0036) : la règle graduée ne sert qu'au segment de longueur
	// donnée, au cercle de rayon donné en cm (PR 3) et au triangle coté en cm (PR 4, rectangle ;
	// chantier `triangle-cote-cm`, quelconque)
	const rulerCircle =
		check.kind === 'cercle' && centeredCircleOf(check.expression)?.kind === 'longueur';
	const rulerTriangle = check.kind === 'triangle' && check.lengths.some(isRuledLength);
	// … et au carré / rectangle coté (PR 6), qui a ses propres règles ci-dessous
	if (isRuledPolygonCheck(check)) return ruledPolygonError(check, spec, grid);
	// … et à mesurer un segment (n° 26)
	if (
		check.kind !== 'segment' &&
		check.kind !== 'mesure_segment' &&
		!rulerCircle &&
		!rulerTriangle &&
		spec.tools.includes('regle')
	) {
		return `la règle graduée ne sert qu’à tracer un segment de longueur donnée (« verifier: ${SEGMENT_EXAMPLE} »), un cercle de rayon donné (« verifier: ${RULER_CIRCLE_EXAMPLE} »), un triangle coté en cm (« verifier: ${RULER_TRIANGLE_EXAMPLE} ») ou à mesurer un segment (« verifier: ${SEGMENT_MEASURE_EXAMPLE} ») ; la retirer de outils:`;
	}
	if (!protractorAllowed && spec.tools.includes('rapporteur')) {
		return `le rapporteur ne sert qu’à construire un angle (« verifier: ${ANGLE_EXAMPLE} »), à le mesurer (« verifier: ${MEASURE_EXAMPLE} ») à construire un triangle dont un angle est donné (« verifier: ${TRIANGLE_ANGLES_EXAMPLE} ») ou une bissectrice (« verifier: droite d = bissectrice(A, O, B) ») ; le retirer de outils:`;
	}
	if (!spec.tools.includes(tool))
		return check.kind === 'point'
			? 'point se place avec l’outil point (outils: point)'
			: `${check.kind} se trace avec l’outil ${tool} (outils: ${tool})`;
	if (check.kind === 'segment') {
		// ADR 0036 : seul dans la figure, papier uni, règle graduée et segment
		const name = `${check.point}${check.end}`;
		if (spec.checks.length > 1) {
			return `segment ${name} : un segment de longueur donnée ne se mêle pas à d’autres vérifications`;
		}
		const allowed = PLAIN_PAPER_TOOLS.segment ?? [];
		const other = spec.tools.find((t) => !allowed.includes(t));
		if (other) return `segment ${name} : outil ${other} hors de la palette (${allowed.join(', ')})`;
		if (!spec.tools.includes('segment')) {
			return `segment ${name} : le segment se trace avec l’outil segment, le long de la règle (outils: ${allowed.join(', ')})`;
		}
		if (grid) {
			return `segment ${name} : la règle graduée sert sur papier uni (sur quadrillage, le carreau fait l’unité) ; retirer « grille: » (ou écrire « grille: non »)`;
		}
	} else if (check.kind === 'angle') {
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
	} else if (check.kind === 'mesure_segment') {
		// N° 26 : seul dans la figure, papier uni, la règle graduée seule
		const name = check.points.join('');
		if (spec.checks.length > 1) {
			return `mesure ${name} : un segment à mesurer ne se mêle pas à d’autres vérifications`;
		}
		const other = spec.tools.find((t) => t !== 'regle');
		if (other) return `mesure ${name} : outil ${other} hors de la palette (regle)`;
		if (grid) {
			return `mesure ${name} : la règle graduée sert sur papier uni (sur quadrillage, le carreau fait l’unité) ; retirer « grille: » (ou écrire « grille: non »)`;
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
		const right = rightAngleOf(check);
		// PR 4 de `regle-graduee` (triangle rectangle) et chantier `triangle-cote-cm` (quelconque) :
		// les cm, sur papier uni seulement ; toutes les longueurs en cm, ou aucune (décision de
		// David du 2026-11-14 : une seule façon de prendre les longueurs par question)
		const ruled = check.lengths.some(isRuledLength);
		if (ruled) {
			if (!check.lengths.every(isRuledLength)) {
				return `triangle ${name} : les longueurs se donnent toutes en cm (à la règle graduée) ou toutes par un segment à reporter, pas les deux`;
			}
			if (grid) {
				return right
					? `triangle ${name} : une longueur en cm se construit sur papier uni (sur quadrillage : « ${right.vertex}${check.points[2]} = 3 carreaux »)`
					: `triangle ${name} : une longueur en cm se construit sur papier uni ; retirer « grille: » (ou écrire « grille: non »)`;
			}
		}
		// N° 20 : les carreaux, pour le triangle rectangle sur quadrillage seulement
		if (check.lengths.some(isSquaresLength)) {
			if (!right) {
				return `triangle ${name} : une longueur en carreaux ne sert qu’au triangle rectangle sur quadrillage (« triangle ${name} : C${check.points[0]}${check.points[1]} = 90 ; ${check.points[0]}${check.points[2]} = 3 carreaux »)`;
			}
			if (!grid) {
				return `triangle ${name} : une longueur en carreaux demande un quadrillage (ajouter « grille: 1 »), sinon donner un segment à reporter`;
			}
		}
		if (right && grid) {
			const segmentLength = check.lengths.find(
				(l) => !isSquaresLength(l) && !isRuledLength(l) && l.source.length === 1
			);
			if (segmentLength) {
				return `triangle ${name} : sur quadrillage, la longueur se donne en carreaux (« ${segmentLength.side.join('')} = 3 carreaux ») ou par deux points (« ${segmentLength.side.join('')} = ${check.points[0]}${check.points[1]} ») : le report se fait sur papier uni`;
			}
		}
		const allowed = triangleTools(check, grid);
		const other = spec.tools.find((t) => !allowed.includes(t));
		if (other)
			return `triangle ${name} : outil ${other} hors de la palette (${allowed.join(', ')})`;
		if (right) {
			// N° 20 : l'angle droit à l'équerre (papier uni), la longueur au Report ; le segment
			const missing = allowed.find((t) => !spec.tools.includes(t));
			if (missing) {
				return grid
					? `triangle ${name} : sur quadrillage, les côtés se tracent au segment (outils: segment)`
					: `triangle ${name} : l’angle droit se construit à l’équerre${check.lengths.length === 0 ? '' : check.lengths.some(isRuledLength) ? ', la longueur à la règle graduée' : ', la longueur au report'}, puis les côtés au segment (outils: ${allowed.join(', ')})`;
			}
			return null;
		}
		// Chantier `triangle-cote-cm` : les longueurs au compas ouvert sur la règle graduée ;
		// l'angle au rapporteur, C sur la graduation ou à l'arc : la palette entière est exigée
		// (revue de #2658 : un cercle tracé est alors toujours dans la palette)
		if (ruled) {
			const missing = allowed.find((t) => !spec.tools.includes(t));
			if (missing) {
				return check.angles.length > 0
					? `triangle ${name} : l’angle se construit au rapporteur, la longueur à la règle graduée ou au compas ouvert sur la règle, puis les côtés au segment (outils: ${allowed.join(', ')})`
					: `triangle ${name} : les longueurs se prennent au compas ouvert sur la règle graduée, puis les côtés au segment (outils: ${allowed.join(', ')})`;
			}
			return null;
		}
		// Lot 7 (§ 21) : les angles se construisent au rapporteur, leurs côtés à la règle
		if (check.angles.length > 0) {
			const missing = (['rapporteur', 'droite', 'segment'] as const).find(
				(t) => !spec.tools.includes(t)
			);
			if (missing) {
				return `triangle ${name} : un angle donné se construit au rapporteur, son côté à la règle, puis les côtés au segment (outils: ${allowed.join(', ')})`;
			}
		}
		if (grid) {
			return `triangle ${name} : le triangle se construit sur papier uni ; retirer « grille: » (ou écrire « grille: non »)`;
		}
	} else if (check.kind === 'cercle' && rulerCircle) {
		const message = rulerCircleError(check, spec, grid);
		if (message) return message;
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
		// Lot 9 (§ 25) : une bissectrice admet aussi le rapporteur
		const allowed = [
			...(PLAIN_PAPER_TOOLS[check.kind] ?? []),
			...(protractorAllowed && check.kind === 'droite' ? (['rapporteur'] as const) : [])
		];
		const other = spec.tools.find((t) => !allowed.includes(t));
		if (other)
			return `${check.kind} ${check.name} : outil ${other} hors de la palette (${allowed.join(', ')})`;
		// Lot 9 (§ 25) : sur quadrillage, la médiatrice passe par les nœuds ; le Report garde un écartement libre
		if (check.kind === 'droite' && grid && spec.tools.includes('report')) {
			return `droite ${check.name} : le report se prend sur papier uni ; le retirer de outils: (ou retirer « grille: »)`;
		}
		// N° 19 : un rayon pris sur un segment se reporte au Report
		const radiusTaken = check.kind === 'cercle' ? centeredCircleOf(check.expression) : null;
		if (radiusTaken?.kind === 'rayon' && !spec.tools.includes('report')) {
			return `cercle ${check.name} : le rayon ${radiusTaken.from}${radiusTaken.to} se prend au Report (outils: compas, report)`;
		}
		// Lot 3b (§ 11, décision de David) : le centre tombe rarement sur un nœud ; le cercle
		// de centre donné (n° 19, 2026-11-08) se trace sur quadrillage s'il passe par un point,
		// pas si son rayon se reporte (le Report se prend sur papier uni)
		if (check.kind === 'cercle' && grid) {
			const centered = centeredCircleOf(check.expression);
			if (!centered) {
				return `cercle ${check.name} : le cercle circonscrit se construit sur papier uni ; retirer « grille: » (ou écrire « grille: non »)`;
			}
			if (centered.kind === 'rayon' || spec.tools.includes('report')) {
				return `cercle ${check.name} : le rayon se reporte sur papier uni ; retirer « grille: » (ou écrire « grille: non »), ou écrire cercle(${centered.center}, passant=…)`;
			}
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
				c.kind !== 'mesure' &&
				c.kind !== 'segment' &&
				c.kind !== 'mesure_segment'
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
			kind === 'mesure' ||
			kind === 'segment' ||
			kind === 'mesure_segment';
		const first = spec.checks[0];
		// Cercle de centre donné (n° 19) : le compas (et le Report), sur papier uni comme sur quadrillage
		const centered = first.kind === 'cercle' ? centeredCircleOf(first.expression) : null;
		const plainPaper =
			grid && !keeps
				? undefined
				: isRuledPolygonCheck(first)
					? RULED_POLYGON_TOOLS
					: first.kind === 'triangle'
						? triangleTools(first, grid)
						: centered
							? centeredCircleTools(centered)
							: kind === 'droite' && grid
								? LINE_GRID_TOOLS
								: PLAIN_PAPER_TOOLS[kind];
		spec.tools = plainPaper ? [...plainPaper] : [CHECK_TOOL[kind]];
	}
	const coherent: ConstructionCheck[] = [];
	for (const check of spec.checks) {
		// Rapporteur déjà posé (lot 8) : l'élève n'a aucun outil, `outils:` ne dirait rien de vrai
		const posedMessage =
			check.kind === 'mesure' && check.posed && toolsSeen
				? `mesure ${check.points.join('')}, rapporteur posé : l’élève n’a aucun outil ; retirer outils:`
				: null;
		const message = posedMessage ?? coherenceError(check, spec, grid);
		if (message) errors.push({ message: `Ligne ${check.line} : ${message}`, line: check.line });
		else coherent.push(check);
	}
	spec.checks = coherent;
	return { figureSource: lines.join('\n'), spec, errors };
}
