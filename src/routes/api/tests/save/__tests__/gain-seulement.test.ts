/**
 * POST /api/tests/save — fin de série : le gain du Palotin, rien d'autre
 * ======================================================================
 *
 * Depuis la PR 4 du chantier `formes-de-serie` (ADR 0038, N9, N13), chaque
 * question laisse sa trace dès la réponse (`/api/skill-attempts`). L'appel de
 * fin de série n'écrit plus ni séance libre (`test_sessions`, `test_answers`),
 * ni trace, ni fiche FSRS, ni paquet : il calcule seulement le gain du Palotin
 * à partir des réponses, comme avant (décision de David, 2026-11-11).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const applyFsrsReview = vi.hoisted(() => vi.fn());
const ensureProgrammeDeckCard = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/srs/fsrs-actions', () => ({ applyFsrsReview }));
vi.mock('$lib/server/srs/programme-deck', () => ({ ensureProgrammeDeckCard }));
// Typé avec la vraie signature : les tests lisent ses arguments (les réponses).
const addBuddyXpFromTest = vi.hoisted(() =>
	vi.fn<typeof import('$lib/server/buddy-xp-service').addBuddyXpFromTest>(async () => null)
);
vi.mock('$lib/server/buddy-xp-service', () => ({ addBuddyXpFromTest }));
// Le serveur lit la nature des modèles avec ses propres droits (brouillons
// compris) ; `lectureModeles` compte ses lectures.
vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => ({ from: () => ({ select: () => ({ in: lireModeles(true) }) }) })
}));

import { POST } from '../+server';

vi.mock('$lib/server/middleware/auth', () => ({
	// Garde commune simulée : la session vient de `locals.safeGetSession`
	requireAuth: async (locals: { safeGetSession: () => Promise<{ user: unknown }> }) => {
		const { user } = await locals.safeGetSession();
		// Comme la vraie garde : pas de session → 401
		if (!user) throw (await import('@sveltejs/kit')).error(401, 'Non autorisé');
		return { user, profile: { role: 'student' } };
	}
}));

const ELEVE = '11111111-1111-4111-8111-111111111111';
const MODELE_A = '22222222-2222-4222-8222-222222222222';
const MODELE_B = '33333333-3333-4333-8333-333333333333';

/** Les lignes réellement insérées dans `skill_attempts`. */
let attemptsInseres: Record<string, unknown>[];
/** Modèles marqués « carte de cours » en base (`options.courseCard`). */
let cartesDeCours: string[];
/** Modèles marqués « question de cours » en base (`options.courseQuestion`, Q110). */
let questionsDeCours: string[];
/** Tables où la route a écrit (aucune n'est attendue : traces envoyées question par question). */
let tablesEcrites: string[];

/** Garde de principe : l'INSERT ne rend aucune ligne, sans erreur (un refus RLS lève normalement 42501). */
let refusRlsSilencieux = false;
/** Nombre de lectures de `question_templates` qui échouent avant de réussir. */
let lecturesModelesEnPanne = 0;
/** Nombre de lectures de `question_templates` tentées. */
let lecturesModeles = 0;
/** Modèles repassés en brouillon : la RLS les cache à l'élève (0 ligne, sans erreur). */
let modelesEnBrouillon: string[];

/** Lecture de `question_templates` ; `voitBrouillons` : droits du serveur. */
function lireModeles(voitBrouillons: boolean) {
	return async (_col: string, ids: string[]) => {
		lecturesModeles += 1;
		if (lecturesModeles <= lecturesModelesEnPanne) {
			return { data: null, error: { message: 'connexion perdue' } };
		}
		return {
			data: ids
				.filter((id) => voitBrouillons || !modelesEnBrouillon.includes(id))
				.map((id) => ({
					id,
					options: optionsDe(id)
				})),
			error: null
		};
	};
}

/** `options` (jsonb) d'un modèle, selon les marqueurs du cas. */
function optionsDe(id: string): Record<string, boolean> | null {
	if (cartesDeCours.includes(id)) return { courseCard: true };
	if (questionsDeCours.includes(id)) return { courseQuestion: true };
	return null;
}

/** INSERT … `.select('id')` : rend les lignes « écrites » (aucune si `refusRlsSilencieux`). */
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
					insert: () => {
						tablesEcrites.push(table);
						return {
							select: () => ({ single: async () => ({ data: { id: 'session-1' }, error: null }) })
						};
					}
				};
			}
			if (table === 'question_template_points') {
				// Seul le modèle A est tagué à un point de programme. Le modèle est lu
				// avec les droits de l'élève : un brouillon est caché (null).
				return {
					select: () => ({
						in: async () => ({
							data: [
								{
									template_id: MODELE_A,
									question_templates: modelesEnBrouillon.includes(MODELE_A)
										? null
										: { options: optionsDe(MODELE_A), status: 'published' }
								}
							],
							error: null
						})
					})
				};
			}
			if (table === 'question_templates') {
				// Droits de l'élève : les brouillons sont invisibles
				return { select: () => ({ in: lireModeles(false) }) };
			}
			if (table === 'skill_attempts') {
				return {
					insert: insertAvecSelect((rows) => {
						tablesEcrites.push(table);
						attemptsInseres.push(...rows);
					})
				};
			}
			// test_answers et le reste
			return { insert: insertAvecSelect(() => tablesEcrites.push(table)) };
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

async function enregistrer(
	answers: ReturnType<typeof reponse>[],
	statutAttendu = 200,
	mode: 'interactive' | 'course' | 'flash' | 'typing' = 'interactive'
) {
	const request = new Request('http://localhost/api/tests/save', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			result: {
				mode,
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
			items: [
				{
					templateId: '4d5e6f70-4444-4444-8444-444444444444',
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
	expect(reponseHttp.status, 'statut de la route').toBe(statutAttendu);
	return reponseHttp;
}

describe('POST /api/tests/save — gain du Palotin seulement', () => {
	beforeEach(() => {
		attemptsInseres = [];
		tablesEcrites = [];
		cartesDeCours = [];
		questionsDeCours = [];
		addBuddyXpFromTest.mockClear();
		refusRlsSilencieux = false;
		lecturesModelesEnPanne = 0;
		lecturesModeles = 0;
		modelesEnBrouillon = [];
		applyFsrsReview.mockReset().mockResolvedValue(undefined);
		ensureProgrammeDeckCard.mockReset().mockResolvedValue(undefined);
	});

	it.each(['interactive', 'course', 'typing'] as const)(
		'%s : aucune séance libre, aucune trace, aucune fiche, aucun paquet',
		async (mode) => {
			await enregistrer([reponse(MODELE_A, true, 0), reponse(MODELE_B, false, 1)], 200, mode);
			expect(tablesEcrites).toEqual([]);
			expect(applyFsrsReview).not.toHaveBeenCalled();
			expect(ensureProgrammeDeckCard).not.toHaveBeenCalled();
		}
	);

	it('le gain est calculé sur toutes les réponses de la série', async () => {
		const reponseHttp = await enregistrer([
			reponse(MODELE_A, true, 0),
			reponse(MODELE_B, false, 1)
		]);
		expect(addBuddyXpFromTest).toHaveBeenCalledTimes(1);
		expect(addBuddyXpFromTest.mock.calls[0][2].map((a) => a.isCorrect)).toEqual([true, false]);
		const corps = await reponseHttp.json();
		expect(corps).toHaveProperty('buddy_xp');
		expect(corps).not.toHaveProperty('sessionId');
	});

	it('Saisie : gain du Palotin comme le Contrôle blanc (David, 2026-11-11)', async () => {
		await enregistrer([reponse(MODELE_A, true, 0), reponse(MODELE_B, false, 1)], 200, 'typing');
		expect(addBuddyXpFromTest).toHaveBeenCalledTimes(1);
		expect(addBuddyXpFromTest.mock.calls[0][2].map((a) => a.isCorrect)).toEqual([true, false]);
	});

	it('carte de cours : pas d’XP pour elle (décision 2026-09-28)', async () => {
		cartesDeCours = [MODELE_B];
		await enregistrer([reponse(MODELE_A, true, 0), reponse(MODELE_B, true, 1)]);
		expect(addBuddyXpFromTest.mock.calls[0][2]).toHaveLength(1);
	});

	it('carte repassée en brouillon : toujours sans XP (nature lue avec les droits du serveur)', async () => {
		cartesDeCours = [MODELE_B];
		modelesEnBrouillon = [MODELE_B];
		await enregistrer([reponse(MODELE_A, true, 0), reponse(MODELE_B, true, 1)]);
		expect(addBuddyXpFromTest.mock.calls[0][2]).toHaveLength(1);
	});

	it('base momentanément illisible : réessaie, puis calcule le gain', async () => {
		lecturesModelesEnPanne = 2;
		await enregistrer([reponse(MODELE_A, true, 0)]);
		expect(lecturesModeles).toBe(3);
		expect(addBuddyXpFromTest).toHaveBeenCalledTimes(1);
	});

	it('base illisible après 3 tentatives : 503, aucun gain', async () => {
		lecturesModelesEnPanne = 3;
		await enregistrer([reponse(MODELE_A, true, 0)], 503);
		expect(addBuddyXpFromTest).not.toHaveBeenCalled();
	});

	it('flash-cards : aucun gain, rien d’écrit, rien de lu', async () => {
		const reponseHttp = await enregistrer([reponse(MODELE_A, true, 0)], 200, 'flash');
		expect(addBuddyXpFromTest).not.toHaveBeenCalled();
		expect(tablesEcrites).toEqual([]);
		expect(lecturesModeles).toBe(0);
		expect(await reponseHttp.json()).toEqual({ buddy_xp: null });
	});
});
