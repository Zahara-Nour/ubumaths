/**
 * Base locale remplie, chantier `seed-complet` — le VRAI moteur de questions, pour `suivi.ts`.
 *
 * Les copies d'évaluation et les réponses saisies inventées sont de vraies questions : tirées par
 * le tirage des séries, corrigées par le correcteur des évaluations. Une page qui rejoue une
 * question (détail d'une copie, erreurs d'une classe) retrouve donc ce que le seed a écrit.
 */

import { generateInstance } from '#lib/questions/generator/instance-generator.ts';
import { gestureAnswerLeaks } from '#lib/questions/public-question.ts';
import { drawSeriesQuestions, seriesSeedSequence } from '#lib/questions/series-items.ts';
import type { QuestionInstance, QuestionTemplate } from '#lib/questions/types.ts';
import { gradeWithinBudget } from '#lib/server/grading-budget.ts';
import { toQuestionTemplate, type QuestionTemplateRow } from '#lib/types/question-template.ts';
import { seriesItemsSchema } from '#lib/validation/series.ts';
import type { QuestionTiree, Verdict } from './suivi';

/** Réponses attendues d'une question, en texte ; `null` si une case n'est pas un texte simple. */
function reponsesAttendues(instance: QuestionInstance): string[] | null {
	const cases = instance.blanks ?? [];
	const textes: string[] = [];
	for (const c of cases) {
		const attendue: unknown = c.expectedAnswer;
		if (typeof attendue !== 'string' && typeof attendue !== 'number') return null;
		const texte = String(attendue);
		// Bornes de `trace_answer_parts_valid` (une réponse saisie ≤ 2000 caractères).
		if (texte.length === 0 || texte.length > 2000) return null;
		textes.push(texte);
	}
	return textes.length > 0 && textes.length <= 50 ? textes : null;
}

export function creerMoteur(lignes: QuestionTemplateRow[], compositionEvaluation: unknown) {
	const modeles = new Map<string, QuestionTemplate>(
		lignes.map((l) => [l.id, toQuestionTemplate(l)])
	);
	const composition = seriesItemsSchema.safeParse(compositionEvaluation);
	// Une question qui ne se génère pas est simplement omise : le plan sait faire sans.
	const silence = () => {};

	return {
		/** Les questions de l'évaluation pour une graine, comme au début d'une vraie tentative. */
		tirer(graine: number): QuestionTiree[] {
			if (!composition.success) return [];
			const tirages = drawSeriesQuestions(composition.data, [...modeles.values()], {
				excludeCourseCards: true,
				nextSeed: seriesSeedSequence(graine),
				onGenerationFailure: silence
			});
			const questions: QuestionTiree[] = [];
			for (const t of tirages) {
				// Même garde que l'appli : un énoncé masqué qui dirait la réponse est écarté.
				if (gestureAnswerLeaks(t.instance).length > 0) continue;
				// Une question sans réponse en texte (choix, geste) est écartée : le seed ne saurait
				// pas y répondre juste, et l'élève qui réussit tout n'aurait pas 20.
				const attendues = reponsesAttendues(t.instance);
				if (!attendues) continue;
				const { seed: _seed, ...instance } = t.instance;
				questions.push({
					template_id: t.template.id,
					seed: t.seed,
					delay_seconds: t.delaySeconds,
					instance: JSON.parse(JSON.stringify(instance)),
					attendues
				});
			}
			return questions;
		},

		corriger(instance: Record<string, unknown>, valeurs: string[] | null): Verdict {
			const { verdicts } = gradeWithinBudget([
				{
					instance: instance as unknown as QuestionInstance,
					answer: valeurs === null ? null : { values: valeurs }
				}
			]);
			const v = verdicts[0];
			return {
				status: v.status,
				points: v.points,
				isCorrect: v.isCorrect,
				partial: v.partial,
				...(v.feedback && { feedback: v.feedback })
			};
		},

		attendues(modele: string, graine: number): string[] | null {
			const m = modeles.get(modele);
			if (!m) return null;
			try {
				const g = generateInstance(m, graine);
				return g.success && g.instance ? reponsesAttendues(g.instance) : null;
			} catch {
				return null;
			}
		}
	};
}
