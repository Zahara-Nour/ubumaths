/**
 * Stratégie R-PASS : passage de la dizaine
 * ========================================
 *
 * Générée depuis l'opération posée par le modèle (`L + R` ou `L − R`) :
 * - cas général : compléter à la dizaine puis ajouter le reste
 *   (26 + 5 = 26 + 4 + 1 = 30 + 1 = 31 ; 21 − 6 = 21 − 1 − 5 = 20 − 5 = 15) ;
 * - `R = 9` : ajouter 10 puis retrancher 1 (32 + 9 = 32 + 10 − 1 = 42 − 1 = 41) ;
 * - cas sans passage (L déjà rond, ou le reste serait ≤ 0) : calcul direct.
 *
 * Les deux derniers cas ne sont écrits (par `{{if:…}}`) que s'ils SURVIENNENT dans
 * les tirages du modèle : un texte n'embarque pas de branche morte.
 */

import type { QuestionTemplate } from '../../../src/lib/questions/types';
import { generateInstance } from '../../../src/lib/questions/generator/instance-generator';
import { resolveExpression } from '../../../src/lib/questions/generator/content-resolver';
import { alignBlock, colored, inline } from './palette';
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
	/** Un tirage n'a pas de passage de la dizaine (L rond, ou reste ≤ 0) */
	plain: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DETECTION_SEEDS = 300;

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
		: [`${units(l)}=0`, `${r}-${units(l)}<=0`];
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

/** Les cas particuliers qui surviennent dans les tirages (graines 1..300) */
export function detectRPassCases(
	template: QuestionTemplate,
	variationIndex: number,
	op: BinaryOperation
): RPassCases {
	const single: QuestionTemplate = {
		...template,
		variations: [template.variations[variationIndex]]
	};
	const cases: RPassCases = { nine: false, plain: false };
	for (let seed = 1; seed <= DETECTION_SEEDS; seed++) {
		const result = generateInstance(single, seed);
		if (!result.success) {
			throw new Error(`tirage ${seed} impossible : ${result.errors.join(' ; ')}`);
		}
		const { left, right } = operandValues(op, result.instance.resolvedVariables ?? []);
		const leftUnits = ((left % 10) + 10) % 10;
		const rest = op.operator === '+' ? right - (10 - leftUnits) : right - leftUnits;
		if (right === 9) cases.nine = true;
		else if (leftUnits === 0 || rest <= 0) cases.plain = true;
	}
	return cases;
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
	return main.map((mainStep, i) => {
		let step = mainStep;
		if (cases.plain) step = anyOf(plainConditions(op), plain[i], step);
		if (cases.nine) step = anyOf([nineCondition(op)], nine[i], step);
		return step;
	});
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
			cases.plain && 'sans passage (calcul direct)'
		].filter(Boolean);
		notes.push(
			`variation ${index} : ${variable.name} = « ${variable.expression} » ; branches : ` +
				(branches.length > 0 ? `cas général + ${branches.join(' + ')}` : 'cas général seul')
		);
		return buildRPassSteps(op, cases);
	});
	return { byVariation, notes };
}
