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
const addBuddyXpFromTest = vi.hoisted(() => vi.fn(async () => null));
vi.mock('$lib/server/buddy-xp-service', () => ({ addBuddyXpFromTest }));

import { POST } from '../+server';

const ELEVE = '11111111-1111-4111-8111-111111111111';
const MODELE_A = '22222222-2222-4222-8222-222222222222';
const MODELE_B = '33333333-3333-4333-8333-333333333333';

/** Les lignes réellement insérées dans `skill_attempts`. */
let attemptsInseres: Record<string, unknown>[];
/** Modèles marqués « carte de cours » en base (`options.courseCard`). */
let cartesDeCours: string[];
/** La ligne insérée dans `test_sessions`. */
let sessionInseree: Record<string, unknown> | null;

/** Simule un refus RLS : l'INSERT ne rend aucune ligne, et aucune erreur. */
let refusRlsSilencieux = false;

/** INSERT … `.select('id')` : rend les lignes « écrites » (aucune si refus RLS). */
function insertAvecSelect(onRows: (rows: Record<string, unknown>[]) => void = () => {}) {
	return (rows: Record<string, unknown>[] | Record<string, unknown>) => {
		const list = Array.isArray(rows) ? rows : [rows];
		return {
			select: async () => {
				if (refusRlsSilencieux) return { data: [], error: null };
				onRows(list);
				return { data: list.map((_, i) => ({ id: `row-${i}` })), error: null };
			}
		};
	};
}

function fauxSupabase() {
	return {
		from(table: string) {
			if (table === 'test_sessions') {
				return {
					insert: (row: Record<string, unknown>) => {
						sessionInseree = row;
						return {
							select: () => ({ single: async () => ({ data: { id: 'session-1' }, error: null }) })
						};
					}
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
			if (table === 'question_templates') {
				return {
					select: () => ({
						in: async (_col: string, ids: string[]) => ({
							data: ids.map((id) => ({
								id,
								options: cartesDeCours.includes(id) ? { courseCard: true } : null
							})),
							error: null
						})
					})
				};
			}
			if (table === 'skill_attempts') {
				return { insert: insertAvecSelect((rows) => attemptsInseres.push(...rows)) };
			}
			// test_answers et le reste : acceptés sans effet.
			return { insert: insertAvecSelect() };
		}
	};
}

function reponse(templateId: string, isCorrect: boolean, index = 0) {
	return {
		index,
		// Forme réelle d'une instance (`generateInstance`) : ni `answer` ni `type`
		instance: {
			templateId,
			statement: 'Combien font 2 + 2 ?',
			theme: 'Calcul',
			generatedAt: new Date().toISOString()
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
		cartesDeCours = [];
		sessionInseree = null;
		addBuddyXpFromTest.mockClear();
		refusRlsSilencieux = false;
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

	/**
	 * Carte de cours (#617) : l'élève s'auto-évalue (« Je savais / Je ne savais
	 * pas »). La tentative est enregistrée, mais avec la source `student_self`,
	 * lue en BASE (le marqueur de l'instance vient du client).
	 */
	it('enregistre l’auto-évaluation d’une carte de cours en source student_self', async () => {
		cartesDeCours = [MODELE_B];
		await enregistrer([reponse(MODELE_A, true, 0), reponse(MODELE_B, false, 1)]);

		expect(attemptsInseres).toHaveLength(2);
		expect(attemptsInseres[0]).toMatchObject({ template_id: MODELE_A, source: 'auto' });
		expect(attemptsInseres[1]).toMatchObject({
			template_id: MODELE_B,
			success: false,
			grade: Grade.AGAIN,
			source: 'student_self'
		});
	});

	// ------------------------------------------------------------------------
	// Décisions de David (2026-09-28) pour l'auto-évaluation d'une carte
	// ------------------------------------------------------------------------

	it('chaque utilisation laisse une trace : 2 clics le même jour → 2 lignes', async () => {
		cartesDeCours = [MODELE_B];
		await enregistrer([reponse(MODELE_B, true, 0), reponse(MODELE_B, false, 1)]);

		expect(attemptsInseres.map((a) => [a.template_id, a.source, a.success])).toEqual([
			[MODELE_B, 'student_self', true],
			[MODELE_B, 'student_self', false]
		]);
	});

	it('carte : fiche FSRS mise à jour au plus une fois par jour, écriture vérifiée', async () => {
		cartesDeCours = [MODELE_B];
		await enregistrer([reponse(MODELE_A, true, 0), reponse(MODELE_B, true, 1)]);

		// Question ordinaire : appel inchangé (aucune option)
		expect(applyFsrsReview.mock.calls[0]).toHaveLength(6);
		// Carte : Good, garde-fou journalier + écriture vérifiée
		const appelCarte = applyFsrsReview.mock.calls[1];
		expect(appelCarte.slice(2, 6)).toEqual([ELEVE, 'template', MODELE_B, Grade.GOOD]);
		const options = appelCarte[7] as {
			skipIf: (s: { lastReview: string | null }) => boolean;
			verifyWrite: boolean;
		};
		expect(options.verifyWrite).toBe(true);
		expect(options.skipIf({ lastReview: new Date().toISOString() })).toBe(true);
		expect(options.skipIf({ lastReview: null })).toBe(false);
	});

	it('garde-fou déclenché (fiche déjà mise à jour aujourd’hui) : la trace est QUAND MÊME enregistrée', async () => {
		cartesDeCours = [MODELE_B];
		applyFsrsReview.mockResolvedValue(null);
		await enregistrer([reponse(MODELE_B, true, 0)]);
		expect(attemptsInseres).toHaveLength(1);
	});

	it('carte : jamais ajoutée à un paquet (pas de deck Programme), même taguée', async () => {
		cartesDeCours = [MODELE_A]; // A est tagué à un point de programme
		await enregistrer([reponse(MODELE_A, true, 0)]);
		expect(ensureProgrammeDeckCard).not.toHaveBeenCalled();
	});

	it('carte : pas d’XP du compagnon', async () => {
		cartesDeCours = [MODELE_B];
		await enregistrer([reponse(MODELE_A, true, 0), reponse(MODELE_B, true, 1)]);
		const answers = addBuddyXpFromTest.mock.calls[0][2] as unknown[];
		expect(answers).toHaveLength(1);
	});

	it('carte : hors du score de la session (ni juste ni fausse)', async () => {
		cartesDeCours = [MODELE_B];
		await enregistrer([reponse(MODELE_A, false, 0), reponse(MODELE_B, true, 1)]);
		expect(sessionInseree).toMatchObject({ score: 0, total_questions: 1 });
	});

	it('sans carte : score et total inchangés (ceux du client)', async () => {
		await enregistrer([reponse(MODELE_A, true, 0), reponse(MODELE_B, false, 1)]);
		expect(sessionInseree).toMatchObject({ score: 10, total_questions: 2 });
	});

	it('signale un refus RLS silencieux sur skill_attempts (0 ligne, aucune erreur)', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		refusRlsSilencieux = true;

		await enregistrer([reponse(MODELE_A, true)]);

		const messages = consoleError.mock.calls.map((c) => String(c[0]));
		expect(messages).toContain('[tests/save] skill_attempts : lignes écrites ≠ lignes envoyées');
		expect(messages).toContain('[tests/save] test_answers : lignes écrites ≠ lignes envoyées');
		consoleError.mockRestore();
	});
});
