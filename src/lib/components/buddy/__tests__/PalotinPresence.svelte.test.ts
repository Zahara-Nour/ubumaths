/**
 * Où et quand le Palotin se montre (chantier `palotins`)
 * =======================================================
 *
 * Ce que l'élève VOIT, page par page (docs/wip/palotins-progress.md) :
 *   - maison (accueil, Chatterie) : le Palotin, toujours là ;
 *   - passage (reste de l'espace élève) : l'écusson ; le Palotin entre pour les
 *     passages importants (retour, nouveautés) et, au plus un toutes les
 *     10 minutes, pour les spontanés (sieste, Constance perdue) ;
 *   - séance : l'écusson seul, aucun passage ;
 *   - ailleurs : rien, et rien n'est demandé au serveur.
 * Sans Palotin : le quiz de choix, sur l'accueil seulement.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PalotinPresence from '../PalotinPresence.svelte';
import { LAST_PASSAGE_KEY } from '../palotin-presence';
import { studentCache } from '$lib/stores/studentDashboardCache.svelte';
import { buddyMessages } from '$lib/config/buddy-messages';
import type { BuddyState } from '$lib/types/buddy';
import { NO_NEWS, newsSummaryPhrase, type MathouNews } from '$lib/mathoux/news';

// Page courante simulée
const pageState = vi.hoisted(() => ({ url: new URL('http://localhost:5175/dashboard') }));
vi.mock('$app/state', () => ({ page: pageState }));
vi.mock('$app/navigation', () => ({
	afterNavigate: vi.fn(),
	goto: vi.fn(),
	invalidateAll: vi.fn()
}));

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
const NAPPING = '2 Mathoux font la sieste.';
const NEWS: MathouNews = {
	firstVisit: false,
	total: 1,
	items: [
		{
			kind: 'birth',
			notionId: 'notion-1',
			name: 'le Mathou des fractions',
			raceIndex: 0,
			stage: 'chaton',
			newStars: []
		}
	]
};
const PRESENCE_URL = '/api/student/buddy/presence';
const MATHOUX_URL = '/api/student/mathoux';
const WELCOME_BACK_URL = '/api/student/buddy/welcome-back';

// Functions
interface ServerState {
	presence?: { buddy: BuddyState | null; streakLost: boolean; longAbsence: boolean } | 'panne';
	napping?: number;
	news?: MathouNews;
}

/** Serveur simulé, réponse selon l'adresse demandée. */
function mockServer({ presence, napping = 0, news = NO_NEWS }: ServerState) {
	const presenceBody = presence ?? { buddy, streakLost: false, longAbsence: false };
	vi.stubGlobal(
		'fetch',
		vi.fn((url: string) => {
			if (url === PRESENCE_URL) {
				if (presenceBody === 'panne') return Promise.reject(new Error('panne'));
				return Promise.resolve({ ok: true, json: () => Promise.resolve(presenceBody) });
			}
			if (url === MATHOUX_URL) {
				const body = { born: 2, napping, toDiscover: 0, news };
				return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
			}
			return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
		})
	);
}

function calls(url: string): unknown[][] {
	return vi.mocked(fetch).mock.calls.filter(([called]) => called === url);
}

function at(pathname: string) {
	pageState.url = new URL(`http://localhost:5175${pathname}`);
}

function bubbleText(): string {
	return document.querySelector('[data-buddy-bubble]')?.textContent?.trim() ?? '';
}

function badge(): Element | null {
	return document.querySelector('[data-testid="palotin-badge"]');
}

function avatarButton(): Element | null {
	return document.querySelector('button[aria-label^="Mon Palotin"]');
}

/** Laisse passer les lectures et les effets. */
async function settle(ms = 300) {
	await new Promise((resolve) => setTimeout(resolve, ms));
}

beforeEach(() => {
	at('/dashboard/student/devoirs');
	studentCache.hydrateBuddy(null);
	localStorage.removeItem(LAST_PASSAGE_KEY);
});

afterEach(() => {
	vi.unstubAllGlobals();
	studentCache.hydrateBuddy(null);
	localStorage.removeItem(LAST_PASSAGE_KEY);
});

describe('PalotinPresence — pages de passage', () => {
	it('rien à dire : l’écusson seul, le Palotin n’est pas là', async () => {
		mockServer({});
		await render(PalotinPresence);

		await vi.waitFor(() => expect(badge()).not.toBeNull());
		expect(badge()?.getAttribute('data-palotin')).toBe('pile');
		await settle();
		expect(avatarButton()).toBeNull();
		expect(bubbleText()).toBe('');
	});

	it('retour d’absence : il entre, dit « tu m’as manqué », l’acquitte, puis repart', async () => {
		mockServer({ presence: { buddy, streakLost: true, longAbsence: true } });
		await render(PalotinPresence);

		await vi.waitFor(() => expect(MISSED).toContain(bubbleText()), { timeout: 3000 });
		expect(avatarButton()).not.toBeNull();
		expect(badge()).toBeNull();
		await vi.waitFor(() => expect(calls(WELCOME_BACK_URL)).toHaveLength(1));
		// La Constance perdue n'a pas sa réplique : « tu m'as manqué » la remplace
		await vi.waitFor(() => expect(badge()).not.toBeNull(), { timeout: 8000 });
		expect(STREAK_LOST).not.toContain(bubbleText());
	}, 12_000);

	it('nouveautés de la Chatterie : passage avec le lien, même juste après un autre passage', async () => {
		localStorage.setItem(LAST_PASSAGE_KEY, String(Date.now()));
		mockServer({ news: NEWS });
		await render(PalotinPresence);

		const phrase = newsSummaryPhrase(NEWS) ?? '';
		await vi.waitFor(() => expect(bubbleText()).toContain(phrase), { timeout: 3000 });
		expect(document.querySelector('a[href$="/dashboard/student/chatterie"]')).not.toBeNull();
	});

	it('Mathoux en sieste : passage spontané, puis plus rien avant 10 minutes', async () => {
		mockServer({ napping: 2 });
		const first = await render(PalotinPresence);
		await vi.waitFor(() => expect(bubbleText().startsWith(NAPPING)).toBe(true), {
			timeout: 3000
		});
		expect(Number(localStorage.getItem(LAST_PASSAGE_KEY))).toBeGreaterThan(0);
		await first.unmount();

		// Nouvel onglet, même navigateur : le plafond tient
		mockServer({ napping: 2, presence: { buddy, streakLost: true, longAbsence: false } });
		await render(PalotinPresence);
		await vi.waitFor(() => expect(badge()).not.toBeNull());
		await settle(800);
		expect(bubbleText()).toBe('');
		expect(avatarButton()).toBeNull();
	});

	it('Constance perdue : passage spontané si le plafond le permet', async () => {
		mockServer({ presence: { buddy, streakLost: true, longAbsence: false } });
		await render(PalotinPresence);

		await vi.waitFor(() => expect(STREAK_LOST).toContain(bubbleText()), { timeout: 3000 });
	});

	it('clic sur l’écusson : le Palotin entre avec son état', async () => {
		mockServer({});
		await render(PalotinPresence);
		await vi.waitFor(() => expect(badge()).not.toBeNull());

		const badgeButton = badge()?.closest('button');
		expect(badgeButton).not.toBeNull();
		badgeButton?.click();
		await vi.waitFor(() => expect(avatarButton()).not.toBeNull());
		expect(document.querySelector('h3')?.textContent).toContain('Pile');
	});

	it('lecture du Palotin en échec : rien, et la page n’est pas bloquée', async () => {
		mockServer({ presence: 'panne' });
		await render(PalotinPresence);
		await settle();
		expect(badge()).toBeNull();
		expect(avatarButton()).toBeNull();
	});
});

describe('PalotinPresence — séances', () => {
	it('Entraînement : l’écusson seul, aucun passage, la Chatterie n’est pas lue', async () => {
		at('/automaths/test');
		mockServer({ napping: 2, presence: { buddy, streakLost: true, longAbsence: true } });
		await render(PalotinPresence);

		await vi.waitFor(() => expect(badge()).not.toBeNull());
		await settle(1500);
		expect(bubbleText()).toBe('');
		expect(avatarButton()).toBeNull();
		expect(calls(MATHOUX_URL)).toHaveLength(0);
		expect(calls(WELCOME_BACK_URL)).toHaveLength(0);
	});
});

describe('PalotinPresence — maison et ailleurs', () => {
	it('accueil : le Palotin est là, sans écusson', async () => {
		at('/dashboard');
		mockServer({});
		await render(PalotinPresence);

		await vi.waitFor(() => expect(avatarButton()).not.toBeNull());
		expect(badge()).toBeNull();
	});

	it('page hors de l’espace élève : rien, et rien n’est demandé au serveur', async () => {
		at('/shtam');
		mockServer({});
		await render(PalotinPresence);
		await settle();

		expect(badge()).toBeNull();
		expect(avatarButton()).toBeNull();
		expect(vi.mocked(fetch)).not.toHaveBeenCalled();
	});

	it('sans Palotin, sur l’accueil : le quiz de choix s’ouvre', async () => {
		at('/dashboard');
		mockServer({ presence: { buddy: null, streakLost: false, longAbsence: false } });
		await render(PalotinPresence);

		await vi.waitFor(() => expect(document.body.textContent).toContain('Choisis ton Palotin !'));
	});

	it('sans Palotin, ailleurs : ni quiz ni écusson', async () => {
		mockServer({ presence: { buddy: null, streakLost: false, longAbsence: false } });
		await render(PalotinPresence);
		await settle();

		expect(document.body.textContent).not.toContain('Choisis ton Palotin !');
		expect(badge()).toBeNull();
	});
});
