/**
 * Carte du programme — comportements validés par David (2026-10-23) :
 *   - tout l'arbre, nœuds sans point grisés, compteurs « N att. · M approf. » ;
 *   - au départ ouvert jusqu'aux sous-notions, points repliés ; clic sur une
 *     sous-notion ou sur « N points sur la notion » : ses points ;
 *   - approfondissements distingués des attendus ;
 *   - « Masquer les nœuds vides », « Tout déplier », « Tout replier » ;
 *   - niveau sans point : « Aucun point pour ce programme ».
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { tick } from 'svelte';

import ProgrammeMap from '../ProgrammeMap.svelte';
import { buildProgrammeMap, type MapPointRow } from '$lib/utils/programme-map';
import type { ClassificationNode } from '$lib/types/database-helpers';

const STAMP = '2026-10-23T00:00:00Z';

function node(
	id: string,
	kind: ClassificationNode['kind'],
	name: string,
	parent_id: string | null,
	position = 0
): ClassificationNode {
	return {
		id,
		kind,
		name,
		parent_id,
		position,
		archived_at: null,
		created_at: STAMP,
		updated_at: STAMP
	};
}

function point(
	id: string,
	node_id: string,
	display_order: number,
	extra: Partial<MapPointRow> = {}
): MapPointRow {
	return {
		id,
		code: `2-${id}`,
		name: `Point ${id}`,
		display_order,
		archived_at: null,
		node_id,
		grade: '2',
		exigence: 'attendu',
		...extra
	};
}

const NODES = [
	node('b-fo', 'branch', 'Fonctions', null, 0),
	node('b-lo', 'branch', 'Logique', null, 1),
	node('n-ref', 'notion', 'Fonctions de référence', 'b-fo', 0),
	node('n-var', 'notion', 'Variations', 'b-fo', 1),
	node('s-carre', 'subnotion', 'fonction carré', 'n-ref', 0),
	node('s-inv', 'subnotion', 'fonction inverse', 'n-ref', 1)
];

const POINTS = [
	point('1', 's-carre', 1, { name: 'Courbe de la fonction carré' }),
	point('2', 's-carre', 2, { name: 'Démontrer la parité', exigence: 'approfondissement' }),
	point('3', 'n-ref', 3, { name: 'Point posé sur la notion' })
];

async function renderMap(points = POINTS) {
	const main = document.body.appendChild(document.createElement('main'));
	return await render(ProgrammeMap, {
		target: main,
		props: { map: buildProgrammeMap(points, NODES) }
	});
}

function box(container: HTMLElement, id: string): HTMLElement {
	const el = container.querySelector<HTMLElement>(`[data-box="${id}"]`);
	if (!el) throw new Error(`boîte ${id} absente`);
	return el;
}

const codes = (container: HTMLElement) =>
	Array.from(container.querySelectorAll('[data-map-point]')).map((el) =>
		el.getAttribute('data-map-point')
	);

afterEach(() => {
	document.body.innerHTML = '';
});

describe('ProgrammeMap', () => {
	it('montre tout l’arbre jusqu’aux sous-notions, les nœuds vides grisés', async () => {
		const { container } = await renderMap();

		for (const id of ['b-fo', 'b-lo', 'n-ref', 'n-var', 's-carre', 's-inv']) box(container, id);
		expect(box(container, 'b-lo').classList).toContain('empty');
		expect(box(container, 'n-var').classList).toContain('empty');
		expect(box(container, 's-inv').classList).toContain('empty');
		expect(box(container, 's-carre').classList).not.toContain('empty');
		expect(box(container, 'b-fo').textContent).toContain('2 att. · 1 approf.');
		expect(box(container, 's-inv').textContent).toContain('aucun point');
		// Points repliés au départ.
		expect(codes(container)).toEqual([]);
	});

	it('un clic sur la sous-notion montre ses points, approfondissement distingué', async () => {
		const { container } = await renderMap();
		box(container, 's-carre').click();
		await tick();

		expect(codes(container)).toEqual(['2-1', '2-2']);
		const approf = container.querySelector('[data-map-point="2-2"]');
		expect(approf?.getAttribute('data-exigence')).toBe('approfondissement');
		expect(approf?.textContent).toContain('approfondissement');
		expect(container.querySelector('[data-map-point="2-1"]')?.textContent).not.toContain(
			'approfondissement'
		);
	});

	it('« 1 point sur la notion » montre les points posés sur la notion', async () => {
		const { container } = await renderMap();
		const pill = box(container, 'pts-n-ref');
		expect(pill.textContent).toContain('1 point sur la notion');
		pill.click();
		await tick();
		expect(codes(container)).toEqual(['2-3']);
	});

	it('un clic sur une notion plie ses sous-notions', async () => {
		const { container } = await renderMap();
		box(container, 'n-ref').click();
		await tick();
		expect(container.querySelector('[data-box="s-carre"]')).toBeNull();
		// Les points posés sur la notion restent accessibles.
		box(container, 'pts-n-ref');
	});

	it('« Masquer les nœuds vides » retire les nœuds sans point', async () => {
		const { container } = await renderMap();
		const checkbox = Array.from(
			container.querySelectorAll<HTMLElement>('[role="checkbox"], input[type="checkbox"]')
		)[0];
		checkbox.click();
		await tick();

		expect(container.querySelector('[data-box="b-lo"]')).toBeNull();
		expect(container.querySelector('[data-box="n-var"]')).toBeNull();
		expect(container.querySelector('[data-box="s-inv"]')).toBeNull();
		box(container, 's-carre');
	});

	it('« Tout déplier » montre tous les points, « Tout replier » ne garde que les branches', async () => {
		const { container } = await renderMap();
		const button = (label: string) =>
			Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.trim() === label);

		button('Tout déplier')?.click();
		await tick();
		expect(codes(container)).toEqual(['2-3', '2-1', '2-2']);

		button('Tout replier')?.click();
		await tick();
		expect(codes(container)).toEqual([]);
		expect(container.querySelector('[data-box="n-ref"]')).toBeNull();
		box(container, 'b-fo');
	});

	it('trace une courbe vers chaque boîte visible', async () => {
		const { container } = await renderMap();
		const linked = container.querySelectorAll('#carte-b-fo [data-parent]').length;
		expect(linked).toBeGreaterThan(0);
		await expect
			.poll(() => container.querySelectorAll('#carte-b-fo path.map-link').length)
			.toBe(linked);
	});

	it('niveau sans point : arbre grisé et « Aucun point pour ce programme »', async () => {
		const { container } = await renderMap([]);
		expect(container.textContent).toContain('Aucun point pour ce programme');
		expect(box(container, 'b-fo').classList).toContain('empty');
	});
});
