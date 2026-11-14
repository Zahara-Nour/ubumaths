/**
 * Éditeur de série (chantier `durees-trop-courtes`, PR 2) : chaque ligne
 * affiche sa durée ; la marque « Durée sans doute trop courte » n'apparaît qu'à
 * la durée signalée de la ligne.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

vi.mock('$app/navigation', async (importOriginal) => ({
	...(await importOriginal<typeof import('$app/navigation')>()),
	goto: vi.fn(async () => {})
}));
vi.mock('$lib/stores/toaster.svelte', () => ({
	toaster: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }
}));

import Page from '../+page.svelte';
import type { DbSeries } from '$lib/types/evaluation';
import type { DurationSignals } from '$lib/types/duration-signals';

// Constantes
const T1 = '11111111-1111-4111-8111-111111111111';
const T2 = '22222222-2222-4222-8222-222222222222';
const SERIES: DbSeries = {
	id: 'serie',
	title: 'Tables de 7',
	description: null,
	grade: '6',
	items: [
		{ templateId: T1, quantity: 4, delay: 10 },
		{ templateId: T2, quantity: 2, delay: 0 }
	],
	created_by: 'prof',
	created_at: '2026-11-04T10:00:00Z',
	updated_at: '2026-11-04T10:00:00Z'
};
const TEMPLATES = [
	{ id: T1, title: 'Table de 7', level: 3 },
	{ id: T2, title: 'Table de 8', level: 3 }
];

// Functions
async function renderPage(durationSignals: DurationSignals | null) {
	const main = document.body.appendChild(document.createElement('main'));
	return await render(Page, {
		target: main,
		props: { data: { series: SERIES, templates: TEMPLATES, durationSignals } } as never
	});
}

describe('Éditeur de série — durées trop courtes', () => {
	it('affiche la durée de chaque ligne (0 = durée par défaut, 20 s)', async () => {
		const { container } = await renderPage(null);
		const durations = [...container.querySelectorAll('[data-duree]')].map((e) =>
			e.textContent?.replace(/\s+/g, ' ').trim()
		);
		expect(durations).toEqual(['10 s', '20 s']);
		expect(container.querySelector('[data-duree-trop-courte]')).toBeNull();
	});

	it('marque la ligne dont la durée est signalée, avec la phrase, sans nom', async () => {
		const { container } = await renderPage({
			[T1]: [
				{ delaySeconds: 10, students: 10, unansweredInTime: 7, tooShort: true },
				{ delaySeconds: 40, students: 8, unansweredInTime: 0, tooShort: false }
			],
			// Signalé à 10 s, mais la ligne est à 20 s : rien
			[T2]: [{ delaySeconds: 10, students: 6, unansweredInTime: 6, tooShort: true }]
		});
		const rows = container.querySelectorAll('li');
		const mark = rows[0].querySelector('[data-duree-trop-courte]');
		expect(mark?.textContent).toContain('Durée sans doute trop courte');
		expect(mark?.textContent).toContain("7 élèves sur 10 n'ont rien répondu dans les 10 s");
		expect(rows[1].querySelector('[data-duree-trop-courte]')).toBeNull();
	});
});
