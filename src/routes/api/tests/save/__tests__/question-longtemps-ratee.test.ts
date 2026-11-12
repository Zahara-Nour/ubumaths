/**
 * POST /api/tests/save — question longtemps ratée enfin réussie (chantier `regularite`, B3)
 * ========================================================================================
 *
 * Le gain du Palotin porte `longStruggleWon` : la règle est relue en base
 * (`loadLongStruggleWon`) pour les modèles RÉUSSIS de la série, cartes de cours
 * exclues, depuis le début de la série (maintenant − `seriesElapsedMs`). Sans
 * durée de série (ancien client) ou sans Palotin : rien n'est relu. Une lecture
 * en échec ne coûte que la fête, jamais le gain.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const addBuddyXpFromTest = vi.hoisted(() =>
	vi.fn<typeof import('$lib/server/buddy-xp-service').addBuddyXpFromTest>()
);
const loadLongStruggleWon = vi.hoisted(() =>
	vi.fn<typeof import('$lib/server/buddy-struggle').loadLongStruggleWon>()
);

vi.mock('$lib/server/buddy-xp-service', () => ({ addBuddyXpFromTest }));
vi.mock('$lib/server/buddy-struggle', () => ({ loadLongStruggleWon }));
vi.mock('$lib/server/buddy-themes', () => ({ fetchTemplateThemeIds: async () => new Map() }));
vi.mock('$lib/server/serviceRoleClient', () => ({ createServiceRoleClient: () => ({}) }));
vi.mock('$lib/server/course-card-attempts', () => ({
	CourseCardLookupError: class extends Error {},
	fetchCourseCardTemplateIds: async () => cartesDeCours
}));

import { POST } from '../+server';

vi.mock('$lib/server/middleware/auth', () => ({
	requireAuth: async (locals: { safeGetSession: () => Promise<{ user: unknown }> }) => {
		const { user } = await locals.safeGetSession();
		if (!user) throw (await import('@sveltejs/kit')).error(401, 'Non autorisé');
		return { user, profile: { role: 'student' } };
	}
}));

// Constantes
const ELEVE = '11111111-1111-4111-8111-111111111111';
const MODELE_A = '22222222-2222-4222-8222-222222222222';
const MODELE_B = '33333333-3333-4333-8333-333333333333';
const CARTE = '44444444-4444-4444-8444-444444444444';
/** Série commencée il y a 10 minutes */
const DUREE_SERIE = 10 * 60 * 1000;

const GAIN = {
	xpResult: {
		xp_gained: 12,
		new_xp: 112,
		new_level: 2,
		leveled_up: false,
		daily_cap_reached: false
	},
	streakUpdated: false,
	newStreak: 0,
	streakBonusXp: 0,
	isNewTheme: false
};

// Variables
let cartesDeCours: Set<string>;

// Functions
function reponse(templateId: string, isCorrect: boolean, index: number) {
	return {
		index,
		instance: {
			templateId,
			statement: 'Combien font 2 + 2 ?',
			generatedAt: new Date().toISOString()
		},
		isCorrect,
		timeSpent: 5,
		attempts: 1
	};
}

async function enregistrer(
	answers: ReturnType<typeof reponse>[],
	/** `null` : corps sans durée de série (ancien client) */
	seriesElapsedMs: number | null = DUREE_SERIE
): Promise<{ buddy_xp: Record<string, unknown> | null }> {
	const request = new Request('http://localhost/api/tests/save', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			result: {
				mode: 'typing',
				score: 10,
				scorePercentage: 100,
				totalQuestions: answers.length,
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
			],
			...(seriesElapsedMs === null ? {} : { seriesElapsedMs })
		})
	});
	const response = await POST({
		request,
		locals: {
			supabase: {},
			safeGetSession: async () => ({ user: { id: ELEVE }, session: {} })
		}
	} as never);
	expect(response.status, 'statut de la route').toBe(200);
	return response.json();
}

describe('POST /api/tests/save — question longtemps ratée enfin réussie', () => {
	beforeEach(() => {
		cartesDeCours = new Set();
		addBuddyXpFromTest.mockReset().mockResolvedValue(GAIN);
		loadLongStruggleWon.mockReset().mockResolvedValue(false);
	});

	it('règle vraie → `longStruggleWon: true` dans le gain', async () => {
		loadLongStruggleWon.mockResolvedValue(true);
		const body = await enregistrer([reponse(MODELE_A, true, 0)]);
		expect(body.buddy_xp).toMatchObject({ ...GAIN, longStruggleWon: true });
	});

	it('règle fausse → `longStruggleWon: false`', async () => {
		const body = await enregistrer([reponse(MODELE_A, true, 0)]);
		expect(body.buddy_xp?.longStruggleWon).toBe(false);
	});

	it('relit seulement les modèles réussis, cartes de cours exclues, depuis le début de la série', async () => {
		cartesDeCours = new Set([CARTE]);
		const avant = Date.now();
		await enregistrer([
			reponse(MODELE_A, true, 0),
			reponse(MODELE_A, true, 1),
			reponse(MODELE_B, false, 2),
			reponse(CARTE, true, 3)
		]);
		const apres = Date.now();

		expect(loadLongStruggleWon).toHaveBeenCalledTimes(1);
		const [eleve, modeles, depuis] = loadLongStruggleWon.mock.calls[0];
		expect(eleve).toBe(ELEVE);
		expect(modeles).toEqual([MODELE_A]);
		expect(depuis.getTime()).toBeGreaterThanOrEqual(avant - DUREE_SERIE);
		expect(depuis.getTime()).toBeLessThanOrEqual(apres - DUREE_SERIE);
	});

	it('aucune réussite → rien relu', async () => {
		const body = await enregistrer([reponse(MODELE_A, false, 0)]);
		expect(loadLongStruggleWon).not.toHaveBeenCalled();
		expect(body.buddy_xp?.longStruggleWon).toBe(false);
	});

	it('sans durée de série (ancien client) → rien relu, gain intact', async () => {
		const body = await enregistrer([reponse(MODELE_A, true, 0)], null);
		expect(loadLongStruggleWon).not.toHaveBeenCalled();
		expect(body.buddy_xp).toMatchObject({ ...GAIN, longStruggleWon: false });
	});

	it('sans Palotin (gain nul) → rien relu', async () => {
		addBuddyXpFromTest.mockResolvedValue(null);
		const body = await enregistrer([reponse(MODELE_A, true, 0)]);
		expect(loadLongStruggleWon).not.toHaveBeenCalled();
		expect(body.buddy_xp).toBeNull();
	});

	it('lecture en échec → gain rendu quand même, sans fête', async () => {
		loadLongStruggleWon.mockRejectedValue(new Error('connexion perdue'));
		const body = await enregistrer([reponse(MODELE_A, true, 0)]);
		expect(body.buddy_xp).toMatchObject({ ...GAIN, longStruggleWon: false });
	});
});
