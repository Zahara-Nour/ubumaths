import { describe, expect, it } from 'vitest';

import { READ_ALL_PAGE_SIZE, readAllRows } from '../read-all-rows';

// Simule PostgREST : rend la tranche [from, to] d'un tableau, plafonnée à `maxRows` lignes
function pagedSource(total: number, maxRows = 1000) {
	const rows = Array.from({ length: total }, (_, i) => ({ id: i }));
	const calls: [number, number][] = [];
	const read = async (from: number, to: number) => {
		calls.push([from, to]);
		return { data: rows.slice(from, Math.min(to + 1, from + maxRows)), error: null };
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

	it('demande des pages contiguës, jusqu’à une page vide', async () => {
		const { read, calls } = pagedSource(2500);
		await readAllRows(read, 'des modèles');
		expect(calls).toEqual([
			[0, READ_ALL_PAGE_SIZE - 1],
			[1000, 1000 + READ_ALL_PAGE_SIZE - 1],
			[2000, 2000 + READ_ALL_PAGE_SIZE - 1],
			[2500, 2500 + READ_ALL_PAGE_SIZE - 1]
		]);
	});

	it('serveur plafonné SOUS la taille demandée : lit quand même tout', async () => {
		const { read } = pagedSource(1200, 500);
		const rows = await readAllRows(read, 'des modèles');
		expect(rows.map((r) => r.id)).toEqual(Array.from({ length: 1200 }, (_, i) => i));
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
