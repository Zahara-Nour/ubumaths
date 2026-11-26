/**
 * Un exercice sans version (incohérence de la base) ne fait pas tomber toute une liste :
 * il en est écarté. Lu seul, il reste une erreur.
 */
import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.ts';
import { withLatestVersion, withLatestVersions } from '#lib/server/exercise-versions.ts';

function clientAvecVersions(versions: Record<string, unknown>[]) {
	// La base rend UNE ligne par exercice (RPC `latest_exercise_versions`) ; un exercice sans
	// version lisible n'a simplement pas de ligne.
	const query = { select: vi.fn().mockResolvedValue({ data: versions, error: null }) };
	return { rpc: vi.fn(() => query) } as unknown as SupabaseClient<Database>;
}

const version = {
	id: 'v-a',
	number: 1,
	exercise_id: 'a',
	variations: [{ label: 'default' }],
	shared: null,
	generic_functions: null
};

describe('withLatestVersions', () => {
	it('écarte l’exercice sans version et garde les autres', async () => {
		const liste = await withLatestVersions(clientAvecVersions([version]), [
			{ id: 'a' },
			{ id: 'sans-version' }
		]);
		expect(liste.map((e) => e.id)).toEqual(['a']);
		expect(liste[0].variations).toEqual([{ label: 'default' }]);
	});

	it('un exercice lu seul sans version reste une erreur', async () => {
		await expect(withLatestVersion(clientAvecVersions([]), { id: 'sans-version' })).rejects.toThrow(
			'sans version lisible'
		);
	});
});
