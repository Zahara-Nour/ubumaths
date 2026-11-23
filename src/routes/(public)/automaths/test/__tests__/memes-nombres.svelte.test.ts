/**
 * « Mêmes nombres pour tous » (chantier memes-nombres) : un lien de série qui porte
 * une graine donne les mêmes questions à tous ceux qui l'ouvrent.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tick } from 'svelte';
import { render } from 'vitest-browser-svelte';
import { SERIES_SEED_PARAM, SERIES_LINK_PARAM, encodeSeriesParam } from '#lib/validation/series.ts';
import { questionTemplatesCache } from '#lib/stores/questionTemplates.svelte.ts';

const goto = vi.hoisted(() => vi.fn(async () => {}));
const url = vi.hoisted(() => ({ current: new URL('http://localhost/automaths/test') }));
vi.mock('$app/state', () => ({
	page: {
		get url() {
			return url.current;
		}
	}
}));
vi.mock('$app/navigation', async () =>
	(await import('#tests/helpers/app-navigation-mock.ts')).appNavigationMock({ goto })
);

import Page from '../+page.svelte';

const TEMPLATE_ID = '11111111-1111-4111-8111-111111111111';

/** Un modèle qui tire vraiment ses nombres (6 chiffres : deux tirages ne se confondent pas) */
const TEMPLATE = {
	id: TEMPLATE_ID,
	title: 'Nombre tiré',
	level: 1,
	grades: ['6'],
	status: 'published',
	variations: [
		{
			statement: 'Nombre tiré : {{x}} [_]',
			variables: [{ name: 'x', expression: '{{random:100000..999999}}' }],
			blanks: [{ expectedAnswer: '{{x}}' }]
		}
	]
};

async function seedTemplatesCache() {
	questionTemplatesCache.clear();
	vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ templates: [TEMPLATE] })));
	await questionTemplatesCache.fetchTemplates();
	vi.unstubAllGlobals();
}

/** Ouvre le lien, et rend les nombres affichés, dans l'ordre */
/** Contrôle blanc, Course aux nombres : passe la page d'attente (« C'est parti ! ») */
async function startSeries(main: HTMLElement) {
	const start = () =>
		[...main.querySelectorAll('button')].find((b) => b.textContent?.trim() === "C'est parti !");
	await vi.waitFor(() => expect(start()).toBeDefined());
	start()!.click();
	await tick();
}

async function numbersShown(query: Record<string, string>): Promise<string[]> {
	url.current = new URL(`http://localhost/automaths/test?${new URLSearchParams(query)}`);
	await seedTemplatesCache();
	const main = document.body.appendChild(document.createElement('main'));
	const screen = await render(Page, { target: main, props: { data: { user: null } } as never });
	if (query.mode === 'interactive' || query.mode === 'course') await startSeries(main);
	let numbers: string[] = [];
	await vi.waitFor(() => {
		numbers = [...(main.textContent ?? '').matchAll(/Nombre tiré : (\d{6})/g)].map((m) => m[1]);
		expect(numbers.length).toBeGreaterThan(0);
	});
	await screen.unmount();
	main.remove();
	return numbers;
}

function link(extra: Record<string, string> = {}): Record<string, string> {
	return {
		[SERIES_LINK_PARAM]: encodeSeriesParam([{ templateId: TEMPLATE_ID, quantity: 3, delay: 20 }]),
		mode: 'interactive',
		...extra
	};
}

describe('« Mêmes nombres pour tous » : deux élèves ouvrent le même lien', () => {
	beforeEach(() => {
		goto.mockClear();
	});

	it('même graine : les mêmes nombres, à l’affichage', async () => {
		const eleve1 = await numbersShown(link({ [SERIES_SEED_PARAM]: '123456' }));
		const eleve2 = await numbersShown(link({ [SERIES_SEED_PARAM]: '123456' }));

		expect(eleve2).toEqual(eleve1);
	});

	it('graines différentes : d’autres nombres', async () => {
		const a = await numbersShown(link({ [SERIES_SEED_PARAM]: '1' }));
		const b = await numbersShown(link({ [SERIES_SEED_PARAM]: '2' }));

		expect(b).not.toEqual(a);
	});

	it('sans graine : des nombres au hasard (comme avant)', async () => {
		const a = await numbersShown(link());
		const b = await numbersShown(link());

		expect(b).not.toEqual(a);
	});
});

describe('« Mêmes nombres pour tous » : Recommencer', () => {
	function button(main: HTMLElement, label: string): HTMLButtonElement | undefined {
		return [...main.querySelectorAll<HTMLButtonElement>('button')].find(
			(b) => b.getAttribute('aria-label') === label || b.textContent?.trim() === label
		);
	}

	async function click(main: HTMLElement, label: string) {
		await vi.waitFor(() => expect(button(main, label)).toBeDefined());
		button(main, label)!.click();
		await tick();
	}

	function shown(main: HTMLElement): string {
		return main.textContent?.match(/Nombre tiré : (\d{6})/)?.[1] ?? '';
	}

	/** Flash-cards, une carte : la joue, puis clique le bouton de fin donné */
	async function playThenRestart(query: Record<string, string>, restartLabel: string) {
		url.current = new URL(`http://localhost/automaths/test?${new URLSearchParams(query)}`);
		await seedTemplatesCache();
		const main = document.body.appendChild(document.createElement('main'));
		const screen = await render(Page, { target: main, props: { data: { user: null } } as never });
		await vi.waitFor(() => expect(shown(main)).not.toBe(''));
		const before = shown(main);

		await click(main, 'Voir la correction');
		await click(main, 'Réussi');
		await click(main, restartLabel);
		await vi.waitFor(() => expect(button(main, 'Voir la correction')).toBeDefined());
		const after = shown(main);

		await screen.unmount();
		main.remove();
		return { before, after };
	}

	function flashLink(extra: Record<string, string> = {}): Record<string, string> {
		return {
			[SERIES_LINK_PARAM]: encodeSeriesParam([{ templateId: TEMPLATE_ID, quantity: 1, delay: 20 }]),
			mode: 'flash',
			...extra
		};
	}

	it('avec une graine : « Recommencer les mêmes questions » redonne les mêmes nombres', async () => {
		const { before, after } = await playThenRestart(
			flashLink({ [SERIES_SEED_PARAM]: '123456' }),
			'Recommencer les mêmes questions'
		);

		expect(after).toBe(before);
	});

	it('sans graine : « Recommencer avec de nouvelles questions » tire d’autres nombres', async () => {
		const { before, after } = await playThenRestart(
			flashLink(),
			'Recommencer avec de nouvelles questions'
		);

		expect(after).not.toBe(before);
	});
	/** Course aux nombres, une question : « Terminer » (sans répondre), puis le bouton de fin */
	async function raceThenRestart(query: Record<string, string>, restartLabel: string) {
		const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
		url.current = new URL(`http://localhost/automaths/test?${new URLSearchParams(query)}`);
		await seedTemplatesCache();
		const main = document.body.appendChild(document.createElement('main'));
		const screen = await render(Page, { target: main, props: { data: { user: null } } as never });
		await startSeries(main);
		await vi.waitFor(() => expect(shown(main)).not.toBe(''));
		const before = shown(main);

		await click(main, 'Terminer');
		await click(main, restartLabel);
		// « Recommencer » ramène à la page d'attente
		await startSeries(main);
		await vi.waitFor(() => expect(button(main, 'Terminer')).toBeDefined());
		const after = shown(main);

		await screen.unmount();
		main.remove();
		confirmSpy.mockRestore();
		return { before, after };
	}

	function courseLink(extra: Record<string, string> = {}): Record<string, string> {
		return {
			[SERIES_LINK_PARAM]: encodeSeriesParam([{ templateId: TEMPLATE_ID, quantity: 1, delay: 20 }]),
			mode: 'course',
			time: '300',
			...extra
		};
	}

	it('Course aux nombres, sans graine : « Recommencer avec de nouvelles questions » tire d’autres nombres', async () => {
		const { before, after } = await raceThenRestart(
			courseLink(),
			'Recommencer avec de nouvelles questions'
		);

		expect(after).not.toBe(before);
	});

	it('Course aux nombres, avec une graine : « Recommencer les mêmes questions » redonne les mêmes', async () => {
		const { before, after } = await raceThenRestart(
			courseLink({ [SERIES_SEED_PARAM]: '123456' }),
			'Recommencer les mêmes questions'
		);

		expect(after).toBe(before);
	});
});
