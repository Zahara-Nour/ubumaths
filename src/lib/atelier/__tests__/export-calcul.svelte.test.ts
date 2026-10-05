/**
 * Exporter l'historique de Calcul — lot C1 de
 * `docs/wip/atelier-suppression-export-phase0.md` (décisions de David du
 * 2026-10-05 : deux formats, JSON pour rejouer, ubumark pour lire).
 *
 * Chaque ligne garde le GESTE qui l'a produite (saisie, action de carte,
 * « Garder ») : c'est ce que le rejeu (lot C2) refera, par le même chemin.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { historyToJson, historyToUbumark, exportFileName } from '../history-export';

// =============================================================================
// Décor
// =============================================================================

const NOW = new Date('2026-10-05T14:03:00Z');

function desk(): CalcDesk {
	return new CalcDesk(new Atelier());
}

// =============================================================================
// Le geste de chaque ligne
// =============================================================================

describe('chaque ligne garde son geste', () => {
	it('une saisie', () => {
		const d = desk();

		d.submit('f(x)=x^2');

		expect(d.entries[0].replay).toEqual({ kind: 'saisie', input: 'f(x)=x^2' });
	});

	it('une action de carte', () => {
		const d = desk();
		d.submit('f(x)=x^2');

		d.runFromPanel('derive', 'f');

		expect(d.entries[1].replay).toEqual({ kind: 'action', action: 'derive', name: 'f' });
	});

	it('l’image calculée depuis une carte', () => {
		const d = desk();
		d.submit('f(x)=x^2');

		d.image('f', '3');

		expect(d.entries[1].replay).toEqual({ kind: 'action', action: 'image', name: 'f', value: '3' });
	});

	it('« Garder » laisse une ligne, qui dit quelle ligne a été gardée', () => {
		const d = desk();
		d.submit('1/3 + 1/6');

		d.keep(d.entries[0]);

		expect(d.entries[1].text).toContain('Gardé sous le nom');
		expect(d.entries[1].replay).toEqual({ kind: 'garder', line: 0 });
	});

	it('« Garder » qui échoue ne laisse pas de ligne', () => {
		const d = desk();
		d.submit('.variations x^2-3x+1');

		d.keep(d.entries[0]);

		expect(d.entries.length).toBe(1);
	});

	it('« Comparer » est rangé comme la commande qu’il tape', () => {
		const d = desk();
		d.submit('L = 1;2;3');
		d.submit('M = 4;5;6');

		d.runFromPanel('compare:M', 'L');

		expect(d.entries[2].replay).toEqual({ kind: 'saisie', input: '.comparer L M' });
	});
});

// =============================================================================
// JSON
// =============================================================================

describe('export JSON', () => {
	it('distingue chaque entrée, avec son geste et sa réponse', () => {
		const d = desk();
		d.submit('f(x)=x^2');
		d.runFromPanel('derive', 'f');

		const file = JSON.parse(historyToJson(d.entries, NOW));

		expect(file).toMatchObject({
			format: 'chiphre-calcul',
			version: 1,
			exportedAt: '2026-10-05T14:03:00.000Z'
		});
		expect(file.entries[0]).toMatchObject({
			kind: 'saisie',
			input: 'f(x)=x^2',
			text: '« f » est dans tes objets.',
			failed: false
		});
		expect(file.entries[1]).toMatchObject({
			kind: 'action',
			action: 'derive',
			name: 'f',
			label: 'Dériver f',
			failed: false
		});
		expect(file.entries[1].latex).toBeDefined();
	});

	it('une ligne en échec est marquée (X2)', () => {
		const d = desk();
		d.submit('f(x)=x^2');
		d.submit("f'(x) = 3x");

		const file = JSON.parse(historyToJson(d.entries, NOW));

		expect(file.entries[1].failed).toBe(true);
	});
});

// =============================================================================
// ubumark
// =============================================================================

describe('export ubumark', () => {
	it('la saisie en code, la réponse en formule', () => {
		const d = desk();
		d.submit('f(x)=x^2');
		d.runFromPanel('derive', 'f');

		const text = historyToUbumark(d.entries, NOW);

		expect(text).toContain('# Historique de calcul — 5 octobre 2026');
		expect(text).toContain('`f(x)=x^2`');
		expect(text).toContain('« f » est dans tes objets.');
		expect(text).toContain('**Dériver f**');
		expect(text).toContain("$f'(x) = 2 x$");
	});

	it('les étapes en liste', () => {
		const d = desk();
		d.submit('.résoudre 2x+1=5');

		const text = historyToUbumark(d.entries, NOW);

		expect(d.entries[0].steps?.length).toBeGreaterThan(0);
		expect(text).toMatch(/^- .+/m);
	});

	it('une ligne en échec dit « Erreur »', () => {
		const d = desk();
		d.submit('f(x)=x^2');
		d.submit("f'(x) = 3x");

		expect(historyToUbumark(d.entries, NOW)).toContain('Erreur :');
	});
});

// =============================================================================
// Nom du fichier
// =============================================================================

describe('le nom du fichier', () => {
	it('porte la date et l’extension du format', () => {
		expect(exportFileName('json', NOW)).toBe('calcul-2026-10-05.json');
		expect(exportFileName('ubumark', NOW)).toBe('calcul-2026-10-05.md');
	});
});
