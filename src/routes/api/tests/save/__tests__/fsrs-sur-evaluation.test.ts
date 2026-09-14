/**
 * Répondre à une évaluation replanifie la carte FSRS
 * ===================================================
 *
 * Deux chemins écrivent dans `skill_attempts` pour un élève qui répond :
 * `/api/skill-attempts` (déclenché par `FlashCard`) et cette route, qui
 * enregistre une session d'évaluation ou d'entraînement.
 *
 * Le premier fait l'UPSERT FSRS **avant** d'insérer, avec un garde-fou
 * explicite contre la désynchro `srs_card_stats` ↔ `student_point_state`. Le
 * second, ajouté le 2026-08-29, écrivait en direct : les points de programme
 * étaient validés, **aucune carte n'était replanifiée**, et le garde-fou était
 * contourné.
 *
 * Rien ne le signalait — ni au typecheck, ni à l'écran : l'élève voyait son
 * score, le professeur voyait la couverture du programme avancer, et seule la
 * planification des révisions restait muette.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Grade } from '$lib/srs/types';

const applyFsrsReview = vi.hoisted(() => vi.fn());
const ensureProgrammeDeckCard = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/srs/fsrs-actions', () => ({ applyFsrsReview }));
vi.mock('$lib/server/srs/programme-deck', () => ({ ensureProgrammeDeckCard }));
vi.mock('$lib/server/buddy-xp-service', () => ({ addBuddyXpFromTest: vi.fn(async () => null) }));

import { POST } from '../+server';

const ELEVE = '11111111-1111-4111-8111-111111111111';
const MODELE_A = '22222222-2222-4222-8222-222222222222';
const MODELE_B = '33333333-3333-4333-8333-333333333333';

/** Les lignes réellement insérées dans `skill_attempts`. */
let attemptsInseres: Record<string, unknown>[];

function fauxSupabase() {
	return {
		from(table: string) {
			if (table === 'test_sessions') {
				return {
					insert: () => ({
						select: () => ({ single: async () => ({ data: { id: 'session-1' }, error: null }) })
					})
				};
			}
			if (table === 'question_template_points') {
				// Seul le modèle A est tagué à un point de programme.
				return {
					select: () => ({
						in: async () => ({ data: [{ template_id: MODELE_A }], error: null })
					})
				};
			}
			if (table === 'skill_attempts') {
				return {
					insert: async (rows: Record<string, unknown>[]) => {
						attemptsInseres.push(...rows);
						return { error: null };
					}
				};
			}
			// test_answers et le reste : acceptés sans effet.
			return { insert: async () => ({ error: null }) };
		}
	};
}

function reponse(templateId: string, isCorrect: boolean, index = 0) {
	return {
		index,
		instance: {
			templateId,
			statement: 'Combien font 2 + 2 ?',
			answer: '4',
			type: 'input-number' as const
		},
		isCorrect,
		timeSpent: 5,
		attempts: 1
	};
}

async function enregistrer(answers: ReturnType<typeof reponse>[]) {
	const request = new Request('http://localhost/api/tests/save', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			result: {
				mode: 'interactive',
				score: 10,
				scorePercentage: 100,
				totalQuestions: answers.length,
				// ⚠️ Deux `refine` du schéma comparent ces compteurs aux réponses :
				// s'en écarter fait répondre 400 et rend le test faussement rouge.
				correctAnswers: answers.filter((a) => a.isCorrect).length,
				timeSpent: 60,
				averageTime: 30,
				completedAt: new Date().toISOString(),
				answers
			},
			categories: [
				{
					category: { theme: 'Calcul', domain: 'Nombres', subdomain: null, level: 5 },
					quantity: answers.length,
					delay: 20
				}
			]
		})
	});

	const reponseHttp = await POST({
		request,
		locals: {
			supabase: fauxSupabase(),
			safeGetSession: async () => ({ user: { id: ELEVE }, session: {} })
		}
	} as never);

	// ⚠️ Sans ce garde, un corps rejeté par Zod rendrait 400 et TOUS les cas
	// seraient rouges pour une raison étrangère au correctif.
	expect(reponseHttp.status, 'la route doit accepter la requête').toBe(201);
	return reponseHttp;
}

describe('enregistrement d’une évaluation', () => {
	beforeEach(() => {
		attemptsInseres = [];
		applyFsrsReview.mockReset().mockResolvedValue(undefined);
		ensureProgrammeDeckCard.mockReset().mockResolvedValue(undefined);
	});

	it('replanifie la carte de chaque réponse portant un modèle', async () => {
		await enregistrer([reponse(MODELE_A, true, 0), reponse(MODELE_B, false, 1)]);

		expect(applyFsrsReview).toHaveBeenCalledTimes(2);
		// Le grade suit la réussite, comme dans `/api/skill-attempts`.
		expect(applyFsrsReview.mock.calls[0].slice(2)).toEqual([
			ELEVE,
			'template',
			MODELE_A,
			Grade.GOOD
		]);
		expect(applyFsrsReview.mock.calls[1].slice(2)).toEqual([
			ELEVE,
			'template',
			MODELE_B,
			Grade.AGAIN
		]);
	});

	it('enregistre le grade avec la tentative', async () => {
		await enregistrer([reponse(MODELE_A, true)]);

		expect(attemptsInseres).toHaveLength(1);
		expect(attemptsInseres[0]).toMatchObject({
			student_id: ELEVE,
			template_id: MODELE_A,
			success: true,
			grade: Grade.GOOD,
			source: 'auto'
		});
	});

	/**
	 * L'invariant du garde-fou, tenu PAR RÉPONSE : une carte qu'on n'a pas su
	 * replanifier ne doit pas laisser derrière elle une tentative enregistrée —
	 * c'est ce couple-là qui produit la désynchronisation durable. Mais un échec
	 * ne doit pas emporter les autres réponses : la session est déjà enregistrée
	 * et l'élève ne doit pas perdre son travail.
	 */
	it('n’insère PAS la tentative dont la replanification a échoué', async () => {
		applyFsrsReview
			.mockRejectedValueOnce(new Error('FSRS indisponible'))
			.mockResolvedValueOnce(undefined);

		await enregistrer([reponse(MODELE_A, true, 0), reponse(MODELE_B, false, 1)]);

		expect(attemptsInseres.map((a) => a.template_id)).toEqual([MODELE_B]);
	});

	it('ajoute au deck Programme les modèles tagués, et eux seuls', async () => {
		await enregistrer([reponse(MODELE_A, true, 0), reponse(MODELE_B, false, 1)]);

		expect(ensureProgrammeDeckCard).toHaveBeenCalledTimes(1);
		expect(ensureProgrammeDeckCard.mock.calls[0].slice(1)).toEqual([ELEVE, MODELE_A]);
	});
});
