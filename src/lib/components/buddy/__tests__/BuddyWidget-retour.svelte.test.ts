/**
 * Le Palotin au retour de l'élève (docs/wip/palotins-absence-progress.md)
 * =======================================================================
 *
 * Ce que l'élève LIT et VOIT : après une longue absence, son Palotin est
 * triste et lui dit « tu m'as manqué ». La Constance perdue pendant cette
 * absence n'a pas sa réplique (« tu m'as manqué » la remplace) ; l'annonce de
 * la Chatterie suit la bulle, sans salutation. Une fois la bulle montrée, le
 * retour est acquitté auprès du serveur (docs/wip/palotins-presence-progress.md).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import BuddyWidget from '../BuddyWidget.svelte';
import { BUBBLE_DURATION } from '../buddy-timing';
import { studentCache } from '$lib/stores/studentDashboardCache.svelte';
import { buddyMessages } from '$lib/config/buddy-messages';
import type { BuddyState } from '$lib/types/buddy';
import { NO_NEWS } from '$lib/mathoux/news';

// Page courante simulée
const pageState = vi.hoisted(() => ({ url: new URL('http://localhost:5175/dashboard') }));
vi.mock('$app/state', () => ({ page: pageState }));

// Constantes
const buddy: BuddyState = {
	student_id: '00000000-0000-4000-8000-000000000001',
	palotin_type: 'pile',
	xp: 100,
	level: 3,
	current_streak: 0,
	longest_streak: 0,
	last_activity_date: null,
	xp_earned_today: 0,
	last_xp_date: null,
	themes_explored: [],
	change_count: 0,
	equipped_skin_id: null,
	constance_week_start: null,
	constance_days_this_week: 0
};
const MISSED = buddyMessages.pile.long_absence;
const STREAK_LOST = buddyMessages.pile.streak_lost;
/** Début de l'annonce de la Chatterie (suivie du lien « Aller à la Chatterie ») */
const NAPPING = '2 Mathoux font la sieste.';
const WELCOME_BACK_URL = '/api/student/buddy/welcome-back';

// Functions
function mockSummary(body: unknown) {
	const response = { ok: true, json: () => Promise.resolve(body) };
	vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
}

/** Appels POST d'acquittement du retour. */
function acknowledgements(): unknown[][] {
	const fetchMock = vi.mocked(fetch);
	return fetchMock.mock.calls.filter(([url]) => url === WELCOME_BACK_URL);
}

/** Texte de la bulle (zone annoncée aux lecteurs d'écran). */
function bubbleText(): string {
	return document.querySelector('[data-buddy-bubble]')?.textContent?.trim() ?? '';
}

function avatarSrc(): string {
	return document.querySelector('img[alt^="Palotin"]')?.getAttribute('src') ?? '';
}

beforeEach(() => {
	pageState.url = new URL('http://localhost:5175/dashboard');
	studentCache.hydrateBuddy(buddy);
});

afterEach(() => {
	vi.unstubAllGlobals();
	studentCache.hydrateBuddy(null);
});

describe('BuddyWidget — retour après une longue absence', () => {
	it('le Palotin est triste et dit « tu m’as manqué »', async () => {
		mockSummary({ born: 0, napping: 0, toDiscover: 0, news: NO_NEWS });
		await render(BuddyWidget, { props: { longAbsence: true } });

		await vi.waitFor(() => expect(MISSED).toContain(bubbleText()), { timeout: 3000 });
		expect(avatarSrc()).toContain('pile-sad');
		// Aucune salutation ensuite : à 2,5 s, la salutation au hasard serait déjà partie
		await new Promise((resolve) => setTimeout(resolve, 2500));
		const text = bubbleText();
		expect(text === '' || MISSED.includes(text)).toBe(true);
	}, 8_000);

	it('Constance perdue pendant l’absence : sa réplique ne s’affiche pas', async () => {
		mockSummary({ born: 0, napping: 0, toDiscover: 0, news: NO_NEWS });
		await render(BuddyWidget, { props: { longAbsence: true, streakLost: true } });

		await vi.waitFor(() => expect(MISSED).toContain(bubbleText()), { timeout: 3000 });
		await new Promise((resolve) => setTimeout(resolve, 1500));
		expect(STREAK_LOST).not.toContain(bubbleText());
		expect(MISSED).toContain(bubbleText());
	});

	it('l’annonce de la Chatterie suit la bulle, sans salutation entre les deux', async () => {
		mockSummary({ born: 2, napping: 2, toDiscover: 0, news: NO_NEWS });
		await render(BuddyWidget, { props: { longAbsence: true } });

		await vi.waitFor(() => expect(MISSED).toContain(bubbleText()), { timeout: 3000 });
		const missedAt = Date.now();
		// Jusqu'à l'annonce, la bulle ne montre que « tu m'as manqué » (ou rien)
		const seen = new Set<string>();
		await vi.waitFor(
			() => {
				const text = bubbleText();
				if (text) seen.add(text);
				expect(text.startsWith(NAPPING)).toBe(true);
			},
			{ timeout: 8000, interval: 100 }
		);
		// « tu m'as manqué » reste affiché toute la durée d'une bulle avant d'être remplacé
		expect(Date.now() - missedAt).toBeGreaterThanOrEqual(BUBBLE_DURATION - 300);
		for (const text of seen) {
			if (!text.startsWith(NAPPING)) expect(MISSED).toContain(text);
		}
	}, 12_000);

	it('sans longue absence, la Constance perdue garde sa réplique', async () => {
		mockSummary({ born: 0, napping: 0, toDiscover: 0, news: NO_NEWS });
		await render(BuddyWidget, { props: { streakLost: true } });

		await vi.waitFor(() => expect(STREAK_LOST).toContain(bubbleText()), { timeout: 3000 });
		expect(avatarSrc()).toContain('pile-determined');
	});

	it('la bulle montrée, le retour est acquitté une fois auprès du serveur', async () => {
		mockSummary({ born: 0, napping: 0, toDiscover: 0, news: NO_NEWS });
		await render(BuddyWidget, { props: { longAbsence: true } });

		expect(acknowledgements()).toHaveLength(0);
		await vi.waitFor(() => expect(MISSED).toContain(bubbleText()), { timeout: 3000 });
		await vi.waitFor(() => expect(acknowledgements()).toHaveLength(1));
		expect(acknowledgements()[0]).toEqual([WELCOME_BACK_URL, { method: 'POST' }]);
	});

	it('sans longue absence : rien à acquitter', async () => {
		mockSummary({ born: 0, napping: 0, toDiscover: 0, news: NO_NEWS });
		await render(BuddyWidget, { props: { streakLost: true } });

		await vi.waitFor(() => expect(STREAK_LOST).toContain(bubbleText()), { timeout: 3000 });
		expect(acknowledgements()).toHaveLength(0);
	});
});
