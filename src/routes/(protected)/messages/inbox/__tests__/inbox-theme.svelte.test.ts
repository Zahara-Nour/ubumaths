/**
 * Boîte de réception (vue aussi par les élèves) en mode sombre : bordure et fond des
 * éléments principaux sur les tokens `--color-*`, et anneau de focus clavier visible.
 * Avant : `outline: 2px solid hsl(var(--primary))` — `--primary` n'existe plus depuis
 * le 2025-10-11 (c36a80754), la déclaration était jetée en silence et le message
 * focalisé au clavier n'avait plus son anneau orange. On lit la couleur RENDUE.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { PrivateMessage } from '$lib/stores/privateMessages.svelte';

const goto = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('$app/navigation', async (importOriginal) => ({
	...(await importOriginal<typeof import('$app/navigation')>()),
	goto
}));

const store = vi.hoisted(() => ({
	inbox: [] as PrivateMessage[],
	isLoading: false,
	loadInbox: vi.fn(async () => {}),
	toggleStar: vi.fn(async () => {}),
	toggleRead: vi.fn(async () => {}),
	updateStatus: vi.fn(async () => {}),
	deleteMessage: vi.fn(async () => {})
}));
vi.mock('$lib/stores/privateMessages.svelte', () => ({ privateMessages: store }));

import Page from '../+page.svelte';

// Valeurs sombres des tokens (src/app.css)
const DARK = {
	card: 'rgb(47, 47, 47)', // --color-card
	border: 'rgb(61, 61, 58)', // --color-border
	muted: 'rgb(51, 51, 49)', // --color-muted
	primary: 'rgb(255, 196, 0)' // --color-primary
};
const TRANSPARENT = 'rgba(0, 0, 0, 0)';
const BLACK = 'rgb(0, 0, 0)';

function message(overrides: Partial<PrivateMessage>): PrivateMessage {
	return {
		id: 'm1',
		message_id: 'm1',
		sender_id: 'u1',
		sender_name: 'Mme Prof',
		sender_avatar_url: null,
		subject: 'Devoir de lundi',
		content: null,
		plain_text: 'Pensez à la fiche',
		sent_at: '2026-10-01T10:00:00Z',
		read_at: null,
		is_starred: false,
		status: 'inbox',
		is_group_message: false,
		recipient_count: 1,
		has_attachments: false,
		attachment_count: 0,
		parent_message_id: null,
		thread_root_id: null,
		...overrides
	};
}

let mains: HTMLElement[] = [];
afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
	const root = document.documentElement;
	root.style.colorScheme = '';
	root.classList.remove('dark');
});

async function renderDark() {
	// Décor de mode-watcher : `color-scheme` (tokens light-dark()) ET classe `.dark`
	const root = document.documentElement;
	root.style.colorScheme = 'dark';
	root.classList.add('dark');
	store.inbox = [message({ id: 'm1', message_id: 'm1' })];
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	const screen = await render(Page, { target: main });
	return screen.container;
}

function one(container: Element, selector: string): HTMLElement {
	const el = container.querySelector<HTMLElement>(selector);
	if (!el) throw new Error(`aucun élément ${selector}`);
	return el;
}

function expectRealColor(value: string, expected: string) {
	expect(value).not.toBe(TRANSPARENT);
	expect(value).not.toBe(BLACK);
	expect(value).toBe(expected);
}

describe('Boîte de réception en mode sombre', () => {
	it('en-tête : fond carte et bordure du thème sombre', async () => {
		const c = await renderDark();
		const header = getComputedStyle(one(c, 'div.border-b.bg-card'));
		expectRealColor(header.backgroundColor, DARK.card);
		expectRealColor(header.borderBottomColor, DARK.border);
	});

	it('message non lu : fond atténué du thème sombre', async () => {
		const c = await renderDark();
		const row = one(c, '.divide-y > button');
		expectRealColor(getComputedStyle(row).backgroundColor, DARK.muted);
	});

	it('message focalisé au clavier : anneau de focus primaire, pas absent', async () => {
		const c = await renderDark();
		const row = one(c, '.divide-y > button');
		row.focus({ focusVisible: true } as FocusOptions);
		expect(row.matches(':focus-visible')).toBe(true);
		// `transition-colors` anime aussi `outline-color` : lire la couleur une fois arrivée
		await Promise.all(row.getAnimations().map((a) => a.finished));
		const style = getComputedStyle(row);
		expect(style.outlineStyle).toBe('solid');
		expect(style.outlineWidth).toBe('2px');
		expectRealColor(style.outlineColor, DARK.primary);
	});
});
