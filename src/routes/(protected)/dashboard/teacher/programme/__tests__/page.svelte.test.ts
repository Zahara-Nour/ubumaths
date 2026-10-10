/**
 * Page Programme (prof) — consultation de la génération neuve (C5, étape 3).
 *
 * Comportements validés par David :
 *   1. branches > notions > points : code, libellé, sous-notion nommée ;
 *   3. renommer envoie le seul libellé ;
 *   4. archivés masqués, « Afficher les N points archivés » les montre ;
 *   7. niveau sans point : « Aucun point pour ce programme » ;
 *   11. plus aucun geste d'édition de l'arbre (créer, supprimer, déplacer).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import { tick } from 'svelte';

const invalidateAll = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('$app/navigation', async (importOriginal) => ({
	...(await importOriginal<typeof import('$app/navigation')>()),
	goto: vi.fn(async () => {}),
	invalidateAll
}));

const toaster = vi.hoisted(() => ({
	success: vi.fn(),
	error: vi.fn(),
	warning: vi.fn(),
	info: vi.fn()
}));
vi.mock('$lib/stores/toaster.svelte', () => ({ toaster }));

import Page from '../+page.svelte';
import type { ProgrammeBranch, ProgrammePointView } from '$lib/utils/programme-tree';

const POINT_ID = '11111111-1111-4111-8111-111111111111';

function point(
	id: string,
	code: string,
	name: string,
	extra: Partial<ProgrammePointView> = {}
): ProgrammePointView {
	return {
		id,
		code,
		name,
		display_order: 1,
		rubrique: null,
		archived_at: null,
		node_id: 'n',
		grade: '5',
		subnotionName: null,
		subnotionArchived: false,
		...extra
	};
}

const TREE: ProgrammeBranch[] = [
	{
		id: 'b-geo',
		name: 'Géométrie',
		archived: false,
		notions: [
			{
				id: 'n-tri',
				name: 'Triangles',
				archived: false,
				points: [
					point(POINT_ID, '5-010', 'Construire un triangle'),
					point('p-arch', '5-011', 'Point retiré', { archived_at: '2026-10-10T00:00:00Z' })
				]
			}
		]
	},
	{
		id: 'b-nombres',
		name: 'Nombres et calculs',
		archived: false,
		notions: [
			{
				id: 'n-frac',
				name: 'Fractions',
				archived: false,
				points: [
					point('p-sub', '5-020', 'Simplifier une fraction', { subnotionName: 'simplifier' })
				]
			}
		]
	}
];

async function renderPage(tree: ProgrammeBranch[]) {
	const main = document.body.appendChild(document.createElement('main'));
	return await render(Page, {
		target: main,
		props: {
			data: { grade: '5', gradeOptions: [{ value: '5', label: '5e' }], tree }
		} as never
	});
}

/** Déplie branches puis notions (repliées par défaut). */
async function expandAll(container: HTMLElement) {
	const selector = 'button[data-tree-toggle][aria-expanded="false"]';
	for (let pass = 0; pass < 2; pass++) {
		for (const button of Array.from(container.querySelectorAll<HTMLButtonElement>(selector))) {
			button.click();
		}
		await tick();
	}
	expect(container.querySelectorAll(selector)).toHaveLength(0);
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
	fetchMock = vi.fn(async () => new Response(JSON.stringify({ point: {} }), { status: 200 }));
	vi.stubGlobal('fetch', fetchMock);
	invalidateAll.mockClear();
});

afterEach(() => {
	vi.unstubAllGlobals();
	document.body.innerHTML = '';
});

describe('Page Programme', () => {
	it('affiche branches, notions et points avec code et sous-notion', async () => {
		const { container } = await renderPage(TREE);
		await expandAll(container);
		const text = container.textContent ?? '';

		expect(text.indexOf('Géométrie')).toBeLessThan(text.indexOf('Nombres et calculs'));
		expect(text).toContain('Triangles');
		expect(text).toContain('Fractions');
		expect(text).toContain('5-010');
		expect(text).toContain('Construire un triangle');
		expect(text).toContain('simplifier');
	});

	it('masque les archivés, et la case « Afficher les N points archivés » les montre', async () => {
		const { container } = await renderPage(TREE);
		await expandAll(container);
		expect(container.textContent).toContain('Construire un triangle');
		expect(container.textContent).not.toContain('Point retiré');

		const box = page.getByRole('checkbox', { name: 'Afficher le point archivé' });
		await box.click();
		await expect.element(page.getByText('Point retiré')).toBeVisible();
	});

	it('niveau sans point : « Aucun point pour ce programme »', async () => {
		await renderPage([]);
		await expect.element(page.getByText('Aucun point pour ce programme')).toBeVisible();
	});

	it('ne propose plus aucun geste d’édition de l’arbre', async () => {
		const { container } = await renderPage(TREE);
		await expandAll(container);
		const labels = Array.from(container.querySelectorAll('button')).map(
			(b) => `${b.textContent ?? ''} ${b.getAttribute('aria-label') ?? ''}`
		);
		for (const forbidden of [/Supprimer/, /Monter/, /Descendre/, /Thème/, /Objectif/, /Ajouter/]) {
			expect(labels.some((l) => forbidden.test(l))).toBe(false);
		}
		expect(container.querySelector('[draggable="true"]')).toBeNull();
	});

	it('renommer envoie le seul libellé au PATCH du point', async () => {
		const { container } = await renderPage(TREE);
		await expandAll(container);
		await page.getByRole('button', { name: 'Renommer « Construire un triangle »' }).click();
		const input = page.getByLabelText('Libellé');
		await input.fill('Construire un triangle quelconque');
		await page.getByRole('button', { name: 'Enregistrer' }).click();

		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe(`/api/teacher/curriculum/points/${POINT_ID}`);
		expect(init.method).toBe('PATCH');
		expect(JSON.parse(String(init.body))).toEqual({ name: 'Construire un triangle quelconque' });
	});

	it('archiver envoie { archived: true }', async () => {
		const { container } = await renderPage(TREE);
		await expandAll(container);
		await page.getByRole('button', { name: 'Archiver « Construire un triangle »' }).click();

		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
		const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(JSON.parse(String(init.body))).toEqual({ archived: true });
	});

	it('accorde les compteurs : « 1 notion » / « 2 notions », « 1 point » / « 2 points »', async () => {
		const { container } = await renderPage(TREE);
		const text = container.textContent ?? '';
		expect(text).toContain('1 notion · 1 point');
		expect(text).not.toContain('1 notions');
		expect(text).not.toContain('1 points');

		const two: ProgrammeBranch[] = [
			{
				...TREE[1],
				notions: [
					TREE[1].notions[0],
					{ ...TREE[0].notions[0], id: 'n-autre', points: TREE[0].notions[0].points.slice(0, 1) }
				]
			}
		];
		document.body.innerHTML = '';
		const second = await renderPage(two);
		expect(second.container.textContent).toContain('2 notions · 2 points');
	});

	it('pluriel de la case : « Afficher les 2 points archivés »', async () => {
		const tree: ProgrammeBranch[] = [
			{
				...TREE[0],
				notions: [
					{
						...TREE[0].notions[0],
						points: [
							...TREE[0].notions[0].points,
							point('p-arch2', '5-012', 'Autre retiré', { archived_at: '2026-10-10T00:00:00Z' })
						]
					}
				]
			}
		];
		await renderPage(tree);
		await expect
			.element(page.getByRole('checkbox', { name: 'Afficher les 2 points archivés' }))
			.toBeVisible();
	});

	it('tous les points archivés, case décochée : « Aucun point actif pour ce programme »', async () => {
		const tree: ProgrammeBranch[] = [
			{
				...TREE[0],
				notions: [{ ...TREE[0].notions[0], points: [TREE[0].notions[0].points[1]] }]
			}
		];
		const { container } = await renderPage(tree);
		await expect.element(page.getByText('Aucun point actif pour ce programme')).toBeVisible();
		expect(container.textContent).not.toContain('Aucun point pour ce programme');
	});

	it('restaurer un point archivé envoie { archived: false }', async () => {
		const { container } = await renderPage(TREE);
		await page.getByRole('checkbox', { name: 'Afficher le point archivé' }).click();
		await expandAll(container);
		await page.getByRole('button', { name: 'Restaurer « Point retiré »' }).click();

		await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe('/api/teacher/curriculum/points/p-arch');
		expect(JSON.parse(String(init.body))).toEqual({ archived: false });
	});

	it('marque « archivée » une branche, une notion ou une sous-notion archivée', async () => {
		const tree: ProgrammeBranch[] = [
			{
				...TREE[1],
				archived: true,
				notions: [
					{
						...TREE[1].notions[0],
						archived: true,
						points: [{ ...TREE[1].notions[0].points[0], subnotionArchived: true }]
					}
				]
			},
			TREE[0]
		];
		const { container } = await renderPage(tree);
		await expandAll(container);
		expect(container.querySelectorAll('[data-node-archived]')).toHaveLength(3);
	});
});
