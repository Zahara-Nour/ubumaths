/**
 * Avancement du programme — chargement serveur sur l'arbre branche > notion > points
 * ====================================================================================
 *
 * Comportements validés par David (C5, étape 3, B2, 2026-10-21) :
 *   - la carte se lit sur les points NEUFS du niveau de la classe, rangés par
 *     branche > notion (la sous-notion est nommée à côté du point) ;
 *   - un point sans niveau n'apparaît jamais ;
 *   - un point archivé n'apparaît que s'il a été travaillé cette année (Q1).
 */
import { describe, it, expect, vi } from 'vitest';
import { createFakeSupabase } from '#lib/server/__tests__/helpers/fake-supabase.ts';
import {
	answerProgramme,
	pointIdsOf,
	P_ADDITION,
	P_SANS_NIVEAU,
	P_FRACTION,
	P_QUATRIEME,
	P_TRIANGLE_ARCHIVE
} from '#lib/server/__tests__/helpers/fake-programme.ts';
import type { PageServerData } from '../$types';

vi.mock('#lib/server/middleware/auth.ts', () => ({ requireRoles: async () => ({}) }));

import { load } from '../+page.server';

// ============================================================================
// TYPES
// ============================================================================

type LoadEvent = Parameters<typeof load>[0];

// ============================================================================
// CONSTANTES
// ============================================================================

const CLASS_ID = '11111111-1111-4111-8111-111111111111';
const ENTRY_ID = '22222222-2222-4222-8222-222222222222';

// ============================================================================
// HELPERS
// ============================================================================

/** Charge l'avancement d'une classe de 5e dont la séance a couvert ces points. */
async function loadWith(grade: string | null, coveredPointIds: string[]) {
	const fake = createFakeSupabase((table, calls) => {
		const programme = answerProgramme(table, calls);
		if (programme) return programme;
		switch (table) {
			case 'classes':
				return { data: [{ id: CLASS_ID, name: '5e A', grade }] };
			case 'class_journal_entries':
				return { data: [{ id: ENTRY_ID }] };
			case 'journal_entry_points':
				return { data: coveredPointIds.map((point_id) => ({ point_id })) };
			default:
				throw new Error(`Table inattendue : ${table}`);
		}
	});
	const event = {
		locals: { supabase: fake.client },
		url: new URL(`http://localhost/dashboard/teacher/avancement?class=${CLASS_ID}`)
	} as unknown as LoadEvent;
	return (await load(event)) as PageServerData;
}

// ============================================================================
// TESTS
// ============================================================================

describe('avancement — arbre branche > notion > points (C5, B2)', () => {
	it('range les points neufs du niveau par branche > notion, sous-notion nommée', async () => {
		const result = await loadWith('5', []);

		expect(result.tree.map((b) => b.name)).toEqual(['Nombres']);
		expect(result.tree[0].notions.map((n) => n.name)).toEqual(['Fractions', 'Décimaux']);
		const points = result.tree[0].notions[0].points;
		expect(points.map((p) => p.id)).toEqual([P_FRACTION, P_ADDITION]);
		expect(points[1].subnotionName).toBe('Addition');
	});

	it('ni point sans niveau ni point d’un autre niveau', async () => {
		const result = await loadWith('5', [P_SANS_NIVEAU]);
		expect(pointIdsOf(result.tree)).not.toContain(P_SANS_NIVEAU);
		expect(pointIdsOf(result.tree)).not.toContain(P_QUATRIEME);
	});

	it('compte les passages par point', async () => {
		const result = await loadWith('5', [P_FRACTION, P_FRACTION, P_ADDITION]);
		expect(result.counts[P_FRACTION]).toBe(2);
		expect(result.counts[P_ADDITION]).toBe(1);
	});

	it('un point archivé travaillé cette année reste affiché, marqué archivé', async () => {
		const result = await loadWith('5', [P_TRIANGLE_ARCHIVE]);
		expect(result.tree.map((b) => b.name)).toEqual(['Nombres', 'Géométrie']);
		const archive = result.tree[1].notions[0].points[0];
		expect(archive.id).toBe(P_TRIANGLE_ARCHIVE);
		expect(archive.archived_at).not.toBeNull();
	});

	it('un point archivé jamais travaillé reste masqué', async () => {
		const result = await loadWith('5', []);
		expect(pointIdsOf(result.tree)).not.toContain(P_TRIANGLE_ARCHIVE);
	});

	it('classe sans niveau : arbre vide', async () => {
		const result = await loadWith(null, []);
		expect(result.tree).toEqual([]);
	});
});

describe('avancement — année scolaire (L38)', () => {
	it('les dates saisies par l’école bornent les séances comptées', async () => {
		const fake = createFakeSupabase((table, calls) => {
			const programme = answerProgramme(table, calls);
			if (programme) return programme;
			switch (table) {
				case 'classes':
					return { data: [{ id: CLASS_ID, name: '5e A', grade: '5', school_id: 'school-1' }] };
				case 'class_journal_entries':
					return { data: [] };
				default:
					throw new Error(`Table inattendue : ${table}`);
			}
		});
		// Fonction SQL `current_school_year` : les dates saisies par l'école
		const rpc = vi.fn(() => ({
			maybeSingle: async () => ({
				data: { start_date: '2026-09-02', end_date: '2027-07-04' },
				error: null
			})
		}));
		const event = {
			locals: { supabase: { ...fake.client, from: fake.client.from, rpc } },
			url: new URL(`http://localhost/dashboard/teacher/avancement?class=${CLASS_ID}`)
		} as unknown as LoadEvent;
		const result = (await load(event)) as PageServerData;

		expect(rpc).toHaveBeenCalledWith('current_school_year', { p_school_id: 'school-1' });
		const calls = fake.on('class_journal_entries')[0].calls;
		expect(calls).toContainEqual({ method: 'gte', args: ['entry_date', '2026-09-02'] });
		expect(calls).toContainEqual({ method: 'lte', args: ['entry_date', '2027-07-04'] });
		expect(result.schoolYearLabel).toBe('2026–2027');
	});
});
