/**
 * Revue #888 : la `note` d'une ligne (indication de variable, « f′ existe
 * déjà ») part dans les deux exports, et le JSON se relit avec elle.
 */

import { describe, it, expect } from 'vitest';
import type { Entry } from '../desk.svelte';
import { historyToJson, historyToUbumark } from '../history-export';
import { readHistory } from '../history-import';

const NOTE = 'Calcul par rapport à x. Pour une autre variable, écris « ; t ».';

const entry: Entry = {
	id: 1,
	label: '.dériver t^2',
	text: 'd/dx(t^2) = 0',
	latex: '0',
	note: NOTE,
	failed: false,
	replay: { kind: 'saisie', input: '.dériver t^2' }
} as Entry;

const now = new Date('2026-10-06T10:00:00Z');

describe('la note dans les exports', () => {
	it('JSON : clé `note`, relue par l’import', () => {
		const json = historyToJson([entry], now);
		expect(JSON.parse(json).entries[0].note).toBe(NOTE);
		const read = readHistory(json);
		expect(read.ok).toBe(true);
		if (!read.ok) return;
		expect(read.history.entries[0]).toMatchObject({ note: NOTE });
	});

	it('JSON : une note démesurée est refusée', () => {
		const json = historyToJson([{ ...entry, note: 'n'.repeat(30_000) }], now);
		expect(readHistory(json).ok).toBe(false);
	});

	it('ubumark : la note en italique après la réponse', () => {
		const md = historyToUbumark([entry], now);
		expect(md).toContain(`$0$\n\n*${NOTE}*`);
	});
});
