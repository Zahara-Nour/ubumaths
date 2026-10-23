/**
 * Page Programme — chargement serveur, choix de la vue (2026-10-23).
 *
 *   - ?vue=carte lit la carte (arbre complet), pas la liste ;
 *   - sans ?vue=, ou avec une valeur inconnue : la liste, comme avant ;
 *   - seule la vue demandée est lue.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/middleware/auth', () => ({ requireRoles: async () => ({}) }));

const getProgrammeTree = vi.hoisted(() => vi.fn(async () => [{ id: 'liste' }]));
const getProgrammeMap = vi.hoisted(() => vi.fn(async () => [{ id: 'carte' }]));
vi.mock('$lib/server/programme-tree', () => ({ getProgrammeTree, getProgrammeMap }));

import { load } from '../+page.server';

type LoadEvent = Parameters<typeof load>[0];

async function loadAt(search: string) {
	const event = {
		locals: { supabase: {} },
		url: new URL(`http://localhost/dashboard/teacher/programme${search}`)
	} as unknown as LoadEvent;
	return (await load(event)) as { view: string; grade: string; tree: unknown[]; map: unknown[] };
}

beforeEach(() => {
	getProgrammeTree.mockClear();
	getProgrammeMap.mockClear();
});

describe('load — vue', () => {
	it('?vue=carte : lit la carte du niveau, pas la liste', async () => {
		const data = await loadAt('?grade=2&vue=carte');

		expect(data.view).toBe('carte');
		expect(data.map).toEqual([{ id: 'carte' }]);
		expect(data.tree).toEqual([]);
		expect(getProgrammeMap).toHaveBeenCalledWith(expect.anything(), '2');
		expect(getProgrammeTree).not.toHaveBeenCalled();
	});

	it('sans ?vue= : la liste', async () => {
		const data = await loadAt('?grade=2');

		expect(data.view).toBe('liste');
		expect(data.tree).toEqual([{ id: 'liste' }]);
		expect(getProgrammeMap).not.toHaveBeenCalled();
	});

	it('?vue= inconnue : la liste', async () => {
		expect((await loadAt('?vue=radar')).view).toBe('liste');
		expect(getProgrammeMap).not.toHaveBeenCalled();
	});
});
