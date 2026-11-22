/**
 * Coup de pouce d'une question (chantier `idees-format`, idée 5)
 * ==============================================================
 *
 * Phase 0 validée par David le 2026-11-22 (Q1 → C) : l'indice d'une variation est
 * écrit par l'auteur (`hint`), ou c'est la première étape de la correction
 * (`hintFromFirstStep`). L'élève l'ouvre s'il est bloqué ; l'évaluation ne le
 * reçoit jamais (`public-question.ts`, liste blanche).
 *
 * Un indice ne donne pas la réponse : refusés à l'écriture, un indice qui affiche
 * `{{solution}}` (ou la réponse de l'élève, `{{answer}}`, qui n'existe pas encore),
 * et la case « première étape » sur une correction d'une seule étape ou dont la
 * première étape affiche `{{solution}}`. Une première étape qui CALCULE la réponse
 * (« le double de $b$ est $2b$ ») ne se voit pas : l'auteur qui coche en répond.
 */

import { z } from 'zod';

// Constantes
export const HINT_MAX_LENGTH = 1000;

/**
 * `{{solution}}`, `{{solution:1}}`, `{{ solution_2 }}`, `{{answer}}`, `{{answer_1}}`…
 * (`\b` laisserait passer `_` : `solution_0` est injectée par `correction-resolver.ts`).
 * Une variable du modèle qui vaut la réponse (`{{b2}}`) ne se voit pas.
 */
const ANSWER_PLACEHOLDER = /\{\{\s*(?:solution|answer)(?![A-Za-z])/;

export const hintSchema = z
	.string()
	.trim()
	.min(1, 'Coup de pouce vide : écrire un indice ou retirer le champ')
	.max(HINT_MAX_LENGTH, `Coup de pouce trop long (${HINT_MAX_LENGTH} caractères au plus)`);

// Types
interface HintIssue {
	path: (string | number)[];
	message: string;
}

/** Forme lâche d'un modèle : la route d'écriture garde `shared` en jsonb libre */
interface LooseTemplate {
	shared?: unknown;
	variations?: readonly unknown[];
}

// Functions
function record(value: unknown): Record<string, unknown> | undefined {
	return typeof value === 'object' && value !== null
		? (value as Record<string, unknown>)
		: undefined;
}

function correctionSteps(correction: unknown): unknown[] | undefined {
	const steps = record(correction)?.steps;
	return Array.isArray(steps) ? steps : undefined;
}

/** Vrai si le texte affiche la réponse attendue (ou celle de l'élève) */
export function showsAnswer(text: string): boolean {
	return ANSWER_PLACEHOLDER.test(text);
}

/**
 * Refus du coup de pouce d'un modèle, communs à l'éditeur JSON (schéma strict) et
 * à la route d'écriture. La forme des champs (texte, booléen) est vérifiée par
 * les schémas ; ici, les contrôles croisés.
 */
export function hintIssues(template: LooseTemplate): HintIssue[] {
	const issues: HintIssue[] = [];
	const sharedCorrection = record(template.shared)?.correction;

	(template.variations ?? []).forEach((raw, index) => {
		const variation = record(raw);
		if (!variation) return;
		const hint = variation.hint;
		const fromFirstStep = variation.hintFromFirstStep === true;

		if (typeof hint === 'string' && showsAnswer(hint)) {
			issues.push({
				path: ['variations', index, 'hint'],
				message: 'Le coup de pouce ne doit pas afficher la réponse ({{solution}} ou {{answer}})'
			});
		}
		if (!fromFirstStep) return;

		const path = ['variations', index, 'hintFromFirstStep'];
		if (hint !== undefined) {
			issues.push({
				path,
				message:
					'Coup de pouce : un indice écrit OU la première étape de la correction, pas les deux'
			});
			return;
		}
		// La correction de la variation remplace la correction partagée (`??`, tirage)
		const steps = correctionSteps(variation.correction ?? sharedCorrection) ?? [];
		if (steps.length < 2) {
			issues.push({
				path,
				message:
					'Coup de pouce « première étape » : la correction doit avoir au moins deux étapes (une seule étape, c’est la réponse)'
			});
			return;
		}
		if (typeof steps[0] === 'string' && showsAnswer(steps[0])) {
			issues.push({
				path,
				message:
					'Coup de pouce « première étape » : cette étape affiche la réponse ({{solution}}) ; écrire un indice à la place'
			});
		}
	});
	return issues;
}

/** `superRefine` des deux schémas de modèle */
export function refineHints(data: LooseTemplate, ctx: z.RefinementCtx): void {
	for (const issue of hintIssues(data)) {
		ctx.addIssue({ code: 'custom', message: issue.message, path: issue.path });
	}
}
