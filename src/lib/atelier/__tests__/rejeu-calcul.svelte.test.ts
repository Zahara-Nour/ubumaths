/**
 * Rejouer un historique de Calcul exporté en JSON — lot C2 de
 * `docs/archive/wip/atelier-suppression-export-phase0.md` (R1 à R5, E1 à E3).
 *
 * Le fichier vient de DEHORS : il est lu par Zod, borné, et chaque geste est
 * refait par le même chemin que l'élève — rien n'est injecté dans l'atelier.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { historyToJson } from '../history-export';
import { readHistory, MAX_HISTORY_ENTRIES } from '../history-import';

// =============================================================================
// Décor
// =============================================================================

const NOW = new Date('2026-10-05T14:03:00Z');

/** Un historique exporté par un vrai pupitre, comme le ferait l'élève. */
function exported(build: (d: CalcDesk) => void): string {
	const d = new CalcDesk(new Atelier());
	build(d);
	return historyToJson(d.entries, NOW);
}

function read(text: string) {
	const result = readHistory(text);
	if (!result.ok) throw new Error(result.message);
	return result.history;
}

// =============================================================================
// Lire le fichier
// =============================================================================

describe('lire un historique', () => {
	it('relit ce que l’export écrit', () => {
		const text = exported((d) => d.submit('f(x)=x^2'));

		expect(read(text).entries[0]).toMatchObject({ kind: 'saisie', input: 'f(x)=x^2' });
	});

	it('refuse ce qui n’est pas du JSON (E1)', () => {
		const result = readHistory('pas du json');

		expect(result).toEqual({ ok: false, message: 'Ce fichier n’est pas un historique de Calcul.' });
	});

	it('refuse un JSON d’une autre forme (E1)', () => {
		expect(readHistory('{"objects": []}').ok).toBe(false);
	});

	it('refuse une version plus récente (E2)', () => {
		const text = exported((d) => d.submit('1+1')).replace('"version": 1', '"version": 99');

		expect(readHistory(text)).toEqual({
			ok: false,
			message: 'Cet historique vient d’une version plus récente de Chiphre.'
		});
	});

	it('refuse trop d’entrées (E3)', () => {
		const entry = { kind: 'saisie', input: '1+1', label: '1+1', text: '2', failed: false };
		const text = JSON.stringify({
			format: 'chiphre-calcul',
			version: 1,
			exportedAt: NOW.toISOString(),
			entries: Array.from({ length: MAX_HISTORY_ENTRIES + 1 }, () => entry)
		});

		expect(readHistory(text).ok).toBe(false);
	});

	it('refuse une saisie démesurée (E3)', () => {
		const text = exported((d) => d.submit('1+1')).replace(
			'"input": "1+1"',
			`"input": "${'1+'.repeat(1500)}1"`
		);

		expect(readHistory(text).ok).toBe(false);
	});
});

// =============================================================================
// Rejouer
// =============================================================================

describe('rejouer un historique', () => {
	it('refait les saisies dans l’ordre (R1)', () => {
		const text = exported((d) => {
			d.submit('f(x)=x^2');
			d.submit('f(3)');
		});
		const d = new CalcDesk(new Atelier());

		const report = d.replay(read(text));

		expect(report).toMatchObject({ ok: true, replayed: 2 });
		expect(d.atelier.names).toEqual(['f']);
		expect(d.entries.map((e) => e.text)).toEqual([
			'« f » est dans tes objets.',
			expect.stringContaining('9')
		]);
	});

	it('refait les actions des cartes par le même chemin (R4)', () => {
		const text = exported((d) => {
			d.submit('f(x)=3x^2');
			d.runFromPanel('derive', 'f');
			d.image('f', '2');
		});
		const d = new CalcDesk(new Atelier());

		d.replay(read(text));

		expect(d.atelier.names).toEqual(['f', "f'"]);
		expect(d.entries[1].replay).toEqual({ kind: 'action', action: 'derive', name: 'f' });
		expect(d.entries[2].text).toContain('12');
	});

	it('refait « Garder » sur la bonne ligne (R5)', () => {
		const text = exported((d) => {
			d.submit('1/3 + 1/6');
			d.keep(d.entries[0]);
		});
		const d = new CalcDesk(new Atelier());

		d.replay(read(text));

		expect(d.atelier.names.length).toBe(1);
	});

	it('une ligne qui avait échoué peut échouer encore', () => {
		const text = exported((d) => {
			d.submit('f(x)=x^2');
			d.submit("f'(x) = 3x");
			d.submit('f(2)');
		});
		const d = new CalcDesk(new Atelier());

		expect(d.replay(read(text))).toMatchObject({ ok: true, replayed: 3 });
	});

	it('s’arrête à la première ligne qui échoue alors qu’elle avait réussi (R3)', () => {
		// Le fichier a été retouché : la fonction s'appelle g, dériver f ne peut plus aboutir
		const text = exported((d) => {
			d.submit('f(x)=x^2');
			d.runFromPanel('derive', 'f');
			d.submit('1+1');
		}).replace('"input": "f(x)=x^2"', '"input": "g(x)=x^2"');
		const d = new CalcDesk(new Atelier());

		const report = d.replay(read(text));

		expect(report).toMatchObject({ ok: false, replayed: 1, line: 2 });
		expect(d.entries.length).toBe(2);
	});

	it('dit ce qu’il a fait', () => {
		const text = exported((d) => d.submit('1+1'));
		const d = new CalcDesk(new Atelier());

		d.replay(read(text));

		expect(d.notice).toBe('Historique rejoué : 1 ligne.');
	});
});

// =============================================================================
// Revue du lot C2
// =============================================================================

describe('rejeu — ce que la revue a trouvé', () => {
	/** Un fichier écrit à la main, pour placer les lignes exactement. */
	function file(entries: unknown[]) {
		return read(
			JSON.stringify({
				format: 'chiphre-calcul',
				version: 1,
				exportedAt: NOW.toISOString(),
				entries
			})
		);
	}
	const shown = { label: '', text: '', failed: false };

	it('« Garder » vise la ligne du fichier, même décalée par une ligne secondaire', () => {
		const d = new CalcDesk(new Atelier());

		const report = d.replay(
			file([
				{ kind: 'ligne', ...shown },
				{ kind: 'saisie', input: '1/3 + 1/6', ...shown },
				{ kind: 'garder', line: 1, ...shown }
			])
		);

		expect(report.ok).toBe(true);
		expect(d.atelier.names.length).toBe(1);
	});

	it('un geste qui avait échoué et n’écrit plus rien n’arrête pas le rejeu (R3)', () => {
		const d = new CalcDesk(new Atelier());

		const report = d.replay(
			file([
				{ kind: 'action', action: 'inconnue', name: 'f', ...shown, failed: true },
				{ kind: 'saisie', input: '1+1', ...shown }
			])
		);

		expect(report).toMatchObject({ ok: true, replayed: 2 });
	});

	it('un « Garder » refusé dit sa vraie raison', () => {
		const d = new CalcDesk(new Atelier());

		const report = d.replay(
			file([
				{ kind: 'saisie', input: '.variations x^2-3x+1', ...shown },
				{ kind: 'garder', line: 0, ...shown }
			])
		);

		expect(report.ok).toBe(false);
		expect(d.notice).toContain('commande');
	});

	it('le brouillon de l’élève survit au rejeu', () => {
		const d = new CalcDesk(new Atelier());
		d.draft = 'g(x) = ';

		d.replay(file([{ kind: 'saisie', input: '1+1', ...shown }]));

		expect(d.draft).toBe('g(x) = ');
	});
});
