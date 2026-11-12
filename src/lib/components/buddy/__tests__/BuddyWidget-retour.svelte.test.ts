/**
 * Le Palotin au retour de l'élève, après une pause (docs/systeme/buddy-palotins.md)
 * =================================================================================
 *
 * Ce que l'élève LIT et VOIT (chantier `regularite`, R2, David 2026-11-12) :
 * après une pause, le Palotin fête le retour APRÈS la 1re activité, joyeux,
 * sans dire la durée ni parler d'absence. La présence peut arriver après le
 * montage (relue après un gain) : la réplique est dite alors, une seule fois.
 * L'annonce de la Chatterie suit la bulle, sans salutation. Une fois la bulle
 * montrée, le retour est acquitté auprès du serveur.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import BuddyWidget from '../BuddyWidget.svelte';
import { BUBBLE_DURATION, GREETING_DELAY } from '../buddy-timing';
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
const RETURN = buddyMessages.pile.return_after_pause;
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

describe('BuddyWidget — retour après une pause', () => {
	it('le Palotin est joyeux et fête le retour', async () => {
		mockSummary({ born: 0, napping: 0, toDiscover: 0, news: NO_NEWS });
		await render(BuddyWidget, { props: { returnAfterPause: true } });

		await vi.waitFor(() => expect(RETURN).toContain(bubbleText()), { timeout: 3000 });
		expect(avatarSrc()).toContain('pile-happy');
		// Aucune salutation ensuite : à 2,5 s, la salutation au hasard serait déjà partie
		await new Promise((resolve) => setTimeout(resolve, 2500));
		const text = bubbleText();
		expect(text === '' || RETURN.includes(text)).toBe(true);
	}, 8_000);

	it('retour connu après le montage (présence relue après un gain) : dit une fois', async () => {
		mockSummary({ born: 0, napping: 0, toDiscover: 0, news: NO_NEWS });
		const onWelcomeBackSaid = vi.fn();
		const widget = await render(BuddyWidget, {
			props: { returnAfterPause: false, onWelcomeBackSaid }
		});
		await new Promise((resolve) => setTimeout(resolve, 200));
		await widget.rerender({ returnAfterPause: true, onWelcomeBackSaid });

		await vi.waitFor(() => expect(RETURN).toContain(bubbleText()), { timeout: 3000 });
		await vi.waitFor(() => expect(acknowledgements()).toHaveLength(1));
		expect(onWelcomeBackSaid).toHaveBeenCalledTimes(1);
		// Le parent remet le drapeau à faux puis à vrai : rien n'est redit
		await widget.rerender({ returnAfterPause: false, onWelcomeBackSaid });
		await widget.rerender({ returnAfterPause: true, onWelcomeBackSaid });
		await new Promise((resolve) => setTimeout(resolve, 1500));
		expect(acknowledgements()).toHaveLength(1);
	}, 8_000);

	it('retour connu juste après le montage : la salutation ne le recouvre pas', async () => {
		mockSummary({ born: 0, napping: 0, toDiscover: 0, news: NO_NEWS });
		const widget = await render(BuddyWidget, { props: { returnAfterPause: false } });
		await new Promise((resolve) => setTimeout(resolve, 300));
		await widget.rerender({ returnAfterPause: true });

		await vi.waitFor(() => expect(RETURN).toContain(bubbleText()), { timeout: 3000 });
		// Au-delà de la salutation (GREETING_DELAY), la bulle dit toujours le retour
		await new Promise((resolve) => setTimeout(resolve, GREETING_DELAY + 500));
		expect(RETURN).toContain(bubbleText());
	}, 10_000);

	it('retour connu après le montage : l’annonce de la Chatterie attend la fin de sa bulle', async () => {
		mockSummary({ born: 2, napping: 2, toDiscover: 0, news: NO_NEWS });
		const widget = await render(BuddyWidget, { props: { returnAfterPause: false } });
		await new Promise((resolve) => setTimeout(resolve, 300));
		await widget.rerender({ returnAfterPause: true });

		await vi.waitFor(() => expect(RETURN).toContain(bubbleText()), { timeout: 3000 });
		const saidAt = Date.now();
		await vi.waitFor(() => expect(bubbleText().startsWith(NAPPING)).toBe(true), {
			timeout: 10_000,
			interval: 100
		});
		expect(Date.now() - saidAt).toBeGreaterThanOrEqual(BUBBLE_DURATION - 300);
	}, 15_000);

	it('l’annonce de la Chatterie suit la bulle, sans salutation entre les deux', async () => {
		mockSummary({ born: 2, napping: 2, toDiscover: 0, news: NO_NEWS });
		await render(BuddyWidget, { props: { returnAfterPause: true } });

		await vi.waitFor(() => expect(RETURN).toContain(bubbleText()), { timeout: 3000 });
		const saidAt = Date.now();
		// Jusqu'à l'annonce, la bulle ne montre que la réplique du retour (ou rien)
		const seen = new Set<string>();
		await vi.waitFor(
			() => {
				const text = bubbleText();
				if (text) seen.add(text);
				expect(text.startsWith(NAPPING)).toBe(true);
			},
			{ timeout: 8000, interval: 100 }
		);
		// La réplique du retour reste affichée toute la durée d'une bulle avant d'être remplacée
		expect(Date.now() - saidAt).toBeGreaterThanOrEqual(BUBBLE_DURATION - 300);
		for (const text of seen) {
			if (!text.startsWith(NAPPING)) expect(RETURN).toContain(text);
		}
	}, 12_000);

	it('accueil quitté avant la bulle : rien n’est acquitté', async () => {
		mockSummary({ born: 0, napping: 0, toDiscover: 0, news: NO_NEWS });
		const onWelcomeBackSaid = vi.fn();
		const widget = await render(BuddyWidget, {
			props: { returnAfterPause: true, onWelcomeBackSaid }
		});

		await widget.unmount();
		await new Promise((resolve) => setTimeout(resolve, 1500));
		expect(acknowledgements()).toHaveLength(0);
		expect(onWelcomeBackSaid).not.toHaveBeenCalled();
	});

	it('la bulle montrée, le retour est acquitté une fois auprès du serveur', async () => {
		mockSummary({ born: 0, napping: 0, toDiscover: 0, news: NO_NEWS });
		await render(BuddyWidget, { props: { returnAfterPause: true } });

		expect(acknowledgements()).toHaveLength(0);
		await vi.waitFor(() => expect(RETURN).toContain(bubbleText()), { timeout: 3000 });
		await vi.waitFor(() => expect(acknowledgements()).toHaveLength(1));
		expect(acknowledgements()[0]).toEqual([WELCOME_BACK_URL, { method: 'POST' }]);
	});

	it('sans retour : rien à acquitter, salutation habituelle', async () => {
		mockSummary({ born: 0, napping: 0, toDiscover: 0, news: NO_NEWS });
		await render(BuddyWidget, { props: {} });

		await new Promise((resolve) => setTimeout(resolve, 1500));
		expect(RETURN).not.toContain(bubbleText());
		expect(acknowledgements()).toHaveLength(0);
	});
});
