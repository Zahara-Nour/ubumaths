/**
 * Page Programme — chargement serveur, choix de la vue (2026-10-23).
 *
 *   - ?vue=carte lit la carte (arbre complet), pas la liste ;
 *   - sans ?vue=, ou avec une valeur inconnue : la liste, comme avant ;
 *   - seule la vue demandée est lue.
 *
 * Programme officiel (2026-10-24) : ?vue=pdf et ?vue=texte donnent le PDF du
 * BO et sa transcription ubumark, sans lire les points.
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
	return (await load(event)) as {
		view: string;
		grade: string;
		tree: unknown[];
		map: unknown[];
		official: { pdfUrl: string } | null;
		transcription: string | null;
	};
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

describe('load — programme officiel (BO)', () => {
	it('?vue=pdf : le PDF du niveau, ni liste ni carte lues', async () => {
		const data = await loadAt('?grade=CM1&vue=pdf');

		expect(data.view).toBe('pdf');
		expect(data.official?.pdfUrl).toBe('/programmes/cycle-3.pdf');
		expect(getProgrammeTree).not.toHaveBeenCalled();
		expect(getProgrammeMap).not.toHaveBeenCalled();
	});

	it('?vue=texte : la transcription du niveau', async () => {
		const data = await loadAt('?grade=2&vue=texte');

		expect(data.view).toBe('texte');
		expect(data.transcription).toMatch(/^# Programme de mathématiques/m);
		expect(getProgrammeTree).not.toHaveBeenCalled();
	});

	it('?vue=texte, niveau pas encore transcrit : transcription null, PDF toujours là', async () => {
		const data = await loadAt('?grade=CM1&vue=texte');

		expect(data.transcription).toBeNull();
		expect(data.official?.pdfUrl).toBe('/programmes/cycle-3.pdf');
	});

	it('T_GEN : pas de programme officiel', async () => {
		const data = await loadAt('?grade=T_GEN&vue=pdf');

		expect(data.official).toBeNull();
		expect(data.transcription).toBeNull();
	});

	it('vue liste : la transcription n’est pas lue', async () => {
		expect((await loadAt('?grade=2')).transcription).toBeNull();
	});
});
