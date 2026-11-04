/**
 * Éditeur de série (ADR 0035, Q7) : un modèle plus publié est signalé
 * « Modèle retiré » ; d'anciennes lignes sans modèle sont annoncées avant
 * qu'un enregistrement ne les retire.
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

// Constantes
const PUBLISHED_ID = '11111111-1111-4111-8111-111111111111';
const RETIRED_ID = '22222222-2222-4222-8222-222222222222';

// Functions
function series(overrides: Partial<DbSeries> = {}): DbSeries {
	return {
		id: 'serie',
		title: 'Tables de 7',
		description: null,
		grade: '6',
		items: [
			{ templateId: PUBLISHED_ID, quantity: 4, delay: 20 },
			{ templateId: RETIRED_ID, quantity: 2, delay: 20 }
		],
		created_by: 'prof',
		created_at: '2026-11-04T10:00:00Z',
		updated_at: '2026-11-04T10:00:00Z',
		...overrides
	};
}

async function renderPage(data: DbSeries) {
	const main = document.body.appendChild(document.createElement('main'));
	return await render(Page, {
		target: main,
		props: {
			data: { series: data, templates: [{ id: PUBLISHED_ID, title: 'Table de 7', level: 3 }] }
		} as never
	});
}

describe('Éditeur de série — modèle retiré', () => {
	it('modèle publié : son titre et son niveau ; modèle absent : « Modèle retiré »', async () => {
		const { container } = await renderPage(series());
		const rows = container.querySelectorAll('li');
		expect(rows).toHaveLength(2);
		expect(rows[0].textContent).toContain('Table de 7');
		expect(rows[0].textContent).toContain('niveau 3');
		expect(rows[1].querySelector('[data-modele-retire]')?.textContent).toContain('Modèle retiré');
	});

	it('anciennes lignes sans modèle : annoncées, accord au pluriel ; aucune : rien', async () => {
		const { container } = await renderPage(series({ unresolved_lines: 2 }));
		expect(container.querySelector('[data-lignes-perdues]')?.textContent?.trim()).toBe(
			"2 anciennes questions de cette série n'existent plus : l'enregistrer les retirera."
		);
		const sans = await renderPage(series({ unresolved_lines: 0 }));
		expect(sans.container.querySelector('[data-lignes-perdues]')).toBeNull();
	});
});
