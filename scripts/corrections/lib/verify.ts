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
	| { kind: 'value'; value: number; expression: string }
	| { kind: 'hole'; expression: string }
	| { kind: 'literal'; latex: string; expression: string }
	| { kind: 'unknown'; expression: string | null };

/**
 * Sans variable d'expression : l'UNIQUE bloc `$$…$$` de l'énoncé résolu, s'il se lit
 * comme une valeur (nombre ou expression littérale, sans `=` ni inconnue).
 */
function statementStart(instance: QuestionInstance): PosedStart {
	const blocks = [...String(instance.statement ?? '').matchAll(/\$\$([\s\S]+?)\$\$/g)].map((m) =>
		m[1].trim()
	);
	if (blocks.length !== 1) return { kind: 'unknown', expression: null };
	const latex = blocks[0];
	if (latex.includes('=')) return { kind: 'unknown', expression: latex };
	const value = numericValue(latex);
	if (value !== null) return { kind: 'value', value, expression: latex };
	if (isLiteralMember(latex)) return { kind: 'literal', latex, expression: latex };
	return { kind: 'unknown', expression: latex };
}

/**
 * L'opération posée : valeur de la variable d'expression, trou `?`, expression
 * littérale (convertie en LaTeX, sans évaluation), ou — sans variable
 * d'expression — le bloc mathématique unique de l'énoncé.
 */
export function posedStart(instance: QuestionInstance): PosedStart {
	const variable = (instance.resolvedVariables ?? []).find((v) => v.name.startsWith('expression'));
	if (!variable) return statementStart(instance);
	const expression = variable.value;
	if (expression.includes('?')) return { kind: 'hole', expression };
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

/**
 * L'égalité posée par une question à trou tient-elle quand on remplace « ? » par
 * `value` ? `3 + ? = 10` avec 7 → vrai. `null` : l'égalité posée ne se lit pas
 * (pas exactement un « = », membre illisible).
 */
export function holeEquationHolds(expression: string, value: number): boolean | null {
	const sides = expression.split('=');
	if (sides.length !== 2) return null;
	const [left, right] = sides.map((side) => evalFormValue(side.replace(/\?/g, `(${value})`)));
	if (left === null || right === null) return null;
	return sameNumber(left, right);
}

/**
 * Chaînes d'égalités : chaque membre vaut le même nombre, et TOUS sont lisibles.
 * Seule exception : l'inconnue `?` en tête de la première chaîne d'une question à
 * trou, et alors le membre suivant doit valoir la réponse attendue. La première
 * chaîne part de l'opération posée (même valeur que la variable d'expression).
 */
export function checkChains(chains: string[][], instance: QuestionInstance): string[] {
	const reasons: string[] = [];
	const start = posedStart(instance);
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
			// « ? = réponse » seul ne calcule rien : au moins un calcul entre les deux
			if (chain.length < 3) {
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
		} else if (start.kind === 'literal') {
			if (!literallyEquivalent(chain[0], start.latex)) {
				reasons.push(`le calcul ne part pas de l'expression posée « ${start.latex} » : ${shown}`);
			}
		} else if (start.kind === 'unknown') {
			reasons.push(
				`point de départ invérifiable (opération posée : ${start.expression ?? 'aucune'}) : ${shown}`
			);
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

/** Contrôles d'un tirage ; rend les raisons d'échec */
export function checkInstance(instance: QuestionInstance): { reasons: string[] } {
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

	const chains = steps.flatMap((step) => extractMath(step).flatMap(alignChains));
	reasons.push(...checkChains(chains, instance));

	// Fin du calcul : la réponse attendue (chaque case, quand il y en a plusieurs)
	const blanks = instance.blanks ?? [];
	if (blanks.length === 1) {
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
	options: { seeds?: number } = {}
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
		report.samplings.push(sampling);
		for (const { label, result } of draws) {
			report.instances++;
			if (!result.success) {
				report.failures.push({ variationIndex, draw: label, reasons: result.errors });
				continue;
			}
			const { reasons } = checkInstance(result.instance);
			if (reasons.length > 0) report.failures.push({ variationIndex, draw: label, reasons });
		}
	});
	report.passed = report.templateErrors.length === 0 && report.failures.length === 0;
	return report;
}
