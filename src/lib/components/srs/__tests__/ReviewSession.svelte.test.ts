/**
 * Écran de séance : une panne ou des cartes toutes écartées ne félicitent pas
 * ===========================================================================
 *
 * Avant : un `due` en erreur (500, 404) ou une séance dont toutes les cartes
 * avaient été écartées tombait sur l'état vide — « Félicitations ! Toutes vos
 * cartes sont à jour. » L'élève croyait avoir fini alors que rien n'avait été
 * chargé.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import ReviewSession from '../ReviewSession.svelte';
import { studentCache } from '$lib/stores/studentDashboardCache.svelte';
import { toaster } from '$lib/stores/toaster.svelte';
import type { BuddyState } from '$lib/types/buddy';

const source = { kind: 'chapter', chapterId: 'c1' } as const;
const texte = (container: HTMLElement) => container.textContent!.replace(/\s+/g, ' ').trim();

function respond(status: number, body: unknown) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	studentCache.hydrateBuddy(null);
});

describe('ReviewSession — états de chargement', () => {
	it('rien à revoir : l’état vide, avec son titre', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => respond(200, { cards: [], skipped: 0 }))
		);
		const { container } = await render(ReviewSession, {
			source,
			emptyTitle: "Rien à revoir aujourd'hui"
		});
		await expect.poll(() => texte(container)).toContain("Rien à revoir aujourd'hui");
	});

	for (const status of [500, 404]) {
		it(`panne du chargement (${status}) : message d’erreur et « Réessayer », pas de félicitations`, async () => {
			const fetchMock = vi
				.fn()
				.mockResolvedValueOnce(respond(status, { error: 'x' }))
				.mockResolvedValueOnce(respond(200, { cards: [], skipped: 0 }));
			vi.stubGlobal('fetch', fetchMock);
			const { container } = await render(ReviewSession, {
				source,
				emptyTitle: "Rien à revoir aujourd'hui"
			});

			await expect.poll(() => texte(container)).toContain('Impossible de charger');
			expect(texte(container)).not.toContain('Félicitations');
			expect(texte(container)).not.toContain("Rien à revoir aujourd'hui");

			await page.getByRole('button', { name: 'Réessayer' }).click();
			await expect.poll(() => texte(container)).toContain("Rien à revoir aujourd'hui");
			expect(fetchMock).toHaveBeenCalledTimes(2);
		});
	}

	it('toutes les cartes écartées : on le dit, pas de félicitations', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => respond(200, { cards: [], skipped: 3 }))
		);
		const { container } = await render(ReviewSession, {
			source,
			emptyTitle: "Rien à revoir aujourd'hui"
		});
		await expect.poll(() => texte(container)).toContain("n'ont pas pu être affichées");
		expect(texte(container)).not.toContain('Félicitations');
		expect(texte(container)).not.toContain("Rien à revoir aujourd'hui");
	});
});

describe('ReviewSession — gain du Palotin en fin de séance', () => {
	const deck = { kind: 'deck', deckId: 'd1' } as const;
	const dueBody = {
		cards: [{ cardId: 'k1', cardType: 'custom', frontContent: 'Recto', backContent: 'Verso' }],
		skipped: 0
	};
	const buddy = {
		student_id: '00000000-0000-4000-8000-000000000001',
		palotin_type: 'cotice',
		xp: 40,
		level: 2,
		current_streak: 1,
		longest_streak: 1,
		last_activity_date: null,
		xp_earned_today: 5,
		last_xp_date: null,
		themes_explored: [],
		change_count: 0,
		equipped_skin_id: null,
		constance_week_start: null,
		constance_days_this_week: 0
	};

	async function finishSession(submitBody: unknown) {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string) => {
				if (url.startsWith('/api/srs/review/due')) return respond(200, dueBody);
				if (url === '/api/srs/review/submit') return respond(200, submitBody);
				if (url === '/api/student/buddy') return respond(200, { buddy });
				return respond(404, {});
			})
		);
		const { container } = await render(ReviewSession, { source: deck });
		await page.getByRole('button', { name: 'Voir la réponse' }).click();
		await page.getByRole('button', { name: /Bien/ }).click();
		await expect.poll(() => texte(container)).toContain('Session terminée');
		return container;
	}

	it('le serveur joint un gain : le Palotin le montre', async () => {
		const container = await finishSession({
			success: true,
			buddy_xp: {
				xpResult: {
					xp_gained: 5,
					new_xp: 45,
					new_level: 2,
					leveled_up: false,
					daily_cap_reached: false
				},
				streakUpdated: false,
				newStreak: 1,
				streakBonusXp: 0,
				isNewTheme: false
			}
		});
		await expect.poll(() => texte(container)).toContain('Cotice a gagné 5 pansées');
	});

	it('panne du côté du Palotin : la révision reste enregistrée, aucune erreur de soumission', async () => {
		studentCache.hydrateBuddy({ ...buddy, palotin_type: 'cotice' } as BuddyState);
		vi.spyOn(studentCache, 'updateBuddyXpOptimistic').mockImplementation(() => {
			throw new Error('cache en panne');
		});
		const toastError = vi.spyOn(toaster, 'error');
		const container = await finishSession({
			success: true,
			buddy_xp: {
				xpResult: {
					xp_gained: 5,
					new_xp: 45,
					new_level: 2,
					leveled_up: false,
					daily_cap_reached: false
				}
			}
		});
		expect(texte(container)).toContain('Session terminée');
		expect(toastError).not.toHaveBeenCalled();
	});

	it('réponse sans buddy_xp : la séance se termine, sans gain affiché', async () => {
		const container = await finishSession({ success: true });
		expect(texte(container)).not.toContain('a gagné');
	});
});

describe('ReviewSession — nouveautés de la Chatterie en fin de séance', () => {
	const deck = { kind: 'deck', deckId: 'd1' } as const;
	const dueBody = {
		cards: [{ cardId: 'k1', cardType: 'custom', frontContent: 'Recto', backContent: 'Verso' }],
		skipped: 0
	};
	const news = {
		firstVisit: false,
		total: 1,
		items: [
			{
				kind: 'birth',
				notionId: 'n1',
				name: 'Pile-Poil',
				raceIndex: 0,
				stage: 'chaton',
				newStars: []
			}
		]
	};

	it('demandées APRÈS la dernière révision enregistrée, puis affichées', async () => {
		const calls: string[] = [];
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string) => {
				calls.push(url);
				if (url.startsWith('/api/srs/review/due')) return respond(200, dueBody);
				if (url === '/api/srs/review/submit') return respond(200, { success: true });
				if (url === '/api/student/mathoux') {
					return respond(200, { born: 1, napping: 0, toDiscover: 0, news });
				}
				return respond(404, {});
			})
		);
		const { container } = await render(ReviewSession, { source: deck });
		await page.getByRole('button', { name: 'Voir la réponse' }).click();
		await page.getByRole('button', { name: /Bien/ }).click();
		await expect
			.poll(() => texte(container))
			.toContain('Un chaton est né à la Chatterie : Pile-Poil !');
		expect(calls.indexOf('/api/student/mathoux')).toBeGreaterThan(
			calls.indexOf('/api/srs/review/submit')
		);
	});

	it('compte non élève (403) : la séance se termine, sans annonce', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string) => {
				if (url.startsWith('/api/srs/review/due')) return respond(200, dueBody);
				if (url === '/api/srs/review/submit') return respond(200, { success: true });
				if (url === '/api/student/mathoux') return respond(403, { message: 'Interdit' });
				return respond(404, {});
			})
		);
		const { container } = await render(ReviewSession, { source: deck });
		await page.getByRole('button', { name: 'Voir la réponse' }).click();
		await page.getByRole('button', { name: /Bien/ }).click();
		await expect.poll(() => texte(container)).toContain('Session terminée');
		expect(texte(container)).not.toContain('Chatterie');
	});
});
