/**
 * Rejeu d'un historique exporté avant le lot C (lecture « nombre, espace,
 * unité ») : l'algèbre écrite avec des espaces (`5 s + 1`) y réussissait, elle
 * est désormais refusée (`5 s` = 5 secondes), et le rejeu s'arrêtait. Une telle
 * ligne est rejouée avec son ancien sens, comme le dit l'aide : `5 s` → `5s`.
 */
import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { HISTORY_FORMAT } from '../history-export';
import { readHistory } from '../history-import';

/** Un fichier exporté, avec ce que chaque ligne avait rendu. */
function oldFile(...lines: readonly (readonly [input: string, failed: boolean])[]): string {
	return JSON.stringify({
		format: HISTORY_FORMAT,
		version: 1,
		exportedAt: '2026-10-08T10:00:00.000Z',
		entries: lines.map(([input, failed]) => ({
			kind: 'saisie',
			input,
			label: input,
			text: failed ? 'refusé' : 'réussi',
			failed
		}))
	});
}

function replay(file: string) {
	const read = readHistory(file);
	if (!read.ok) throw new Error(read.message);
	const desk = new CalcDesk(new Atelier());
	const report = desk.replay(read.history);
	return { desk, report };
}

describe('une ligne réussie, refusée par la lecture des grandeurs', () => {
	it('un calcul : rejoué avec l’ancien sens', () => {
		const { desk, report } = replay(oldFile(['5 s + 1', false]));
		expect(report).toEqual({ ok: true, replayed: 1 });
		const line = desk.entries.at(-1)!;
		expect(line.label).toBe('5s + 1');
		expect(line.failed).toBe(false);
	});

	it('une définition : la valeur existe, et la suite se rejoue', () => {
		const { desk, report } = replay(
			oldFile(['h = 3', false], ['k = 2 h + 1', false], ['2k', false])
		);
		expect(report).toEqual({ ok: true, replayed: 3 });
		expect(desk.atelier.get('k')?.definition).toBe('2h + 1');
		expect(desk.entries.at(-1)!.text).toBe('14');
	});

	it('deux lettres lues comme unités', () => {
		const { desk, report } = replay(oldFile(['2 h + 5 s + 1', false]));
		expect(report).toEqual({ ok: true, replayed: 1 });
		expect(desk.entries.at(-1)!.label).toBe('2h + 5s + 1');
	});

	// `b` n'est pas une unité : `2 b` est déjà un produit
	it('seule la lettre lue comme unité est collée', () => {
		const { desk, report } = replay(oldFile(['3 a + 2 b', false]));
		expect(report).toEqual({ ok: true, replayed: 1 });
		expect(desk.entries.at(-1)!.label).toBe('3a + 2 b');
	});

	// Revue : le premier `5 s` du texte était celui de l'exposant
	it('la même écriture dans un exposant', () => {
		const { desk, report } = replay(oldFile(['2^5 s + 5 s + 1', false]));
		expect(report).toEqual({ ok: true, replayed: 1 });
		expect(desk.entries.at(-1)!.label).toBe('(2^5)s + 5s + 1');
	});

	it('après une puissance de dix', () => {
		const { desk, report } = replay(oldFile(['10^3 s + 1', false]));
		expect(report).toEqual({ ok: true, replayed: 1 });
		expect(desk.entries.at(-1)!.label).toBe('(10^3)s + 1');
	});

	it('la ligne refusée n’est pas gardée à l’écran', () => {
		const { desk } = replay(oldFile(['5 s + 1', false]));
		expect(desk.entries.filter((e) => e.label === '5 s + 1')).toEqual([]);
	});
});

describe('ce que le rejeu ne relit pas', () => {
	it('une ligne déjà refusée dans le fichier reste refusée', () => {
		const { desk, report } = replay(oldFile(['5 s + 1', true]));
		expect(report.ok).toBe(true);
		const line = desk.entries.at(-1)!;
		expect(line.label).toBe('5 s + 1');
		expect(line.failed).toBe(true);
	});

	it('une vraie grandeur reste une grandeur', () => {
		const { desk } = replay(oldFile(['5 m + 5 m', false]));
		expect(desk.entries.at(-1)!.text).toBe('10 m');
	});

	it('un refus sans lettre lue comme unité arrête toujours le rejeu', () => {
		const { report } = replay(oldFile(['3[m] + 1[s]', false]));
		expect(report).toMatchObject({ ok: false, line: 1 });
	});
});
