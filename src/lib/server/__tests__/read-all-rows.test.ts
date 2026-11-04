import { describe, expect, it } from 'vitest';

import { READ_ALL_PAGE_SIZE, readAllRows } from '../read-all-rows';

// Simule PostgREST : rend la tranche [from, to] d'un tableau, plafonnée à 1000 lignes
function pagedSource(total: number) {
	const rows = Array.from({ length: total }, (_, i) => ({ id: i }));
	const calls: [number, number][] = [];
	const read = async (from: number, to: number) => {
		calls.push([from, to]);
		return { data: rows.slice(from, Math.min(to + 1, from + 1000)), error: null };
	};
	return { read, calls };
}

describe('readAllRows', () => {
	it('lit au-delà du plafond de 1000 lignes de PostgREST', async () => {
		const { read } = pagedSource(2500);
		const rows = await readAllRows(read, 'des modèles');
		expect(rows).toHaveLength(2500);
		expect(rows.map((r) => r.id)).toEqual(Array.from({ length: 2500 }, (_, i) => i));
	});

	it('demande des pages contiguës de READ_ALL_PAGE_SIZE lignes', async () => {
		const { read, calls } = pagedSource(2500);
		await readAllRows(read, 'des modèles');
		expect(calls).toEqual([
			[0, READ_ALL_PAGE_SIZE - 1],
			[READ_ALL_PAGE_SIZE, 2 * READ_ALL_PAGE_SIZE - 1],
			[2 * READ_ALL_PAGE_SIZE, 3 * READ_ALL_PAGE_SIZE - 1]
		]);
	});

	it('exactement une page pleine : lit la page suivante, vide, puis s’arrête', async () => {
		const { read, calls } = pagedSource(READ_ALL_PAGE_SIZE);
		const rows = await readAllRows(read, 'des modèles');
		expect(rows).toHaveLength(READ_ALL_PAGE_SIZE);
		expect(calls).toHaveLength(2);
	});

	it('aucune ligne : liste vide', async () => {
		const { read } = pagedSource(0);
		expect(await readAllRows(read, 'des modèles')).toEqual([]);
	});

	it('data null sans erreur : liste vide', async () => {
		const rows = await readAllRows(async () => ({ data: null, error: null }), 'des modèles');
		expect(rows).toEqual([]);
	});

	it('une page en échec au milieu : erreur, jamais de liste partielle', async () => {
		let call = 0;
		const read = async (from: number, to: number) => {
			call++;
			if (call === 2) return { data: null, error: { message: 'timeout' } };
			return { data: Array.from({ length: to - from + 1 }, (_, i) => from + i), error: null };
		};
		await expect(readAllRows(read, 'des modèles')).rejects.toThrow(
			'lecture des modèles impossible — timeout'
		);
	});
});
