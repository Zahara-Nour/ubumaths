/**
 * Réponse « intervalles » : jugement d'un ensemble de réels écrit par l'élève
 * ===========================================================================
 *
 * Case marquée `answerKind: 'intervalles'` (ensemble de solutions d'une
 * inéquation). La lecture et la comparaison sont celles de mathAST
 * (`domain/validation` : `parseStudentDomainPieces`, `domainsAreEqual`,
 * `detectDomainMistakes`) ; ce module les traduit dans le barème commun
 * (spécification validée par David le 2026-10-01) :
 *
 * - `correct` : même ensemble, écrit comme il faut (ordre des intervalles indifférent) ;
 * - `unoptimal_form` (½) SEULEMENT pour une écriture à reprendre : intervalles
 *   contigus ou chevauchants non réunis, `[a ; a]` au lieu de `{a}`, borne non
 *   simplifiée. Réglage par modèle : contrainte `intervalForm` (`warn` par défaut,
 *   `strict` → mauvaise forme, `off` → juste) ;
 * - `incorrect` : tout le reste, avec le message de l'erreur reconnue ;
 * - `empty` : rien d'écrit (un « S = » seul compris).
 *
 * Le score 0-100 de mathAST (`calculateDomainSimilarity`) n'est PAS utilisé.
 *
 * @module questions/intervals/interval-answer
 */

import type { ConstraintMode, ValidationStatus } from '$lib/questions/types';
import type { Domain } from '$lib/mathAST/domain/types';
import type { StudentDomainPiece } from '$lib/mathAST/domain/validation';
import {
	parseStudentDomainPieces,
	domainsAreEqual,
	compareDomains,
	detectDomainMistakes,
	MISTAKE_DESCRIPTIONS
} from '$lib/mathAST/domain/validation';
import { expandExcludedPoints } from '$lib/mathAST/domain/validation/compare-domains';
import { isBoundTooComplex } from '$lib/mathAST/domain/validation';
import { difference } from '$lib/mathAST/domain/algebra';
import { formatEndpointValue } from '$lib/math/intervals/format';
import { intervalDomain } from '$lib/mathAST/domain/factory';
import type { Interval } from '$lib/mathAST/domain/types';
import { toLatex } from '$lib/mathAST/latex-generator';
import type { MathNode } from '$lib/mathAST/types';
import { variable } from '$lib/mathAST/factory';
import { isInfinity, isPositiveInfinity } from '$lib/mathAST/guards';
import { compareNumericNodes } from '$lib/mathAST/eval/compare-numeric';
import { checkReducedFractions } from '$lib/questions/constraint-validators';

// Types
export interface IntervalVerdict {
	status: ValidationStatus;
	/** Message montré à l'élève (erreur reconnue ou écriture à reprendre) */
	feedback?: string;
}

export type ExpectedIntervals = { ok: true; domain: Domain } | { ok: false; error: string };

/** Réglages d'une case « intervalles » (voir `TemplateBlank.openableBounds`) */
export interface IntervalJudgeOptions {
	/** L'élève peut ouvrir une borne finie que l'attendu ferme, jamais l'inverse */
	openableBounds?: boolean;
}

// Constantes

/** Messages figés (français, tutoiement) */
export const INTERVAL_FEEDBACK = {
	separator: 'Sépare les bornes par un point-virgule : ]2 ; 3[.',
	setSeparator: 'Sépare les solutions par un point-virgule : {a ; b}.',
	closedInfinity: "L'infini est toujours exclu : écris ]-∞ ou +∞[.",
	boundsOrder: "Écris les bornes dans l'ordre croissant : la plus petite à gauche.",
	notASet: "Écris un ensemble (un intervalle ou une réunion d'intervalles), pas une inégalité.",
	unreadable: "Réponse illisible : écris un intervalle comme ]2 ; 5] ou une réunion d'intervalles.",
	singleton: (value: string) =>
		`Un ensemble réduit à un seul nombre s'écrit entre accolades : {${value}} plutôt que [${value} ; ${value}].`,
	tooComplex: 'Réponse illisible : une borne est trop longue ou trop compliquée. Simplifie-la.',
	forgottenPoints: (values: string[]) =>
		values.length === 1
			? `Tu as oublié le point ${values[0]}.`
			: `Tu as oublié les points ${values.slice(0, -1).join(', ')} et ${values.at(-1)}.`,
	extraPoints: (values: string[]) =>
		values.length === 1
			? `Le point ${values[0]} ne fait pas partie de l'ensemble.`
			: `Les points ${values.slice(0, -1).join(', ')} et ${values.at(-1)} ne font pas partie de l'ensemble.`,
	contiguous: 'Réunis en un seul intervalle ceux qui se touchent ou se chevauchent.',
	unsimplified: 'Simplifie les bornes (par exemple 2 plutôt que 4/2).',
	unsimplifiedSet: 'La fraction peut être simplifiée.'
};

/** Mode par défaut de `intervalForm` : écriture à reprendre = ½ */
export const DEFAULT_INTERVAL_FORM_MODE: ConstraintMode = 'warn';

/** Longueur maximale d'une réponse entière */
const MAX_ANSWER_LENGTH = 400;

/** « S = » (ou « \mathcal{S} = ») en tête de la réponse : ignoré */
const LEADING_SET_NAME = /^\s*(?:S|\\mathcal\s*\{\s*S\s*\}|\\mathscr\s*\{\s*S\s*\})\s*=\s*/;

/** Erreurs de `detectDomainMistakes` dont le message vaut pour une inéquation */
const BOUNDARY_MISTAKES = new Set([
	'included_instead_excluded',
	'excluded_instead_included',
	'wrong_bound_value'
]);

/** Expression neutre pour `detectDomainMistakes` (aucune contrainte de définition) */
const NO_EXPRESSION = variable('x');

// Functions

/** Réponse sans « S = » en tête */
function withoutSetName(answer: string): string {
	return answer.replace(LEADING_SET_NAME, '').trim();
}

/**
 * Virgule employée comme séparateur : de bornes (`]2,3[`, message des intervalles)
 * ou de solutions (`{a,b}`, message des ensembles). Un morceau sans point-virgule
 * mais avec une virgule. La virgule décimale de MathLive (`{,}`) n'en est pas une ;
 * avec un point-virgule, la virgule est décimale (`]0,5;1[`, `{1,5;2}`) ; entre
 * accolades, une seule virgule entre deux chiffres est décimale (`{0,5}`).
 */
function commaSeparatorFeedback(answer: string): string | undefined {
	const text = answer.replace(/\{,\}/g, '');
	for (const piece of text.split(/\\cup|∪|U/)) {
		if (piece.includes(';') || !piece.includes(',')) continue;
		// Entre crochets : toute virgule
		if (/[[\]]|\\[lr]brack/.test(piece)) return INTERVAL_FEEDBACK.separator;
		// Entre accolades : une virgule non décimale, ou plusieurs ({1,3,6})
		if (
			/\{|\\lbrace/.test(piece) &&
			(/(?<!\d),|,(?!\d)/.test(piece) || (piece.match(/,/g) ?? []).length > 1)
		) {
			return INTERVAL_FEEDBACK.setSeparator;
		}
	}
	return undefined;
}

/** Valeur d'un point pour un message (unicode, virgule décimale) : `0,5`, `√2` */
function pointText(value: MathNode): string {
	return formatEndpointValue(value).replace(/(\d)\.(\d)/g, '$1,$2');
}

/** Valeurs d'un ensemble fait UNIQUEMENT de points isolés, sinon undefined */
function isolatedPoints(domain: Domain): string[] | undefined {
	const expanded = expandExcludedPoints(domain);
	if (expanded.kind !== 'interval_set' || expanded.intervals.length === 0) return undefined;
	const points = expanded.intervals.map((interval) =>
		interval.lower.type === 'closed' &&
		interval.upper.type === 'closed' &&
		compareNumericNodes(interval.lower.value, interval.upper.value) === 0
			? pointText(interval.lower.value)
			: undefined
	);
	return points.every((point) => point !== undefined) ? (points as string[]) : undefined;
}

/**
 * Réponse hostile ou démesurée (radicaux imbriqués : coût ×9 par niveau) : un
 * morceau entre séparateurs dépasse les limites d'une borne. Vérifié AVANT toute
 * lecture, pour le correcteur serveur des évaluations comme pour le navigateur.
 * (La longueur est vérifiée avant, dans `judgeIntervalAnswer`.)
 */
function isAnswerTooComplex(answer: string): boolean {
	return answer
		.split(/;|\[|\]|∪|\\cup|\\setminus|\\[lr]brack|\\left|\\right/)
		.some((segment) => isBoundTooComplex(segment.trim()));
}

/** Nombre de composantes connexes d'un ensemble */
function componentCount(domain: Domain): number {
	const expanded = expandExcludedPoints(domain);
	if (expanded.kind === 'empty') return 0;
	if (expanded.kind === 'interval_set') return expanded.intervals.length;
	return 1;
}

/** Écriture interdite d'un intervalle : crochet fermé sur l'infini, bornes inversées */
function pieceError(piece: StudentDomainPiece): string | undefined {
	const interval = piece.interval;
	if (!interval) return undefined;
	const { lower, upper } = interval;
	if (
		(lower.type === 'closed' && isInfinity(lower.value)) ||
		(upper.type === 'closed' && isInfinity(upper.value))
	) {
		return INTERVAL_FEEDBACK.closedInfinity;
	}
	if (compareNumericNodes(lower.value, upper.value) === 1) return INTERVAL_FEEDBACK.boundsOrder;
	return undefined;
}

/** Valeurs d'un morceau « ensemble fini » tel qu'écrit (`{\frac{2\pi}{6};1}`), sinon [] */
function finiteSetValues(piece: StudentDomainPiece): string[] {
	const source = piece.source.trim();
	if (piece.bounds || !source.startsWith('{') || !source.endsWith('}')) return [];
	return source
		.slice(1, -1)
		.split(';')
		.map((value) => value.trim());
}

/** Écriture à reprendre d'un ensemble JUSTE (½ par défaut), ou undefined */
function writingIssue(pieces: readonly StudentDomainPiece[], domain: Domain): string | undefined {
	const singleton = pieces.find(
		(piece) =>
			piece.interval?.lower.type === 'closed' &&
			piece.interval.upper.type === 'closed' &&
			compareNumericNodes(piece.interval.lower.value, piece.interval.upper.value) === 0
	);
	if (singleton?.interval)
		return INTERVAL_FEEDBACK.singleton(pointText(singleton.interval.lower.value));

	const written = pieces.reduce((count, piece) => count + componentCount(piece.domain), 0);
	if (componentCount(domain) < written) return INTERVAL_FEEDBACK.contiguous;

	const bounds = pieces.flatMap((piece) => piece.bounds ?? []);
	if (checkReducedFractions(bounds).length > 0) return INTERVAL_FEEDBACK.unsimplified;

	// Ensemble fini `{a;b}` : ses valeurs, comme des bornes (décision de David, 2026-10-05)
	if (checkReducedFractions(pieces.flatMap(finiteSetValues)).length > 0)
		return INTERVAL_FEEDBACK.unsimplifiedSet;

	return undefined;
}

/** Message de l'erreur reconnue entre deux ensembles différents, s'il y en a un */
function mistakeFeedback(student: Domain, expected: Domain): string | undefined {
	const studentSet = expandExcludedPoints(student);
	const expectedSet = expandExcludedPoints(expected);

	if (
		compareDomains(studentSet, expectedSet).studentIsSubset &&
		componentCount(expectedSet) > componentCount(studentSet)
	) {
		return MISTAKE_DESCRIPTIONS.missing_union_part.description;
	}

	// Intervalle par intervalle (rangés dans l'ordre) : crochet ou borne
	if (
		studentSet.kind === 'interval_set' &&
		expectedSet.kind === 'interval_set' &&
		studentSet.intervals.length === expectedSet.intervals.length
	) {
		for (let i = 0; i < studentSet.intervals.length; i++) {
			const mistake = detectDomainMistakes(
				intervalDomain([studentSet.intervals[i]]),
				intervalDomain([expectedSet.intervals[i]]),
				NO_EXPRESSION
			).find((candidate) => BOUNDARY_MISTAKES.has(candidate.type));
			if (mistake) return mistake.description;
		}
	}

	// Seuls des points isolés manquent (]0;2[ ∪ ]2;5[ pour ]0;5[) ou sont en trop
	const forgotten = isolatedPoints(difference(expectedSet, studentSet));
	const extra = isolatedPoints(difference(studentSet, expectedSet));
	if (forgotten && !extra) return INTERVAL_FEEDBACK.forgottenPoints(forgotten);
	if (extra && !forgotten) return INTERVAL_FEEDBACK.extraPoints(extra);
	return undefined;
}

/**
 * Borne de l'élève acceptable pour une borne attendue, bornes ouvrables : même
 * valeur, et ouverte dès que l'attendue l'est (une borne fermée attendue peut
 * être ouverte, une borne ouverte attendue ne peut pas être fermée).
 */
function boundFits(student: Interval['lower'], expected: Interval['lower']): boolean {
	return (
		compareNumericNodes(student.value, expected.value) === 0 &&
		(student.type === 'open' || expected.type === 'closed')
	);
}

/**
 * Option `openableBounds` : l'ensemble de l'élève est celui de l'attendu, à des
 * bornes OUVERTES près. Appariement une à une, sur les composantes connexes
 * (rangées) : même nombre d'intervalles, mêmes valeurs de bornes. Un attendu
 * écrit `[a;b]∪[b;c]` EST `[a;c]` : `b` n'en est pas une borne, l'ouvrir
 * (`]a;b[∪]b;c[`) retire un point intérieur → faux. ℝ et ∅ n'ont rien à ouvrir.
 */
function opensOnlyClosedBounds(student: Domain, expected: Domain): boolean {
	const studentSet = expandExcludedPoints(student);
	const expectedSet = expandExcludedPoints(expected);
	if (studentSet.kind !== 'interval_set' || expectedSet.kind !== 'interval_set') return false;
	const pairs = expectedSet.intervals;
	if (pairs.length === 0 || studentSet.intervals.length !== pairs.length) return false;
	return studentSet.intervals.every(
		(interval, i) =>
			boundFits(interval.lower, pairs[i].lower) && boundFits(interval.upper, pairs[i].upper)
	);
}

function incorrect(feedback?: string): IntervalVerdict {
	return feedback ? { status: 'incorrect', feedback } : { status: 'incorrect' };
}

/**
 * Lecture de la réponse attendue d'un modèle (bornes en syntaxe maison ou LaTeX).
 * Une réponse illisible est une erreur du MODÈLE : `test-spec-runner` la signale.
 */
export function readExpectedIntervals(expected: string): ExpectedIntervals {
	try {
		return readExpected(expected);
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : String(error) };
	}
}

function readExpected(expected: string): ExpectedIntervals {
	const parsed = parseStudentDomainPieces(withoutSetName(expected));
	if (!parsed.success) return { ok: false, error: parsed.error };
	if (parsed.format === 'condition') {
		return { ok: false, error: 'La réponse attendue doit être un ensemble, pas une inégalité' };
	}
	const invalid = parsed.pieces.map(pieceError).find((error) => error !== undefined);
	if (invalid) return { ok: false, error: invalid };
	return { ok: true, domain: parsed.domain };
}

/**
 * Juge une réponse « intervalles ».
 *
 * @param answer - réponse de l'élève (LaTeX de MathLive)
 * @param expected - réponse attendue du modèle, résolue
 * @param mode - réglage `intervalForm` du modèle (défaut `warn` = ½)
 * @param options - réglages de la case (`openableBounds`)
 */
export function judgeIntervalAnswer(
	answer: string,
	expected: string,
	mode: ConstraintMode = DEFAULT_INTERVAL_FORM_MODE,
	options: IntervalJudgeOptions = {}
): IntervalVerdict {
	const written = withoutSetName(answer);
	if (!written) return { status: 'empty' };
	if (written.length > MAX_ANSWER_LENGTH) return incorrect(INTERVAL_FEEDBACK.tooComplex);
	// Avant le garde de complexité : `{a,b,c,d}` sans point-virgule forme un seul long
	// morceau, qui serait « trop compliqué » au lieu de « mal séparé » (regex sur ≤ 400 car.)
	const separatorFeedback = commaSeparatorFeedback(written);
	if (separatorFeedback) return incorrect(separatorFeedback);
	if (isAnswerTooComplex(written)) return incorrect(INTERVAL_FEEDBACK.tooComplex);
	try {
		return judgeWritten(written, expected, mode, options);
	} catch {
		// `SecurityError` du parseur (imbrication), erreur d'évaluation : jamais un plantage
		return incorrect(INTERVAL_FEEDBACK.unreadable);
	}
}

function judgeWritten(
	written: string,
	expected: string,
	mode: ConstraintMode,
	options: IntervalJudgeOptions
): IntervalVerdict {
	// Modèle fautif : jamais une exception devant l'élève
	const target = readExpectedIntervals(expected);
	if (!target.ok) return incorrect();

	const parsed = parseStudentDomainPieces(written);
	if (!parsed.success) return incorrect(INTERVAL_FEEDBACK.unreadable);
	if (parsed.format === 'condition') return incorrect(INTERVAL_FEEDBACK.notASet);

	const invalid = parsed.pieces.map(pieceError).find((error) => error !== undefined);
	if (invalid) return incorrect(invalid);

	const sameSet =
		domainsAreEqual(parsed.domain, target.domain) ||
		(options.openableBounds === true && opensOnlyClosedBounds(parsed.domain, target.domain));
	if (!sameSet) {
		return incorrect(mistakeFeedback(parsed.domain, target.domain));
	}

	const issue = writingIssue(parsed.pieces, parsed.domain);
	if (!issue || mode === 'off') return { status: 'correct' };
	return { status: mode === 'strict' ? 'bad_form' : 'unoptimal_form', feedback: issue };
}

// Affichage

/** Parenthèses d'écriture maison inutiles dans une fraction : (1-sqrt(5))/2 */
function withoutFractionParentheses(node: MathNode): MathNode {
	const unwrap = (operand: MathNode): MathNode =>
		operand.type === 'delimiter' && operand.delimiters === 'parentheses'
			? operand.content
			: operand;
	if (node.type === 'division') {
		return { ...node, numerator: unwrap(node.numerator), denominator: unwrap(node.denominator) };
	}
	if (node.type === 'opposite')
		return { ...node, operand: withoutFractionParentheses(node.operand) };
	return node;
}

/** Borne en LaTeX, décimal à virgule (`0{,}5`) */
function boundLatex(value: MathNode): string {
	if (isInfinity(value)) return isPositiveInfinity(value) ? '+\\infty' : '-\\infty';
	return (
		toLatex(withoutFractionParentheses(value))
			.replace(/(\d)\.(\d)/g, '$1{,}$2')
			// Constante d'Euler : écrite `e`, comme l'auteur et l'élève l'écrivent
			.replace(/\\exponentialE(?![a-zA-Z])/g, 'e')
	);
}

function intervalLatex(interval: Interval): string {
	const { lower, upper } = interval;
	if (
		lower.type === 'closed' &&
		upper.type === 'closed' &&
		compareNumericNodes(lower.value, upper.value) === 0
	) {
		return `\\{${boundLatex(lower.value)}\\}`;
	}
	const open = lower.type === 'closed' ? '[' : ']';
	const close = upper.type === 'closed' ? ']' : '[';
	return `${open}${boundLatex(lower.value)};${boundLatex(upper.value)}${close}`;
}

function domainLatex(domain: Domain): string {
	if (domain.kind === 'universal') return '\\mathbb{R}';
	if (domain.kind !== 'interval_set' || domain.intervals.length === 0) return '\\emptyset';
	const [first] = domain.intervals;
	// ℝ privé de points : écrit tel quel
	if (
		domain.excludedPoints.length > 0 &&
		domain.intervals.length === 1 &&
		isInfinity(first.lower.value) &&
		isInfinity(first.upper.value)
	) {
		const points = domain.excludedPoints.map((point) => boundLatex(point.value)).join(';');
		return `\\mathbb{R}\\setminus\\{${points}\\}`;
	}
	const expanded = expandExcludedPoints(domain);
	if (expanded.kind !== 'interval_set') return domainLatex(expanded);
	if (
		expanded.intervals.length === 1 &&
		isInfinity(first.lower.value) &&
		isInfinity(expanded.intervals[0].upper.value)
	) {
		return '\\mathbb{R}';
	}
	return expanded.intervals.map(intervalLatex).join('\\cup');
}

/**
 * Réponse attendue d'une case « intervalles » en LaTeX (corrigé, flash back).
 * Illisible : rendue telle quelle (le test du modèle la signale).
 */
export function expectedIntervalsLatex(expected: string): string {
	const target = readExpectedIntervals(expected);
	return target.ok ? domainLatex(target.domain) : expected;
}
