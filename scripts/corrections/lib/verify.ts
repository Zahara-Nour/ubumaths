/**
 * Vérification d'une proposition de correction
 * ============================================
 *
 * La proposition est injectée dans le modèle, puis chaque variation est tirée sur
 * TOUT son domaine quand il est énumérable (`sampling.ts`), sinon sur 5 000 graines.
 * Pour chaque tirage :
 * 1. plus aucun `{{` ni `<<` dans la correction rendue ;
 * 2. le LaTeX de chaque bloc `$…$` / `$$…$$` est valide pour MathLive
 *    (environnements équilibrés, commandes connues) ;
 * 3. aucune écriture maladroite dans les calculs (`+ -3`, `+ 0`) ;
 * 4. chaque bloc `align` est une CHAÎNE D'ÉGALITÉS VRAIE : tous ses membres
 *    valent le même nombre, et un membre illisible fait ÉCHOUER — seule exception,
 *    l'inconnue `?` en tête d'une question à trou, suivie de la réponse attendue.
 *    Chemin LITTÉRAL : dès qu'un membre contient des lettres (`6a`, `t^2 - 4`),
 *    chaque membre est comparé au SUIVANT par `areEquivalent` (politique zéro faux
 *    positif) ; deux membres numériques gardent la comparaison numérique ;
 * 5. le calcul PART de l'opération posée (premier membre = valeur de la variable
 *    d'expression — ou, sans elle, de l'UNIQUE bloc `$$…$$` de l'énoncé —, ou `?`
 *    pour un trou ; littéral : équivalent à l'expression posée) et FINIT sur la
 *    réponse attendue (équivalente, si elle est littérale). Plusieurs cases :
 *    chacune finit un calcul, OU est donnée dans la prose par une égalité
 *    `n = valeur` (une lettre, la valeur exacte de la case) ; pour un trou, `? = calcul =
 *    réponse` et la valeur trouvée VÉRIFIE l'égalité posée ; pour un QCM, la
 *    dernière étape nomme le bon choix et aucun autre (comme un mot ou un nombre
 *    entier : « 3 » n'est pas nommé dans « 13 » ni dans « 3,5 ») ;
 * 6. hors des calculs : aucun reste de résolution (`NaN`, `undefined`…), et une
 *    égalité numérique écrite dans la prose (`$3 + 4 = 7$`) est juste.
 * Le modèle injecté passe aussi `validateTemplate` et le schéma Zod strict.
 *
 * « 0 échec » ne vaut que si l'on sait combien de tirages ont été analysés : le
 * rapport les compte.
 */

import { validateLatex } from 'mathlive';
import type { QuestionInstance, QuestionTemplate } from '../../../src/lib/questions/types';
import { validateTemplate } from '../../../src/lib/questions/validators/template-validator';
import { questionTemplateSchema } from '../../../src/lib/questions/template-schema';
import { parseLatex, parseLatexSafe } from '../../../src/lib/mathAST/parser';
import { areEquivalent } from '../../../src/lib/math';
import { computeNumericValue } from '../../../src/lib/mathAST/solve/numeric-value';
import {
	convertToLatex,
	resolveExpression
} from '../../../src/lib/questions/generator/content-resolver';
import { injectCorrection, type Proposal } from './proposal';
import { planDraws, type Sampling } from './sampling';

// ============================================================================
// TYPES
// ============================================================================

export interface InstanceFailure {
	variationIndex: number;
	/** Tirage : `a=3, b=7` (énumération) ou `graine 12` */
	draw: string;
	reasons: string[];
}

export interface ProposalReport {
	templateId: string;
	title: string;
	code: string;
	/** Tirages analysés, toutes variations confondues */
	instances: number;
	/** Mode de tirage de chaque variation (énumération complète ou graines) */
	samplings: Sampling[];
	templateErrors: string[];
	failures: InstanceFailure[];
	passed: boolean;
}

/**
 * Contrôles STRUCTURELS déclarés par le lot, modèle par modèle (jamais un passe-droit
 * global) : là où la question ne pose aucun calcul lisible, le lot dit ce qu'il faut
 * vérifier à la place, et le vérificateur le vérifie à chaque tirage.
 */
export interface StructuralChecks {
	/**
	 * Opération posée dans la PHRASE (« le quadruple de 12 ») : forme de calcul à
	 * variables (`4*{{a}}`). Garde-fou : chaque nombre de l'opération résolue figure
	 * dans l'énoncé, sauf les `constants` déclarées (le 4 de « quadruple »).
	 * Refusée si l'énoncé pose déjà une opération lisible. `operand` : le calcul
	 * COMMENCE par ce nombre (`2.1 - 0.1 = 2`, troncature) au lieu de le valoir.
	 */
	posed?: { expression: string; constants?: string[]; operand?: boolean };
	/** Le calcul part de −(A) (« opposé de ») ou de 1/A (« inverse de ») */
	transform?: 'opposite' | 'inverse';
	/** La réponse est UN FACTEUR du dernier membre (produit) du dernier calcul */
	end?: 'factor';
	/** Racine affine : lignes d'équations `L &= R`, toutes de solution la réponse */
	equations?: 'affine-root';
	/** Trou au dénominateur de fractions de même dénominateur : `? = réponse` suffit */
	hole?: 'denominator';
	/** Chiffre d'un rang : lu dans le tableau de numération de la correction */
	digit?: { number: string; rank: number };
	/** La réponse est une ÉCRITURE (traduire une phrase) : la conclusion l'écrit telle quelle */
	written?: true;
}

/** Contrôles communs, ou variation par variation */
export type EntryChecks = StructuralChecks | StructuralChecks[];

// ============================================================================
// CONSTANTS
// ============================================================================

const TOLERANCE = 1e-9;

// ============================================================================
// LATEX HELPERS
// ============================================================================

/** Blocs mathématiques d'un markdown : `$$…$$` puis `$…$` */
export function extractMath(markdown: string): string[] {
	const chunks: string[] = [];
	const withoutDisplay = markdown.replace(/\$\$([\s\S]+?)\$\$/g, (_, latex: string) => {
		chunks.push(latex);
		return ' ';
	});
	for (const match of withoutDisplay.matchAll(/\$([^$]+?)\$/g)) chunks.push(match[1]);
	return chunks;
}

/** Fin de l'argument `{…}` qui commence à `start` (indice de `{`), -1 si déséquilibré */
function groupEnd(text: string, start: number): number {
	let depth = 0;
	for (let i = start; i < text.length; i++) {
		if (text[i] === '{') depth++;
		else if (text[i] === '}' && --depth === 0) return i;
	}
	return -1;
}

/** Retire les habillages sans valeur mathématique : `\textcolor{c}{X}` → `X`, `\bold{X}` → `X` */
export function stripDecorations(latex: string): string {
	let result = latex;
	for (;;) {
		const match = /\\textcolor\{[^{}]*\}\{|\\bold\{|\\mathbf\{/.exec(result);
		if (!match) return result;
		const open = match.index + match[0].length - 1;
		const close = groupEnd(result, open);
		if (close === -1) return result;
		result = result.slice(0, match.index) + result.slice(open + 1, close) + result.slice(close + 1);
	}
}

/** Membres d'égalité de chaque bloc `align` : `A &= B \\ &= C` → [[A, B, C]] */
export function alignChains(latex: string): string[][] {
	const chains: string[][] = [];
	for (const match of latex.matchAll(/\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g)) {
		const members: string[] = [];
		for (const row of match[1].split('\\\\')) {
			for (const member of row.split('&=')) {
				const trimmed = member.trim();
				if (trimmed !== '') members.push(trimmed);
			}
		}
		chains.push(members);
	}
	return chains;
}

/** Valeur numérique d'un LaTeX, ou `null` s'il ne se lit pas comme un nombre */
export function numericValue(latex: string): number | null {
	try {
		const value = computeNumericValue(parseLatex(stripDecorations(latex)));
		return value !== null && Number.isFinite(value) ? value : null;
	} catch {
		return null;
	}
}

/** Délai d'une comparaison littérale : au-delà, `areEquivalent` rend `false` (prudent) */
const EQUIVALENCE_TIMEOUT_MS = 2000;

/** Inconnue affichée (`?`, case) : jamais un membre lisible */
const UNKNOWN_MEMBER = /\?|\\square|\\placeholder/;

/**
 * Un membre non numérique est-il une expression LITTÉRALE lisible (`6a`,
 * `y(x + y)`) ? Une inconnue (`x + ?`) ne l'est pas ; le texte ne se lit pas (parseur).
 */
export function isLiteralMember(latex: string): boolean {
	const plain = stripDecorations(latex).trim();
	if (plain === '' || UNKNOWN_MEMBER.test(plain)) return false;
	if (!/[a-zA-Z]/.test(plain.replace(/\\[a-zA-Z]+/g, ''))) return false;
	try {
		const result = parseLatexSafe(plain);
		return result.ast !== null && result.errors.length === 0;
	} catch {
		return false;
	}
}

/** Équivalence littérale de deux membres (habillages retirés), `false` si elle échoue */
export function literallyEquivalent(a: string, b: string): boolean {
	try {
		return areEquivalent(stripDecorations(a), stripDecorations(b), {
			timeoutMs: EQUIVALENCE_TIMEOUT_MS
		});
	} catch {
		return false;
	}
}

function sameNumber(a: number, b: number): boolean {
	return Math.abs(a - b) <= TOLERANCE * Math.max(1, Math.abs(a), Math.abs(b));
}

// ============================================================================
// CHECKS
// ============================================================================

/** Écritures maladroites dans un calcul : `+ -3`, `- -3`, `+ 0`, `- 0` */
export function awkwardWritings(latex: string): string[] {
	const plain = stripDecorations(latex).replace(/\\left\(|\\right\)/g, (m) =>
		m === '\\left(' ? '(' : ')'
	);
	const found: string[] = [];
	const doubleSign = plain.match(/[+-]\s*[+-]\s*\d/);
	if (doubleSign) found.push(`double signe « ${doubleSign[0]} »`);
	const zeroTerm = plain.match(/[+-]\s*0(?![\d.,])/);
	if (zeroTerm) found.push(`terme nul « ${zeroTerm[0]} »`);
	return found;
}

/** Échappe un texte pour l'insérer tel quel dans une expression régulière */
export function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Point de départ attendu du calcul : l'opération posée par la question */
export type PosedStart =
	| { kind: 'value'; value: number; expression: string; operand?: boolean }
	| { kind: 'hole'; expression: string }
	| { kind: 'holes'; expression: string }
	| { kind: 'quantity'; expression: string }
	| { kind: 'literal'; latex: string; expression: string }
	| { kind: 'unknown'; expression: string | null };

/**
 * Relation posée en LaTeX avec unités et case (`2~\unit{m^3} = \placeholder[0]{}~\unit{L}`)
 * → forme de calcul (`2[m^3] = ?[L]`) ; `null` si elle contient autre chose.
 */
export function unitHoleForm(latex: string): string | null {
	if (!/\\unit\{/.test(latex) || !/\\placeholder/.test(latex)) return null;
	const form = stripDecorations(latex)
		.replace(/\s*~?\s*\\unit\{([^{}]*)\}/g, '[$1]')
		.replace(/\\placeholder\[\d+\]\{\}/g, '?')
		.replace(/\{,\}/g, '.')
		.trim();
	return /^[\d.\s+=?[\]a-zA-Z^]+$/.test(form) ? form : null;
}

/**
 * Sans variable d'expression : l'UNIQUE bloc `$$…$$` de l'énoncé résolu, s'il se lit
 * comme une valeur (nombre ou expression littérale, sans `=` ni inconnue) ; ou
 * l'unique formule de l'énoncé si c'est une égalité à trou avec unités.
 */
function statementStart(instance: QuestionInstance): PosedStart {
	const statement = String(instance.statement ?? '');
	const blocks = [...statement.matchAll(/\$\$([\s\S]+?)\$\$/g)].map((m) => m[1].trim());
	if (blocks.length === 0) {
		const inline = extractMath(statement);
		const form = inline.length === 1 ? unitHoleForm(inline[0]) : null;
		if (form) return { kind: 'hole', expression: form };
	}
	if (blocks.length !== 1) return { kind: 'unknown', expression: null };
	const latex = blocks[0];
	const form = unitHoleForm(latex);
	if (form) return { kind: 'hole', expression: form };
	if (latex.includes('=')) return { kind: 'unknown', expression: latex };
	const value = numericValue(latex);
	if (value !== null) return { kind: 'value', value, expression: latex };
	if (isLiteralMember(latex)) return { kind: 'literal', latex, expression: latex };
	return { kind: 'unknown', expression: latex };
}

/** Nombres d'un texte (`10\,000` → 10000, `2{,}5` → 2.5) */
function numbersIn(text: string): number[] {
	const plain = text
		.replace(/\\[,;: ]|\\thinspace/g, '')
		.replace(/\{,\}/g, '.')
		.replace(/(\d),(\d)/g, '$1.$2');
	return [...plain.matchAll(/\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
}

/**
 * Opération posée DÉCLARÉE par le lot (`4*{{a}}`), résolue sur le tirage : chaque
 * nombre doit figurer dans l'énoncé ou dans les constantes déclarées.
 */
function declaredStart(
	instance: QuestionInstance,
	posed: NonNullable<StructuralChecks['posed']>
): PosedStart {
	let resolved: string;
	try {
		resolved = resolveExpression(posed.expression, instance.resolvedVariables ?? []);
	} catch {
		return { kind: 'unknown', expression: `posé déclaré illisible « ${posed.expression} »` };
	}
	const inStatement = numbersIn(String(instance.statement ?? ''));
	const constants = (posed.constants ?? []).map(Number);
	const foreign = numbersIn(resolved).filter(
		(n) => !inStatement.some((s) => sameNumber(s, n)) && !constants.some((c) => sameNumber(c, n))
	);
	if (foreign.length > 0) {
		return {
			kind: 'unknown',
			expression: `posé déclaré « ${resolved} » : ${foreign.join(', ')} absent(s) de l'énoncé`
		};
	}
	const value = evalFormValue(resolved);
	return value === null
		? { kind: 'unknown', expression: `posé déclaré non numérique « ${resolved} »` }
		: { kind: 'value', value, expression: resolved, operand: posed.operand };
}

/** Premier nombre écrit d'un membre (`7.996 - 0.006` → 7.996), null s'il n'y en a pas */
export function leadingNumber(latex: string): number | null {
	const match = /-?\d+(?:\.\d+)?/.exec(stripDecorations(latex).replace(/\{,\}/g, '.'));
	return match ? Number(match[0]) : null;
}

/** Le départ transformé : −A (opposé) ou 1/A (inverse) */
function transformStart(start: PosedStart, transform: StructuralChecks['transform']): PosedStart {
	if (!transform) return start;
	if (start.kind === 'value') {
		if (transform === 'inverse' && start.value === 0) return { kind: 'unknown', expression: '1/0' };
		const value = transform === 'opposite' ? -start.value : 1 / start.value;
		return { ...start, value, expression: `${transform}(${start.expression})` };
	}
	if (start.kind === 'literal') {
		const latex =
			transform === 'opposite' ? `-\\left(${start.latex}\\right)` : `\\dfrac{1}{${start.latex}}`;
		return { ...start, latex };
	}
	return { kind: 'unknown', expression: `${transform} d'un départ ${start.kind}` };
}

/**
 * L'opération posée : valeur de la variable d'expression, trou `?` (plusieurs :
 * `holes`), grandeur avec unités, expression littérale (convertie en LaTeX, sans
 * évaluation), ou — sans variable d'expression — le bloc mathématique unique de
 * l'énoncé. Les contrôles déclarés du lot (`posed`, `transform`) s'appliquent ensuite.
 */
export function posedStart(instance: QuestionInstance, checks: StructuralChecks = {}): PosedStart {
	const start = rawPosedStart(instance);
	if (checks.posed) {
		if (start.kind !== 'unknown') {
			return {
				kind: 'unknown',
				expression: `posé déclaré alors que l'énoncé pose « ${start.expression} »`
			};
		}
		return transformStart(declaredStart(instance, checks.posed), checks.transform);
	}
	return transformStart(start, checks.transform);
}

function rawPosedStart(instance: QuestionInstance): PosedStart {
	const variable = (instance.resolvedVariables ?? []).find((v) => v.name.startsWith('expression'));
	if (!variable) return statementStart(instance);
	const expression = variable.value;
	const holes = (expression.match(/\?/g) ?? []).length;
	if (holes >= 2) return { kind: 'holes', expression };
	if (holes === 1) return { kind: 'hole', expression };
	if (/\[[^\]]+\]/.test(expression)) return { kind: 'quantity', expression };
	try {
		const value = numericValue(resolveExpression(`{{eval:${expression}}}`, []));
		if (value !== null) return { kind: 'value', value, expression };
	} catch {
		// pas un nombre : peut-être une expression littérale
	}
	try {
		const latex = convertToLatex(expression);
		if (isLiteralMember(latex)) return { kind: 'literal', latex, expression };
	} catch {
		// illisible : point de départ inconnu
	}
	return { kind: 'unknown', expression };
}

/** Réponse attendue de la case `index`, en nombre (null : pas de case, ou illisible) */
function expectedBlankValue(instance: QuestionInstance, index = 0): number | null {
	const blank = instance.blanks?.[index];
	return blank ? numericValue(blank.expectedAnswerLatex ?? blank.expectedAnswer) : null;
}

/** LaTeX de la réponse attendue de la case `index` */
function expectedBlankLatex(instance: QuestionInstance, index = 0): string | null {
	const blank = instance.blanks?.[index];
	return blank ? (blank.expectedAnswerLatex ?? blank.expectedAnswer) : null;
}

/** Valeur d'un membre de l'opération posée (forme de calcul : `*`, `:`), null si illisible */
function evalFormValue(expression: string): number | null {
	try {
		return numericValue(resolveExpression(`{{eval:${expression}}}`, []));
	} catch {
		return null;
	}
}

// ---------------------------------------------------------------- grandeurs

/** Deux grandeurs (formes `n[unité]`) sont-elles égales ? (rapport = 1, convertisseur du projet) */
export function sameQuantity(a: string, b: string): boolean {
	const ratio = evalFormValue(`(${a})/(${b})`);
	return ratio !== null && sameNumber(ratio, 1);
}

// ---------------------------------------------------------------- relations posées

const RELATION = /<=|>=|<|>|=/g;

/**
 * La relation posée tient-elle quand ses « ? » sont remplacés, DANS L'ORDRE, par
 * `values` ? (`? < 2.055 < ?` avec 2.05 et 2.06 → vrai ; `2[km] = ?[m]` avec
 * 2000 → vrai, par le convertisseur d'unités). `null` : relation illisible.
 */
export function relationHolds(expression: string, values: number[]): boolean | null {
	if ((expression.match(/\?/g) ?? []).length !== values.length) return null;
	const hasUnits = expression.includes('[');
	let index = 0;
	// Avec unité (`?[m]`), le nombre nu ; sinon entre parenthèses (négatifs)
	const filled = expression.replace(/\?/g, () =>
		hasUnits ? `${values[index++]}` : `(${values[index++]})`
	);
	const operators = filled.match(RELATION) ?? [];
	const sides = filled.split(RELATION);
	if (operators.length === 0 || sides.length !== operators.length + 1) return null;
	for (let i = 0; i < operators.length; i++) {
		const [left, right] = [sides[i], sides[i + 1]];
		if (operators[i] === '=' && hasUnits) {
			if (!sameQuantity(left, right)) return false;
			continue;
		}
		const [a, b] = [evalFormValue(left), evalFormValue(right)];
		if (a === null || b === null) return null;
		const holds =
			operators[i] === '='
				? sameNumber(a, b)
				: operators[i] === '<'
					? a < b
					: operators[i] === '>'
						? a > b
						: operators[i] === '<='
							? a <= b
							: a >= b;
		if (!holds) return false;
	}
	return true;
}

/**
 * L'égalité posée par une question à trou tient-elle quand on remplace « ? » par
 * `value` ? `3 + ? = 10` avec 7 → vrai. `null` : l'égalité posée ne se lit pas
 * (pas exactement un « = », membre illisible).
 */
export function holeEquationHolds(expression: string, value: number): boolean | null {
	if (expression.split('=').length !== 2) return null;
	return relationHolds(expression, [value]);
}

/** Côtés sans « ? » d'une relation posée, en nombres (`? < 2.055 < ?` → [2.055]) */
function holeFreeSides(expression: string): number[] {
	return expression
		.split(RELATION)
		.filter((side) => !side.includes('?'))
		.map(evalFormValue)
		.filter((v): v is number => v !== null);
}

/**
 * Trou au dénominateur (`3/? + 2/11 = 5/11`) : toutes les autres fractions ont
 * pour dénominateur la réponse attendue — alors `? = réponse` se lit sans calcul.
 */
export function denominatorHoleOk(expression: string, expected: number): boolean {
	if (!/\/\s*\?/.test(expression)) return false;
	const others = [...expression.matchAll(/\/\s*\{?(-?\d+(?:\.\d+)?)\}?/g)].map((m) => Number(m[1]));
	return others.length > 0 && others.every((d) => sameNumber(d, expected));
}

/**
 * Chaînes d'égalités : chaque membre vaut le même nombre, et TOUS sont lisibles.
 * Seule exception : l'inconnue `?` en tête de la première chaîne d'une question à
 * trou, et alors le membre suivant doit valoir la réponse attendue. La première
 * chaîne part de l'opération posée (même valeur que la variable d'expression).
 */
export function checkChains(
	chains: string[][],
	instance: QuestionInstance,
	checks: StructuralChecks = {}
): string[] {
	const reasons: string[] = [];
	const start = posedStart(instance, checks);
	const isHoleQuestion = start.kind === 'hole' && (instance.blanks?.length ?? 0) > 0;
	chains.forEach((chain, chainIndex) => {
		const shown = chain.map(stripDecorations).join(' = ');
		const holeHead =
			chainIndex === 0 && isHoleQuestion && stripDecorations(chain[0]).trim() === '?';
		const values = chain.map((member, index) =>
			index === 0 && holeHead ? null : numericValue(member)
		);
		// Membre lisible : un nombre, ou une expression littérale (chemin littéral)
		const literal = chain.map(
			(member, index) =>
				!(index === 0 && holeHead) && values[index] === null && isLiteralMember(member)
		);
		chain.forEach((member, index) => {
			if (index === 0 && holeHead) return;
			if (values[index] === null && !literal[index]) {
				reasons.push(`membre non numérique « ${stripDecorations(member)} » dans : ${shown}`);
			}
		});
		if (!literal.some(Boolean)) {
			const read = values.filter((v): v is number => v !== null);
			if (read.some((v) => !sameNumber(v, read[0]))) reasons.push(`égalités fausses : ${shown}`);
		} else {
			// Chemin littéral : chaque membre lisible est ÉQUIVALENT au suivant
			for (let i = holeHead ? 1 : 0; i + 1 < chain.length; i++) {
				const [a, b] = [values[i], values[i + 1]];
				if (a === null && !literal[i]) continue;
				if (b === null && !literal[i + 1]) continue;
				const holds =
					a !== null && b !== null ? sameNumber(a, b) : literallyEquivalent(chain[i], chain[i + 1]);
				if (!holds) {
					reasons.push(
						`égalité littérale fausse « ${stripDecorations(chain[i])} = ${stripDecorations(chain[i + 1])} » dans : ${shown}`
					);
				}
			}
		}

		if (chainIndex !== 0) return;
		if (holeHead) {
			const expected = expectedBlankValue(instance);
			const second = values[1];
			if (
				second === undefined ||
				second === null ||
				expected === null ||
				!sameNumber(second, expected)
			) {
				reasons.push(`« ? » doit être suivi de la réponse attendue : ${shown}`);
			}
			// « ? = réponse » seul ne calcule rien : au moins un calcul entre les deux —
			// sauf trou au dénominateur déclaré, quand les autres fractions le donnent
			const givenByDenominators =
				checks.hole === 'denominator' &&
				expected !== null &&
				start.kind === 'hole' &&
				denominatorHoleOk(start.expression, expected);
			if (chain.length < 3 && !givenByDenominators) {
				reasons.push(`« ? » doit être suivi d'un calcul, puis de la réponse : ${shown}`);
			}
			// Le calcul répond à l'égalité POSÉE : « ? » remplacé par sa valeur, elle tient
			if (second !== undefined && second !== null && start.kind === 'hole') {
				const holds = holeEquationHolds(start.expression, second);
				if (holds === null) {
					reasons.push(`égalité posée illisible « ${start.expression} »`);
				} else if (!holds) {
					reasons.push(
						`« ? » = ${second} ne vérifie pas l'égalité posée « ${start.expression} » : ${shown}`
					);
				}
			}
		} else if (start.kind === 'hole') {
			reasons.push(`question à trou : le calcul doit partir de « ? » : ${shown}`);
		} else if (start.kind === 'holes') {
			// Plusieurs trous : le calcul COMMENCE par un nombre donné par la relation posée
			const sides = holeFreeSides(start.expression);
			const lead = leadingNumber(chain[0]);
			if (lead === null || !sides.some((side) => sameNumber(side, lead))) {
				reasons.push(
					`le calcul ne part pas d'un nombre de la relation posée « ${start.expression} » : ${shown}`
				);
			}
		} else if (start.kind === 'quantity') {
			// Grandeur posée sans trou : `\unit` est refusé par MathLive dans une correction
			reasons.push(`grandeur posée « ${start.expression} » : départ invérifiable : ${shown}`);
		} else if (start.kind === 'literal') {
			if (!literallyEquivalent(chain[0], start.latex)) {
				reasons.push(`le calcul ne part pas de l'expression posée « ${start.latex} » : ${shown}`);
			}
		} else if (start.kind === 'unknown') {
			reasons.push(
				`point de départ invérifiable (opération posée : ${start.expression ?? 'aucune'}) : ${shown}`
			);
		} else if (start.operand) {
			const lead = leadingNumber(chain[0]);
			if (lead === null || !sameNumber(lead, start.value)) {
				reasons.push(
					`le calcul ne commence pas par le nombre posé « ${start.expression} » : ${shown}`
				);
			}
		} else if (values[0] === null || !sameNumber(values[0], start.value)) {
			reasons.push(`le calcul ne part pas de l'opération posée « ${start.expression} » : ${shown}`);
		}
	});
	return reasons;
}

/**
 * Le texte `choice` est-il nommé dans `text` comme un mot ou un nombre entier ?
 * Pas de lettre ni de chiffre collé de part et d'autre, ni de séparateur décimal
 * entre deux chiffres : « 3 » n'est nommé ni dans « 13 » ni dans « 3,5 » / « 0.3 ».
 */
export function namesChoice(text: string, choice: string): boolean {
	const pattern =
		'(?<![\\p{L}\\p{N}])(?<!\\p{N}[.,])' +
		escapeRegExp(choice) +
		'(?![\\p{L}\\p{N}])(?![.,]\\p{N})';
	return new RegExp(pattern, 'u').test(text);
}

/** Restes d'une résolution ratée, hors marqueurs `{{` / `<<` */
const LEFTOVER_TOKENS = /(?<![\p{L}])(NaN|undefined|null|Infinity|\[object Object\])(?![\p{L}])/u;

/**
 * Égalités écrites HORS des blocs `align` (`$3 + 4 = 7$` dans la prose) : quand
 * tous les membres se lisent comme des nombres, ils doivent être égaux. Un membre
 * non numérique (`? + 3`, du texte) fait passer l'égalité sans contrôle.
 */
export function proseEqualities(latex: string): string[] {
	if (/\\begin\{align/.test(latex) || !latex.includes('=')) return [];
	const members = latex.split(/(?<![<>!\\])=/).map((m) => m.trim());
	if (members.length < 2 || members.some((m) => m === '')) return [];
	const values = members.map(numericValue);
	if (values.some((v) => v === null)) return [];
	const read = values as number[];
	return read.some((v) => !sameNumber(v, read[0]))
		? [`égalité fausse hors calcul : ${members.map(stripDecorations).join(' = ')}`]
		: [];
}

/**
 * Plusieurs cases : une case qui ne finit aucun calcul est-elle DONNÉE dans la prose
 * par une égalité `lettre = valeur` (`$n = -2$`), hors des blocs `align`, dont la
 * valeur est exactement celle de la case ?
 */
export function givenInProse(steps: string[], expected: number): boolean {
	return steps.some((step) =>
		extractMath(step).some((latex) => {
			if (/\\begin\{align/.test(latex)) return false;
			const match = stripDecorations(latex).match(/^\s*([a-zA-Z])\s*=\s*([^=]+)$/);
			if (!match) return false;
			const value = numericValue(match[2]);
			return value !== null && sameNumber(value, expected);
		})
	);
}

// ============================================================================
// CONTRÔLES STRUCTURELS DÉCLARÉS
// ============================================================================

/** Lignes des blocs `align` : `L &= R \\ …` → [[L, R], …] (une ligne = une équation) */
export function alignRows(latex: string): string[][] {
	const rows: string[][] = [];
	for (const match of latex.matchAll(/\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g)) {
		for (const row of match[1].split('\\\\')) {
			if (row.trim() === '') continue;
			rows.push(row.split('&=').map((member) => member.trim()));
		}
	}
	return rows;
}

/** Valeur de `L − R` quand `x` vaut `value` (null : illisible) */
function equationGap(left: string, right: string, value: number): number | null {
	const at = (side: string) =>
		numericValue(
			stripDecorations(side).replace(/(?<![a-zA-Z\\])x(?![a-zA-Z])/g, `\\left(${value}\\right)`)
		);
	const [l, r] = [at(left), at(right)];
	return l === null || r === null ? null : l - r;
}

/**
 * Racine affine : le calcul est une suite d'ÉQUATIONS `L &= R` en `x`. La première
 * est `f(x) = 0` (f équivalente à la fonction posée), la dernière `x = réponse`, et
 * chacune est affine non dégénérée et vérifiée par la réponse — donc de solution
 * unique la réponse : les lignes sont équivalentes entre elles.
 */
export function affineRootReasons(steps: string[], instance: QuestionInstance): string[] {
	const reasons: string[] = [];
	const rows = steps.flatMap((step) => extractMath(step).flatMap(alignRows));
	const expected = expectedBlankValue(instance);
	if (expected === null) return ['racine affine : réponse attendue illisible'];
	if (rows.length < 2) return ['racine affine : au moins deux équations alignées'];
	const block = [...String(instance.statement ?? '').matchAll(/\$\$([\s\S]+?)\$\$/g)];
	const posed = block.length === 1 ? block[0][1].split('=').slice(1).join('=').trim() : '';
	if (posed === '') reasons.push('racine affine : fonction posée illisible');
	rows.forEach((row, index) => {
		const shown = row.map(stripDecorations).join(' = ');
		if (row.length !== 2) {
			reasons.push(`racine affine : « ${shown} » n'est pas une équation`);
			return;
		}
		const [g0, g1, g2] = [0, 1, 2].map((k) => equationGap(row[0], row[1], expected + k));
		if (g0 === null || g1 === null || g2 === null) {
			reasons.push(`racine affine : équation illisible « ${shown} »`);
		} else if (!sameNumber(g0 + 1, 1)) {
			reasons.push(`racine affine : x = ${expected} ne vérifie pas « ${shown} »`);
		} else if (sameNumber(g1 + 1, 1) || !sameNumber(g2 - 2 * g1 + g0 + 1, 1)) {
			reasons.push(`racine affine : « ${shown} » n'est pas affine non dégénérée`);
		}
		if (index === 0 && posed !== '') {
			if (!literallyEquivalent(row[0], posed) || numericValue(row[1]) !== 0) {
				reasons.push(`racine affine : la première équation n'est pas f(x) = 0 : ${shown}`);
			}
		}
	});
	const last = rows.at(-1) ?? [];
	if (stripDecorations(last[0] ?? '').trim() !== 'x') {
		reasons.push('racine affine : la dernière équation n’isole pas x');
	}
	return reasons;
}

const RANK_VALUES: Record<string, number> = {
	unités: 1,
	dizaines: 10,
	centaines: 100,
	milliers: 1000,
	'dizaines de milliers': 10000,
	dixièmes: 0.1,
	centièmes: 0.01,
	millièmes: 0.001
};

/**
 * Chiffre d'un rang : le tableau de numération de la correction RELIT le nombre
 * posé (somme chiffre × rang), et sa colonne du rang demandé porte la réponse,
 * qui est bien le chiffre de ce rang.
 */
export function digitTableReasons(
	steps: string[],
	instance: QuestionInstance,
	digit: NonNullable<StructuralChecks['digit']>
): string[] {
	const number = evalFormValue(resolveExpression(digit.number, instance.resolvedVariables ?? []));
	const expected = expectedBlankValue(instance);
	if (number === null || expected === null) return ['chiffre : nombre ou réponse illisible'];
	const truth = Math.floor(Math.round((number / digit.rank) * 1e6) / 1e6) % 10;
	const reasons: string[] = [];
	if (truth !== expected) {
		reasons.push(
			`chiffre : le chiffre de rang ${digit.rank} de ${number} est ${truth}, attendu ${expected}`
		);
	}
	const table = steps
		.flatMap(extractMath)
		.map((latex) => /\\begin\{array\}\{[^}]*\}([\s\S]*?)\\end\{array\}/.exec(latex))
		.find((m) => m !== null);
	if (!table) return [...reasons, 'chiffre : aucun tableau de numération'];
	const [head, cells] = table[1].split('\\\\').map((row) =>
		row.split('&').map((cell) =>
			stripDecorations(cell)
				.replace(/\\text\{([^}]*)\}/g, '$1')
				.trim()
		)
	);
	if (!head || !cells || head.length !== cells.length)
		return [...reasons, 'chiffre : tableau illisible'];
	let read = 0;
	let found: number | null = null;
	head.forEach((label, col) => {
		const rank = RANK_VALUES[label];
		if (rank === undefined) return;
		const value = cells[col] === '' ? 0 : Number(cells[col].replace(/[,.]$/, ''));
		if (!Number.isInteger(value) || value < 0 || value > 9) {
			reasons.push(`chiffre : cellule « ${cells[col]} » (${label})`);
			return;
		}
		read += value * rank;
		if (sameNumber(rank, digit.rank)) found = value;
	});
	if (!sameNumber(read, number))
		reasons.push(`chiffre : le tableau lit ${read}, nombre posé ${number}`);
	if (found === null || found !== expected) {
		reasons.push(`chiffre : la colonne du rang ${digit.rank} ne porte pas la réponse ${expected}`);
	}
	return reasons;
}

/** Facteurs d'un produit au premier niveau : `3 \times \left( … \right)`, `2\left( … \right)` */
export function topLevelFactors(latex: string): string[] {
	const plain = stripDecorations(latex).trim();
	const factors: string[] = [];
	let depth = 0;
	let current = '';
	for (let i = 0; i < plain.length; i++) {
		const rest = plain.slice(i);
		if (rest.startsWith('\\left(') || plain[i] === '{' || plain[i] === '(') depth++;
		if (rest.startsWith('\\right)') || plain[i] === '}' || plain[i] === ')') depth--;
		const op = /^\\(times|cdot)(?![a-zA-Z])/.exec(rest);
		if (depth === 0 && op) {
			factors.push(current.trim());
			current = '';
			i += op[0].length - 1;
			continue;
		}
		if (depth === 0 && /[+-]/.test(plain[i]) && current.trim() !== '') return [plain];
		current += plain[i];
	}
	factors.push(current.trim());
	if (factors.length > 1) return factors;
	// Juxtaposition : un nombre devant une parenthèse (`2\left( y - x \right)`)
	const juxtaposed = /^(\d+(?:\.\d+)?)\s*(\\left\(.*\\right\))$/.exec(plain);
	return juxtaposed ? [juxtaposed[1], juxtaposed[2]] : [plain];
}

/**
 * Facteur commun : le dernier membre du dernier calcul est un PRODUIT dont un
 * facteur vaut la réponse (le calcul, parti de l'expression posée, prouve alors
 * que la réponse est un facteur de chaque terme) ; en numérique, le reste est entier.
 */
export function factorEndReasons(chains: string[][], instance: QuestionInstance): string[] {
	const last = chains.at(-1)?.at(-1);
	const expected = expectedBlankValue(instance);
	const expectedLatex = expectedBlankLatex(instance) ?? '';
	if (!last || expectedLatex === '') return ['facteur : aucun calcul, ou réponse illisible'];
	const squash = (text: string) => stripDecorations(text).replace(/\s+/g, '');
	// Facteur numérique (même nombre) ou littéral (même écriture : `y`)
	const isAnswer = (factor: string) =>
		expected !== null
			? numericValue(factor) !== null && sameNumber(numericValue(factor) as number, expected)
			: squash(factor) === squash(expectedLatex);
	const factors = topLevelFactors(last);
	if (factors.length < 2 || !factors.some(isAnswer)) {
		return [`facteur : « ${stripDecorations(last)} » n'a pas le facteur ${expectedLatex}`];
	}
	if (expected === null) return [];
	const value = numericValue(last);
	if (value !== null && !Number.isInteger(Math.round((value / expected) * 1e9) / 1e9)) {
		return [`facteur : ${value} n'est pas un multiple de ${expected}`];
	}
	return [];
}

/**
 * Réponse ÉCRITE (traduire une phrase) : la conclusion écrit la réponse attendue
 * telle quelle (espaces près), et chacun de ses nombres figure dans l'énoncé.
 */
export function writtenAnswerReasons(steps: string[], instance: QuestionInstance): string[] {
	const expected = expectedBlankLatex(instance);
	if (!expected) return ['écriture : réponse attendue absente'];
	const squash = (text: string) => stripDecorations(text).replace(/\s+/g, '');
	const lastStep = steps.at(-1) ?? '';
	const reasons: string[] = [];
	if (!extractMath(lastStep).some((latex) => squash(latex) === squash(expected))) {
		reasons.push(`écriture : la conclusion n'écrit pas « ${expected} »`);
	}
	const inStatement = numbersIn(String(instance.statement ?? ''));
	for (const n of numbersIn(expected)) {
		if (!inStatement.some((s) => sameNumber(s, n)))
			reasons.push(`écriture : ${n} absent de l'énoncé`);
	}
	return reasons;
}

/** Contrôles d'un tirage ; rend les raisons d'échec */
export function checkInstance(
	instance: QuestionInstance,
	checks: StructuralChecks = {}
): { reasons: string[] } {
	const reasons: string[] = [];
	const steps = (instance.correction?.steps ?? []).map(String);
	if (steps.length === 0) return { reasons: ['aucune étape rendue'] };

	steps.forEach((step, stepIndex) => {
		const where = `étape ${stepIndex + 1}`;
		if (step.includes('{{') || step.includes('<<')) reasons.push(`${where} : marqueur non résolu`);
		const leftover = step.match(LEFTOVER_TOKENS);
		if (leftover) reasons.push(`${where} : reste de résolution « ${leftover[0]} »`);
		if ((step.replace(/\$\$/g, '').match(/\$/g) ?? []).length % 2 !== 0) {
			reasons.push(`${where} : « $ » non refermé`);
		}
		for (const latex of extractMath(step)) {
			const errors = validateLatex(latex);
			if (errors.length > 0) {
				reasons.push(
					`${where} : LaTeX invalide (${errors.map((e) => `${e.code} ${e.arg ?? ''}`.trim()).join(', ')})`
				);
			}
			for (const awkward of awkwardWritings(latex)) reasons.push(`${where} : ${awkward}`);
			for (const wrong of proseEqualities(latex)) reasons.push(`${where} : ${wrong}`);
		}
	});

	// Racine affine déclarée : des équations, pas une chaîne d'égalités
	if (checks.equations === 'affine-root') {
		reasons.push(...affineRootReasons(steps, instance));
		return { reasons };
	}

	const chains = steps.flatMap((step) => extractMath(step).flatMap(alignChains));
	reasons.push(...checkChains(chains, instance, checks));

	// Fin du calcul : la réponse attendue (chaque case, quand il y en a plusieurs)
	const blanks = instance.blanks ?? [];
	if (blanks.length === 1 && checks.digit) {
		reasons.push(...digitTableReasons(steps, instance, checks.digit));
	} else if (blanks.length === 1 && checks.end === 'factor') {
		reasons.push(...factorEndReasons(chains, instance));
	} else if (blanks.length === 1 && checks.written) {
		reasons.push(...writtenAnswerReasons(steps, instance));
	} else if (blanks.length === 1) {
		const expected = expectedBlankValue(instance);
		const expectedLatex = expectedBlankLatex(instance) ?? '';
		const last = chains.at(-1)?.at(-1);
		if (!last) reasons.push('aucun calcul aligné (`align`) dans la correction');
		else if (expected === null && !isLiteralMember(expectedLatex))
			reasons.push(`réponse attendue illisible : ${blanks[0].expectedAnswer}`);
		else {
			const value = numericValue(last);
			const ends =
				expected !== null && value !== null
					? sameNumber(value, expected)
					: isLiteralMember(last) || isLiteralMember(expectedLatex)
						? literallyEquivalent(last, expectedLatex)
						: false;
			if (!ends) {
				reasons.push(
					`le calcul finit sur « ${stripDecorations(last)} », attendu ${blanks[0].expectedAnswer}`
				);
			}
		}
	} else if (blanks.length > 1) {
		// Plusieurs trous dans UNE relation posée : elle tient, cases remplies dans l'ordre
		const start = posedStart(instance, checks);
		if (start.kind === 'holes') {
			const values = blanks.map((_, index) => expectedBlankValue(instance, index));
			const holds = values.some((v) => v === null)
				? null
				: relationHolds(start.expression, values as number[]);
			if (holds !== true) {
				reasons.push(
					`relation posée « ${start.expression} » ${holds === null ? 'illisible' : 'fausse'} avec les réponses ${values.join(' ; ')}`
				);
			}
		}
		// Chaque case doit être la fin d'un calcul distinct
		const ends = chains.map((chain) => numericValue(chain.at(-1) ?? ''));
		blanks.forEach((blank, index) => {
			const expected = expectedBlankValue(instance, index);
			if (expected === null) {
				reasons.push(`réponse attendue illisible (case ${index + 1}) : ${blank.expectedAnswer}`);
				return;
			}
			const found = ends.findIndex((end) => end !== null && sameNumber(end, expected));
			if (found !== -1) ends[found] = null;
			else if (!givenInProse(steps, expected)) {
				reasons.push(
					`aucun calcul ne finit sur la case ${index + 1} (${blank.expectedAnswer}), ` +
						`ni égalité « n = valeur » dans la prose`
				);
			}
		});
	} else if (instance.choices && instance.choices.length > 0) {
		const lastStep = steps.at(-1) ?? '';
		for (const choice of instance.choices) {
			const text = String(choice.content);
			const named = namesChoice(lastStep, text);
			if (choice.isCorrect && !named)
				reasons.push(`la conclusion ne nomme pas le bon choix « ${text} »`);
			if (!choice.isCorrect && named)
				reasons.push(`la conclusion nomme un mauvais choix « ${text} »`);
		}
	}
	return { reasons };
}

/** Champs portés par la base, absents du schéma strict de l'éditeur */
function withoutDatabaseFields(template: QuestionTemplate): Omit<QuestionTemplate, 'id'> {
	const {
		id: _id,
		created_at: _createdAt,
		updated_at: _updatedAt,
		created_by: _createdBy,
		...rest
	} = template;
	return rest;
}

/**
 * Vérifie une proposition : chaque variation sur TOUT son domaine quand il est
 * énumérable (≤ 20 000 combinaisons), sinon sur 5 000 graines au moins ;
 * `seeds` impose N graines (tests rapides).
 */
export function verifyProposal(
	template: QuestionTemplate,
	proposal: Proposal,
	options: { seeds?: number; checks?: EntryChecks } = {}
): ProposalReport {
	const report: ProposalReport = {
		templateId: template.id,
		title: template.title,
		code: proposal.code,
		instances: 0,
		samplings: [],
		templateErrors: [],
		failures: [],
		passed: false
	};
	let injected: QuestionTemplate;
	try {
		injected = injectCorrection(template, proposal);
	} catch (error) {
		report.templateErrors.push(error instanceof Error ? error.message : String(error));
		return report;
	}
	report.templateErrors.push(...validateTemplate(injected));
	const schema = questionTemplateSchema.safeParse(withoutDatabaseFields(injected));
	if (!schema.success) {
		report.templateErrors.push(
			...schema.error.issues.map((issue) => `schéma : ${issue.path.join('.')} : ${issue.message}`)
		);
	}

	injected.variations.forEach((_, variationIndex) => {
		const { sampling, draws } = planDraws(injected, variationIndex, options);
		const checks = Array.isArray(options.checks)
			? options.checks[variationIndex]
			: (options.checks ?? {});
		if (!checks) {
			report.templateErrors.push(`contrôles déclarés : rien pour la variation ${variationIndex}`);
			return;
		}
		report.samplings.push(sampling);
		for (const { label, result } of draws) {
			report.instances++;
			if (!result.success) {
				report.failures.push({ variationIndex, draw: label, reasons: result.errors });
				continue;
			}
			const { reasons } = checkInstance(result.instance, checks);
			if (reasons.length > 0) report.failures.push({ variationIndex, draw: label, reasons });
		}
	});
	report.passed = report.templateErrors.length === 0 && report.failures.length === 0;
	return report;
}
