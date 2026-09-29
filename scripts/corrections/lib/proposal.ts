/**
 * Fichier de proposition de correction
 * ====================================
 *
 * `docs/corrections/<lot>/<id-du-modèle>.json` : une correction en mode A (étapes
 * markdown à variables) proposée pour UN modèle, à relire avant tout import.
 * Relu depuis le disque : validé par Zod (un fichier édité à la main peut être faux).
 *
 * Les étapes sont soit communes à toutes les variations (`shared`), soit données
 * variation par variation (`byVariation`, même longueur que `variations`).
 * À l'injection, elles sont TOUJOURS écrites dans chaque variation : l'éditeur
 * affiche la correction d'une variation, pas celle de `shared`.
 */

import { z } from 'zod';
import type { QuestionTemplate } from '../../../src/lib/questions/types';
import { templateMarkdown } from '../../../src/lib/ubumark';

// ============================================================================
// TYPES
// ============================================================================

const stepsSchema = z.array(z.string().min(1)).min(1).max(20);

export const proposalStepsSchema = z.union([
	z.object({ shared: stepsSchema }).strict(),
	z.object({ byVariation: z.array(stepsSchema).min(1).max(50) }).strict()
]);

export const proposalSchema = z
	.object({
		templateId: z.string().uuid(),
		title: z.string().min(1),
		classe: z.enum(['R', 'N']),
		code: z.string().regex(/^[RN]-[A-Z0-9-]+$/),
		source: z.enum(['generated', 'written']),
		steps: proposalStepsSchema,
		notes: z.array(z.string()).max(20)
	})
	.strict();

export type ProposalSteps = z.infer<typeof proposalStepsSchema>;
export type Proposal = z.infer<typeof proposalSchema>;

// ============================================================================
// FUNCTIONS
// ============================================================================

/** Lit un fichier de proposition (JSON déjà parsé) ; lève une erreur lisible */
export function parseProposal(raw: unknown, origin: string): Proposal {
	const result = proposalSchema.safeParse(raw);
	if (!result.success) {
		const issue = result.error.issues[0];
		throw new Error(`${origin} : ${issue.path.join('.')} : ${issue.message}`);
	}
	return result.data;
}

/** Les étapes de la variation `index` */
export function stepsForVariation(steps: ProposalSteps, index: number): string[] {
	if ('shared' in steps) return steps.shared;
	const own = steps.byVariation[index];
	if (!own) throw new Error(`aucune étape pour la variation ${index}`);
	return own;
}

/**
 * Le modèle avec la correction proposée écrite dans CHAQUE variation.
 * Refuse d'écraser une correction existante, et un nombre de variations différent.
 */
export function injectCorrection(template: QuestionTemplate, proposal: Proposal): QuestionTemplate {
	if (proposal.templateId !== template.id) {
		throw new Error(`proposition pour ${proposal.templateId}, modèle ${template.id}`);
	}
	if ('byVariation' in proposal.steps) {
		const expected = template.variations.length;
		const given = proposal.steps.byVariation.length;
		if (given !== expected) {
			throw new Error(`${given} liste(s) d'étapes pour ${expected} variation(s)`);
		}
	}
	if (template.shared?.correction) {
		throw new Error('le modèle a déjà une correction partagée : pas d’écrasement');
	}
	return {
		...template,
		variations: template.variations.map((variation, index) => {
			if (variation.correction) {
				throw new Error(`la variation ${index} a déjà une correction : pas d’écrasement`);
			}
			return {
				...variation,
				correction: {
					steps: stepsForVariation(proposal.steps, index).map((step) => templateMarkdown(step))
				}
			};
		})
	};
}
