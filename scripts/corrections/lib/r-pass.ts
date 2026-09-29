/**
 * Stratégie R-PASS : passage de la dizaine
 * ========================================
 *
 * Générée depuis l'opération posée par le modèle (`L + R` ou `L − R`) :
 * - cas général : compléter à la dizaine puis ajouter le reste
 *   (26 + 5 = 26 + 4 + 1 = 30 + 1 = 31 ; 21 − 6 = 21 − 1 − 5 = 20 − 5 = 15) ;
 * - `R = 9` : ajouter 10 puis retrancher 1 (32 + 9 = 32 + 10 − 1 = 42 − 1 = 41) ;
 * - différence à diminuende rond (30 − 6) : il Y A passage de la dizaine, on
 *   décompose 30 en 20 + 10 et on retranche de la dizaine (= 20 + 4 = 24) ;
 * - cas sans passage (somme à L rond, ou reste ≤ 0) : calcul direct.
 *
 * Les cas particuliers ne sont écrits (par `{{if:…}}`) que s'ils SURVIENNENT dans
 * les tirages du modèle — sur TOUT le domaine des variables quand il est
 * énumérable (`sampling.ts`), sinon sur 5 000 graines : un texte n'embarque pas
 * de branche morte, et n'en oublie pas une rare.
 */

import type { QuestionTemplate } from '../../../src/lib/questions/types';
import { resolveExpression } from '../../../src/lib/questions/generator/content-resolver';
import { alignBlock, colored, inline } from './palette';
import { planDraws, type Sampling } from './sampling';
import {
	findExpressionVariable,
	splitBinaryOperation,
	toDisplayForm,
	toEvalForm,
	type BinaryOperation
} from './operation';

// ============================================================================
// TYPES
// ============================================================================

export interface RPassCases {
	/** Un tirage a `R = 9` */
	nine: boolean;
	/** Un tirage n'a pas de passage de la dizaine (somme à L rond, ou reste ≤ 0) */
	plain: boolean;
	/** Une différence a un diminuende rond (30 − 6) : passage par la dizaine de L */
	roundMinuend: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// ============================================================================
// FUNCTIONS
// ============================================================================

function units(evalForm: string): string {
	return `mod(${evalForm},10)`;
}

/** Condition « R = 9 » */
function nineCondition(op: BinaryOperation): string {
	return `${toEvalForm(op.right)}=9`;
}

/** Conditions « pas de passage » (chacune suffit) */
function plainConditions(op: BinaryOperation): string[] {
	const l = toEvalForm(op.left);
	const r = toEvalForm(op.right);
	return op.operator === '+'
		? [`${units(l)}=0`, `${r}-(10-${units(l)})<=0`]
		: [`${r}-${units(l)}<=0`];
}

/** Condition « diminuende rond » (différence seulement) */
function roundMinuendCondition(op: BinaryOperation): string {
	return `${units(toEvalForm(op.left))}=0`;
}

/** Valeurs numériques des deux opérandes pour un tirage */
function operandValues(
	op: BinaryOperation,
	variables: Parameters<typeof resolveExpression>[1]
): { left: number; right: number } {
	const left = Number(resolveExpression(`{{eval:${toEvalForm(op.left)}}}`, variables));
	const right = Number(resolveExpression(`{{eval:${toEvalForm(op.right)}}}`, variables));
	return { left, right };
}

/** Les cas particuliers qui surviennent sur le domaine de la variation */
export function detectRPassCases(
	template: QuestionTemplate,
	variationIndex: number,
	op: BinaryOperation
): RPassCases & { sampling: Sampling } {
	const { sampling, draws } = planDraws(template, variationIndex);
	const cases: RPassCases = { nine: false, plain: false, roundMinuend: false };
	for (const { label, result } of draws) {
		if (!result.success) {
			throw new Error(`tirage ${label} impossible : ${result.errors.join(' ; ')}`);
		}
		const { left, right } = operandValues(op, result.instance.resolvedVariables ?? []);
		const leftUnits = ((left % 10) + 10) % 10;
		if (right === 9) {
			cases.nine = true;
		} else if (op.operator === '+') {
			if (leftUnits === 0 || right - (10 - leftUnits) <= 0) cases.plain = true;
		} else if (leftUnits === 0) {
			if (left - 10 <= 0) {
				throw new Error(`tirage ${label} : ${left} − ${right}, diminuende ≤ 10 non traité`);
			}
			cases.roundMinuend = true;
		} else if (right - leftUnits <= 0) {
			cases.plain = true;
		}
	}
	return { ...cases, sampling };
}

/** Étapes du cas général : compléter (ou redescendre) à la dizaine */
function completeSteps(op: BinaryOperation): [string, string] {
	const L = toDisplayForm(op.left);
	const R = toDisplayForm(op.right);
	const l = toEvalForm(op.left);
	const r = toEvalForm(op.right);
	if (op.operator === '+') {
		const k = `{{eval:10-${units(l)}}}`;
		const rest = `{{eval:${r}-(10-${units(l)})}}`;
		const ten = `{{eval:${l}+10-${units(l)}}}`;
		const prose =
			`On complète ${inline(L)} à la dizaine : il manque ${inline(colored('transformed', k))} ` +
			`pour arriver à ${inline(colored('intermediate', ten))}. ` +
			`On décompose donc ${inline(colored('transformed', R))} en ` +
			`${inline(`${colored('transformed', k)} + ${colored('transformed', rest)}`)}.`;
		const calc = alignBlock([
			`${L} + ${colored('transformed', R)} &= ${L} + ${colored('transformed', k)} + ${colored('transformed', rest)}`,
			`&= ${colored('intermediate', ten)} + ${rest}`,
			`&= {{solution}}`
		]);
		return [prose, calc];
	}
	const k = `{{eval:${units(l)}}}`;
	const rest = `{{eval:${r}-${units(l)}}}`;
	const ten = `{{eval:${l}-${units(l)}}}`;
	const prose =
		`On redescend d'abord à la dizaine : on enlève ${inline(colored('transformed', k))} ` +
		`à ${inline(L)} pour arriver à ${inline(colored('intermediate', ten))}. ` +
		`On décompose donc ${inline(colored('transformed', R))} en ` +
		`${inline(`${colored('transformed', k)} + ${colored('transformed', rest)}`)}.`;
	const calc = alignBlock([
		`${L} - ${colored('transformed', R)} &= ${L} - ${colored('transformed', k)} - ${colored('transformed', rest)}`,
		`&= ${colored('intermediate', ten)} - ${rest}`,
		`&= {{solution}}`
	]);
	return [prose, calc];
}

/** Étapes de `R = 9` : ± 10 puis ∓ 1 */
function nineSteps(op: BinaryOperation): [string, string] {
	const L = toDisplayForm(op.left);
	const l = toEvalForm(op.left);
	if (op.operator === '+') {
		return [
			`Ajouter ${inline(colored('transformed', '9'))}, c'est ajouter ${inline(colored('transformed', '10'))} puis retrancher ${inline(colored('transformed', '1'))}.`,
			alignBlock([
				`${L} + ${colored('transformed', '9')} &= ${L} + ${colored('transformed', '10')} - ${colored('transformed', '1')}`,
				`&= ${colored('intermediate', `{{eval:${l}+10}}`)} - 1`,
				`&= {{solution}}`
			])
		];
	}
	return [
		`Retrancher ${inline(colored('transformed', '9'))}, c'est retrancher ${inline(colored('transformed', '10'))} puis ajouter ${inline(colored('transformed', '1'))}.`,
		alignBlock([
			`${L} - ${colored('transformed', '9')} &= ${L} - ${colored('transformed', '10')} + ${colored('transformed', '1')}`,
			`&= ${colored('intermediate', `{{eval:${l}-10}}`)} + 1`,
			`&= {{solution}}`
		])
	];
}

/** Étapes d'une différence à diminuende rond : 30 − 6 = 20 + 10 − 6 = 20 + 4 */
function roundMinuendSteps(op: BinaryOperation): [string, string] {
	const L = toDisplayForm(op.left);
	const R = toDisplayForm(op.right);
	const l = toEvalForm(op.left);
	const r = toEvalForm(op.right);
	const below = `{{eval:${l}-10}}`;
	const inTen = `{{eval:10-${r}}}`;
	return [
		`${inline(L)} n'a pas d'unités : on ne peut pas retrancher ${inline(R)} directement. ` +
			`On décompose ${inline(colored('transformed', L))} en ` +
			`${inline(`${colored('transformed', below)} + ${colored('transformed', '10')}`)}, ` +
			`puis on retranche ${inline(R)} de la dizaine ${inline(colored('transformed', '10'))}.`,
		alignBlock([
			`${colored('transformed', L)} - ${R} &= ${colored('transformed', below)} + ${colored('transformed', '10')} - ${R}`,
			`&= ${below} + ${colored('intermediate', inTen)}`,
			`&= {{solution}}`
		])
	];
}

/** Étapes sans passage de la dizaine : calcul direct */
function plainSteps(op: BinaryOperation): [string, string] {
	const L = toDisplayForm(op.left);
	const R = toDisplayForm(op.right);
	return [
		`Ici, pas de passage de la dizaine : on calcule directement.`,
		alignBlock([`${L} ${op.operator} ${R} &= {{solution}}`])
	];
}

/** `{{if:c1|A|{{if:c2|A|B}}}}` : A si l'une des conditions est vraie, B sinon */
function anyOf(conditions: string[], whenTrue: string, otherwise: string): string {
	return conditions.reduceRight(
		(inner, condition) => `{{if:${condition}|${whenTrue}|${inner}}}`,
		otherwise
	);
}

/** Les étapes R-PASS d'une opération, avec les seules branches utiles */
export function buildRPassSteps(op: BinaryOperation, cases: RPassCases): string[] {
	const main = completeSteps(op);
	const nine = nineSteps(op);
	const plain = plainSteps(op);
	const round = roundMinuendSteps(op);
	return main.map((mainStep, i) => {
		let step = mainStep;
		if (cases.plain) step = anyOf(plainConditions(op), plain[i], step);
		if (cases.roundMinuend) step = anyOf([roundMinuendCondition(op)], round[i], step);
		if (cases.nine) step = anyOf([nineCondition(op)], nine[i], step);
		return step;
	});
}

/** « domaine entier (312 combinaisons) » / « 5000 graines » : d'où viennent les branches */
export function describeSampling(sampling: Sampling): string {
	return sampling.mode === 'exhaustive'
		? `domaine entier, ${sampling.size} combinaisons`
		: `${sampling.size} graines : ${sampling.reason}`;
}

/** Étapes R-PASS de chaque variation du modèle (lève une erreur si la structure est illisible) */
export function generateRPass(template: QuestionTemplate): {
	byVariation: string[][];
	notes: string[];
} {
	const notes: string[] = [];
	const byVariation = template.variations.map((_, index) => {
		const variable = findExpressionVariable(template, index);
		if (!variable) throw new Error(`variation ${index} : aucune variable d'expression`);
		const op = splitBinaryOperation(variable.expression);
		if (!op) {
			throw new Error(
				`variation ${index} : « ${variable.expression} » n'est pas une somme ou une différence`
			);
		}
		const cases = detectRPassCases(template, index, op);
		const branches = [
			cases.nine && 'R = 9 (±10 ∓ 1)',
			cases.roundMinuend && 'diminuende rond (L = (L − 10) + 10)',
			cases.plain && 'sans passage (calcul direct)'
		].filter(Boolean);
		notes.push(
			`variation ${index} : ${variable.name} = « ${variable.expression} » ; branches : ` +
				(branches.length > 0 ? `cas général + ${branches.join(' + ')}` : 'cas général seul') +
				` (${describeSampling(cases.sampling)})`
		);
		return buildRPassSteps(op, cases);
	});
	return { byVariation, notes };
}
