/**
 * Vérification d'une proposition de correction
 * ============================================
 *
 * La proposition est injectée dans le modèle, puis chaque variation est tirée
 * `instances` fois (graines 1..N, variation seule). Pour chaque tirage :
 * 1. plus aucun `{{` ni `<<` dans la correction rendue ;
 * 2. le LaTeX de chaque bloc `$…$` / `$$…$$` est valide pour MathLive
 *    (environnements équilibrés, commandes connues) ;
 * 3. aucune écriture maladroite dans les calculs (`+ -3`, `+ 0`) ;
 * 4. chaque bloc `align` est une CHAÎNE D'ÉGALITÉS VRAIE : tous ses membres
 *    lisibles valent le même nombre ;
 * 5. le calcul FINIT sur la réponse attendue (dernier membre du dernier `align`
 *    égal à la réponse de la case) ; pour un QCM, la dernière étape nomme le bon
 *    choix et aucun autre.
 * Le modèle injecté passe aussi `validateTemplate` et le schéma Zod strict.
 *
 * « 0 échec » ne vaut que si l'on sait combien de tirages ont été analysés : le
 * rapport les compte.
 */

import { validateLatex } from 'mathlive';
import type { QuestionInstance, QuestionTemplate } from '../../../src/lib/questions/types';
import { generateInstance } from '../../../src/lib/questions/generator/instance-generator';
import { validateTemplate } from '../../../src/lib/questions/validators/template-validator';
import { questionTemplateSchema } from '../../../src/lib/questions/template-schema';
import { parseLatex } from '../../../src/lib/mathAST/parser';
import { computeNumericValue } from '../../../src/lib/mathAST/solve/numeric-value';
import { injectCorrection, type Proposal } from './proposal';

// ============================================================================
// TYPES
// ============================================================================

export interface InstanceFailure {
	variationIndex: number;
	seed: number;
	reasons: string[];
}

export interface ProposalReport {
	templateId: string;
	title: string;
	code: string;
	/** Tirages analysés, toutes variations confondues */
	instances: number;
	/** Membres d'égalité non lus comme des nombres (ex. `?`) : non vérifiés */
	unreadSegments: number;
	templateErrors: string[];
	failures: InstanceFailure[];
	passed: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_INSTANCES = 50;
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

/** Contrôles d'un tirage ; rend les raisons d'échec et le nombre de membres non lus */
export function checkInstance(instance: QuestionInstance): {
	reasons: string[];
	unreadSegments: number;
} {
	const reasons: string[] = [];
	let unreadSegments = 0;
	const steps = (instance.correction?.steps ?? []).map(String);
	if (steps.length === 0) return { reasons: ['aucune étape rendue'], unreadSegments };

	steps.forEach((step, stepIndex) => {
		const where = `étape ${stepIndex + 1}`;
		if (step.includes('{{') || step.includes('<<')) reasons.push(`${where} : marqueur non résolu`);
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
		}
	});

	// Chaînes d'égalités : tous les membres lisibles valent le même nombre
	const chains = steps.flatMap((step) => extractMath(step).flatMap(alignChains));
	for (const chain of chains) {
		const values = chain.map(numericValue);
		unreadSegments += values.filter((v) => v === null).length;
		const read = values.filter((v): v is number => v !== null);
		if (read.some((v) => !sameNumber(v, read[0]))) {
			reasons.push(`égalités fausses : ${chain.map(stripDecorations).join(' = ')}`);
		}
	}

	// Fin du calcul : la réponse attendue
	if (instance.blanks && instance.blanks.length > 0) {
		const expected = numericValue(
			instance.blanks[0].expectedAnswerLatex ?? instance.blanks[0].expectedAnswer
		);
		const lastChain = chains.at(-1);
		const last = lastChain?.at(-1);
		if (!last) reasons.push('aucun calcul aligné (`align`) dans la correction');
		else if (expected === null)
			reasons.push(`réponse attendue illisible : ${instance.blanks[0].expectedAnswer}`);
		else {
			const value = numericValue(last);
			if (value === null || !sameNumber(value, expected)) {
				reasons.push(
					`le calcul finit sur « ${stripDecorations(last)} », attendu ${instance.blanks[0].expectedAnswer}`
				);
			}
		}
	} else if (instance.choices && instance.choices.length > 0) {
		const lastStep = steps.at(-1) ?? '';
		for (const choice of instance.choices) {
			const text = String(choice.content);
			const named = new RegExp(`(^|[^\\p{L}])${text}($|[^\\p{L}])`, 'u').test(lastStep);
			if (choice.isCorrect && !named)
				reasons.push(`la conclusion ne nomme pas le bon choix « ${text} »`);
			if (!choice.isCorrect && named)
				reasons.push(`la conclusion nomme un mauvais choix « ${text} »`);
		}
	}
	return { reasons, unreadSegments };
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

/** Vérifie une proposition sur `instances` tirages par variation */
export function verifyProposal(
	template: QuestionTemplate,
	proposal: Proposal,
	instances = DEFAULT_INSTANCES
): ProposalReport {
	const report: ProposalReport = {
		templateId: template.id,
		title: template.title,
		code: proposal.code,
		instances: 0,
		unreadSegments: 0,
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

	injected.variations.forEach((variation, variationIndex) => {
		const single: QuestionTemplate = { ...injected, variations: [variation] };
		for (let seed = 1; seed <= instances; seed++) {
			report.instances++;
			const result = generateInstance(single, seed);
			if (!result.success) {
				report.failures.push({ variationIndex, seed, reasons: result.errors });
				continue;
			}
			const { reasons, unreadSegments } = checkInstance(result.instance);
			report.unreadSegments += unreadSegments;
			if (reasons.length > 0) report.failures.push({ variationIndex, seed, reasons });
		}
	});
	report.passed = report.templateErrors.length === 0 && report.failures.length === 0;
	return report;
}
