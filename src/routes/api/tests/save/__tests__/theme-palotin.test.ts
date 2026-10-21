/**
 * POST /api/tests/save — thème de chaque réponse pour le Palotin
 * ==============================================================
 *
 * Le bonus « nouveau thème » n'était jamais donné : la route passait
 * `theme: undefined`. Le thème d'une réponse est désormais celui du programme
 * du point que valide la question (`fetchTemplateThemeIds`, lu en base, une
 * requête pour toute la séance). Une question sans point n'a pas de thème.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const addBuddyXpFromTest = vi.hoisted(() =>
	vi.fn<typeof import('$lib/server/buddy-xp-service').addBuddyXpFromTest>(async () => null)
);
const fetchTemplateThemeIds = vi.hoisted(() =>
	vi.fn<(supabase: unknown, templateIds: string[]) => Promise<Map<string, string>>>()
);

vi.mock('$lib/server/buddy-xp-service', () => ({ addBuddyXpFromTest }));
vi.mock('$lib/server/buddy-themes', () => ({ fetchTemplateThemeIds }));
vi.mock('$lib/server/srs/record-series-reviews', () => ({ recordSeriesReviews: vi.fn() }));
vi.mock('$lib/server/serviceRoleClient', () => ({ createServiceRoleClient: () => ({}) }));
vi.mock('$lib/server/course-card-attempts', () => ({
	CourseCardLookupError: class extends Error {},
	fetchCourseCardTemplateIds: async () => cartesDeCours
}));

import { POST } from '../+server';

// Constantes
const ELEVE = '11111111-1111-4111-8111-111111111111';
const MODELE_A = '22222222-2222-4222-8222-222222222222';
const MODELE_B = '33333333-3333-4333-8333-333333333333';
const CARTE = '44444444-4444-4444-8444-444444444444';
const THEME_1 = '55555555-5555-4555-8555-555555555555';

// Variables
let cartesDeCours: Set<string>;

// Functions
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
			return {
				insert: (rows: unknown[]) => ({
					select: async () => ({ data: rows.map((_, i) => ({ id: `r${i}` })), error: null })
				})
			};
		}
	};
}

function reponse(templateId: string | undefined, isCorrect: boolean, index: number) {
	return {
		index,
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

async function enregistrer(answers: ReturnType<typeof reponse>[], mode = 'interactive') {
	const request = new Request('http://localhost/api/tests/save', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			result: {
				mode,
				score: 10,
				scorePercentage: 100,
				totalQuestions: answers.length,
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
	const response = await POST({
		request,
		locals: {
			supabase: fauxSupabase(),
			safeGetSession: async () => ({ user: { id: ELEVE }, session: {} })
		}
	} as never);
	// Un corps refusé par Zod rendrait 400 : tous les cas seraient rouges pour rien.
	expect(response.status, 'statut de la route').toBe(201);
	return response;
}

describe('POST /api/tests/save — thème des réponses pour le Palotin', () => {
	beforeEach(() => {
		cartesDeCours = new Set();
		addBuddyXpFromTest.mockClear();
		fetchTemplateThemeIds.mockReset().mockResolvedValue(new Map([[MODELE_A, THEME_1]]));
	});

	it('chaque réponse porte le thème du programme de sa question', async () => {
		await enregistrer([reponse(MODELE_A, true, 0), reponse(MODELE_B, false, 1)]);

		const answers = addBuddyXpFromTest.mock.calls[0][2];
		expect(answers).toEqual([
			{ isCorrect: true, theme: THEME_1 },
			// Question sans point de programme : pas de thème, sans erreur
			{ isCorrect: false, theme: undefined }
		]);
	});

	it('UNE lecture groupée pour la séance, modèles distincts', async () => {
		await enregistrer([
			reponse(MODELE_A, true, 0),
			reponse(MODELE_A, true, 1),
			reponse(MODELE_B, true, 2)
		]);

		expect(fetchTemplateThemeIds).toHaveBeenCalledTimes(1);
		expect([...fetchTemplateThemeIds.mock.calls[0][1]].sort()).toEqual([MODELE_A, MODELE_B]);
	});

	it('carte de cours : ni XP ni thème demandé pour elle', async () => {
		cartesDeCours = new Set([CARTE]);
		await enregistrer([reponse(MODELE_A, true, 0), reponse(CARTE, true, 1)]);

		expect(fetchTemplateThemeIds.mock.calls[0][1]).toEqual([MODELE_A]);
		expect(addBuddyXpFromTest.mock.calls[0][2]).toEqual([{ isCorrect: true, theme: THEME_1 }]);
	});

	it('séance flash : aucune lecture de thème, aucun gain', async () => {
		await enregistrer([reponse(MODELE_A, true, 0)], 'flash');
		expect(fetchTemplateThemeIds).not.toHaveBeenCalled();
		expect(addBuddyXpFromTest).not.toHaveBeenCalled();
	});
});
