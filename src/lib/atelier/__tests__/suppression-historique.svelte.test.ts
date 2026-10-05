/**
 * Supprimer — et annuler — laisse une ligne dans Calcul (retour de David,
 * 2026-10-05 : « quand je supprime une carte, on ne voit rien dans
 * l'historique »). Règle G7 : toute action laisse sa trace. Les deux lignes
 * rangent leur geste : l'export les contient, le rejeu les refait.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { historyToJson } from '../history-export';
import { readHistory } from '../history-import';

// =============================================================================
// Décor
// =============================================================================

/** `f`, sa dérivée et `g` qui la cite. */
function family(): CalcDesk {
	const d = new CalcDesk(new Atelier());
	d.submit('f(x)=x^2');
	d.runFromPanel('derive', 'f');
	d.submit('g(x)=f(x)+1');
	return d;
}

function last(d: CalcDesk) {
	return d.entries[d.entries.length - 1];
}

// =============================================================================
// Supprimer
// =============================================================================

describe('supprimer laisse une ligne', () => {
	it('nomme ce qui est parti', () => {
		const d = family();

		d.remove('f');

		expect(last(d)).toMatchObject({
			label: 'Supprimer f',
			text: 'Supprimé : f, f′ et g.',
			failed: false,
			replay: { kind: 'supprimer', name: 'f' }
		});
		expect(d.atelier.names).toEqual([]);
	});

	it('un seul objet', () => {
		const d = new CalcDesk(new Atelier());
		d.submit('a = 2');

		d.remove('a');

		expect(last(d).text).toBe('Supprimé : a.');
	});

	it('un nom absent ne laisse pas de ligne', () => {
		const d = family();
		const before = d.entries.length;

		expect(d.remove('z').ok).toBe(false);
		expect(d.entries.length).toBe(before);
	});
});

// =============================================================================
// Annuler
// =============================================================================

describe('annuler laisse une ligne', () => {
	it('dit ce qui est revenu', () => {
		const d = family();
		const result = d.remove('f');
		if (!result.ok) throw new Error('suppression refusée');

		expect(d.undoRemoval(result)).toBe(true);

		expect(last(d)).toMatchObject({
			label: 'Annuler la suppression',
			text: 'f, f′ et g sont revenus.',
			replay: { kind: 'annuler' }
		});
		expect(d.atelier.names).toEqual(['f', "f'", 'g']);
	});

	it('un seul objet revenu', () => {
		const d = new CalcDesk(new Atelier());
		d.submit('a = 2');
		const result = d.remove('a');
		if (!result.ok) throw new Error('suppression refusée');

		d.undoRemoval(result);

		expect(last(d).text).toBe('« a » est revenu.');
	});

	it('une annulation refusée ne laisse pas de ligne', () => {
		const d = family();
		const result = d.remove('f');
		if (!result.ok) throw new Error('suppression refusée');
		d.submit('h(x)=x');
		const before = d.entries.length;

		expect(d.undoRemoval(result)).toBe(false);
		expect(d.entries.length).toBe(before);
	});
});

// =============================================================================
// Export et rejeu
// =============================================================================

describe('suppression et annulation se rejouent', () => {
	it('le rejeu refait la suppression puis l’annulation', () => {
		const original = family();
		const result = original.remove('f');
		if (!result.ok) throw new Error('suppression refusée');
		original.undoRemoval(result);
		original.remove('g');
		const read = readHistory(historyToJson(original.entries, new Date()));
		if (!read.ok) throw new Error(read.message);
		const d = new CalcDesk(new Atelier());

		const report = d.replay(read.history);

		expect(report.ok).toBe(true);
		expect(d.atelier.names).toEqual(['f', "f'"]);
		expect(d.entries.map((e) => e.label)).toEqual(original.entries.map((e) => e.label));
	});
});

describe('suppression — ce que la revue a trouvé', () => {
	it('une annulation après « Repartir de zéro » n’est pas un geste rejouable', () => {
		const d = family();
		const result = d.remove('f');
		if (!result.ok) throw new Error('suppression refusée');
		d.clear();

		d.undoRemoval(result);

		expect(last(d).replay).toBeUndefined();
	});

	it('une suppression refusée au rejeu dit pourquoi', () => {
		const read = readHistory(
			JSON.stringify({
				format: 'chiphre-calcul',
				version: 1,
				exportedAt: new Date().toISOString(),
				entries: [{ kind: 'supprimer', name: 'z', label: 'Supprimer z', text: '', failed: false }]
			})
		);
		if (!read.ok) throw new Error(read.message);
		const d = new CalcDesk(new Atelier());

		d.replay(read.history);

		expect(d.notice).toContain("« z » n'existe pas");
	});
});
