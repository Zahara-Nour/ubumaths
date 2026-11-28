/**
 * Éditeur de série (chantier `durees-trop-courtes`, PR 2) : chaque ligne
 * affiche sa durée ; la marque « Durée sans doute trop courte » n'apparaît qu'à
 * la durée signalée de la ligne.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

vi.mock('$app/navigation', async () =>
	(await import('#tests/helpers/app-navigation-mock.ts')).appNavigationMock({
		goto: vi.fn(async () => {})
	})
);
const { submitAction } = vi.hoisted(() => ({
	submitAction: vi.fn(async (_action: string, _form: FormData) => ({ ok: true }))
}));
vi.mock('#lib/utils/form-action.ts', () => ({ submitAction }));
vi.mock('#lib/stores/toaster.svelte.ts', () => ({
	toaster: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() }
}));

import Page from '../+page.svelte';
import type { DbSeries } from '#lib/types/evaluation.ts';
import type { DurationSignals, ObservedDurations } from '#lib/types/duration-signals.ts';

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
async function renderPage(
	durationSignals: DurationSignals | null,
	observedDurations: ObservedDurations | null = null
) {
	const main = document.body.appendChild(document.createElement('main'));
	return await render(Page, {
		target: main,
		props: {
			data: { series: SERIES, templates: TEMPLATES, durationSignals, observedDurations }
		} as never
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

describe('Éditeur de série — durée observée (A1)', () => {
	it('rien sans durée observée', async () => {
		const { container } = await renderPage(null, null);
		expect(container.querySelector('[data-duree-observee]')).toBeNull();
	});

	it('suggère la durée observée sous la ligne concernée ; « Appliquer » change la durée', async () => {
		const { container } = await renderPage(null, {
			[T1]: { seconds: 35, students: 8 },
			// Ligne à 20 s (0) : écart trop faible, rien
			[T2]: { seconds: 20, students: 6 }
		});
		const rows = container.querySelectorAll('li');
		const hint = rows[0].querySelector('[data-duree-observee]');
		expect(hint?.textContent?.replace(/\s+/g, ' ')).toContain('Durée observée : 35 s');
		expect(rows[1].querySelector('[data-duree-observee]')).toBeNull();

		const apply = hint?.querySelector('button');
		apply?.click();
		await vi.waitFor(() => {
			expect(rows[0].querySelector('[data-duree]')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
				'35 s'
			);
			// Appliquée : la suggestion disparaît
			expect(rows[0].querySelector('[data-duree-observee]')).toBeNull();
		});

		// Écrite à l'enregistrement : la ligne part à 35 s, l'autre inchangée
		(container.querySelector('button[type="submit"]') as HTMLButtonElement).click();
		await vi.waitFor(() => expect(submitAction).toHaveBeenCalled());
		const form = submitAction.mock.calls[0][1];
		expect(JSON.parse(String(form.get('items')))).toEqual([
			{ templateId: T1, quantity: 4, delay: 35 },
			{ templateId: T2, quantity: 2, delay: 0 }
		]);
	});
});
