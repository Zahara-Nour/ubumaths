/**
 * `.comparer L M` — comparer deux séries (outils statistiques v2, lot 5, PR (a),
 * Q111-Q114, 2026-10-03 ; 2de `2-169`). Un tableau d'indicateurs, une colonne
 * par série, sous la ligne de l'historique ; AUCUNE phrase de conclusion : la
 * comparaison écrite reste le travail de l'élève.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';
import { commandCatalog } from '../commands';
import { actionsFor } from '../actions';
import { CalcDesk } from '../desk.svelte';
import { summarizeList } from '$lib/statistics/describe';
import { formatSummary } from '$lib/statistics/format';
import type { ComparisonScene } from '$lib/ubumark/utils/stat-chart-scene';

// =============================================================================
// Helpers
// =============================================================================

function session(lists: Record<string, string>): CalcSession {
	const atelier = new Atelier();
	for (const [name, definition] of Object.entries(lists)) {
		atelier.create({ kind: 'list', name, definition });
	}
	return { atelier, engine: new WebReplEngine() };
}

const NOTES = { L: '12 ; 15 ; 9 ; 14 ; 10', M: '8 ; 17 ; 11 ; 13 ; 16 ; 7' };

const compared = (s: CalcSession, input: string) => {
	const result = runInput(s, input);
	if (result.kind !== 'commande') throw new Error(`refus : ${JSON.stringify(result)}`);
	return { result, scene: result.chart as ComparisonScene };
};

const refusal = (s: CalcSession, input: string) => {
	const result = runInput(s, input);
	expect(result.kind, JSON.stringify(result)).toBe('refus');
	return result.kind === 'refus' ? result.message : '';
};

// =============================================================================
// Cas nominal
// =============================================================================

describe('la commande se découvre', () => {
	it('« comparer » au catalogue, avec son exemple et son décor', () => {
		const entry = commandCatalog(new WebReplEngine()).find((c) => c.french === 'comparer');

		expect(entry?.example).toBe('.comparer L M');
		expect(entry?.exampleSetup).toBeDefined();
	});
});

describe('cas nominal', () => {
	it('la ligne d’historique dit les deux séries et leurs effectifs, sans conclusion', () => {
		const { result } = compared(session(NOTES), '.comparer L M');

		expect(result.output).toBe('Comparaison de L (5 valeurs) et M (6 valeurs)');
	});

	it('un tableau : une colonne par série, les indicateurs dans l’ordre du programme', () => {
		const { scene } = compared(session(NOTES), '.comparer L M');

		expect(scene.kind).toBe('comparaison');
		expect(scene.columns).toEqual(['L', 'M']);
		expect(scene.rows.map((r) => r.header)).toEqual([
			'Effectif',
			'Moyenne',
			'Écart type',
			'Médiane',
			'Q1',
			'Q3',
			'Écart interquartile',
			'Minimum',
			'Maximum',
			'Étendue'
		]);
		// Trois groupes : moyenne–écart type, médiane…EI, min–max–étendue
		expect(scene.rows.filter((r) => r.groupStart).map((r) => r.header)).toEqual([
			'Moyenne',
			'Médiane',
			'Minimum'
		]);
	});

	it('les valeurs écrites par « Statistiques », case par case', () => {
		const { scene } = compared(session(NOTES), '.comparer L M');
		// La ligne « Moyenne ≈ 12,17 » de « Statistiques » → la case « ≈ 12,17 »
		const fromStatistics = (definition: string) => {
			const outcome = summarizeList(definition.split(';').map((v) => Number(v)));
			if (outcome === null || !outcome.ok) throw new Error('liste invalide');
			const lines = formatSummary(outcome.value, 'fr');
			return scene.rows.map((row) => {
				const line = lines.find((l) => l.startsWith(`${row.header} `))!;
				return line.slice(row.header.length).replace(/^ : /, '').replace(/^ = /, '').trim();
			});
		};

		expect(scene.rows.map((r) => r.cells[0])).toEqual(fromStatistics(NOTES.L));
		expect(scene.rows.map((r) => r.cells[1])).toEqual(fromStatistics(NOTES.M));
		// Un écart type non décimal s'annonce approché
		expect(scene.rows[2].cells[0]).toMatch(/^≈ /);
	});

	it('une seule valeur : au singulier ; des décimaux et des négatifs', () => {
		const { result, scene } = compared(session({ A: '2,5', B: '−1 ; 3,5' }), '.comparer A B');

		expect(result.output).toBe('Comparaison de A (1 valeur) et B (2 valeurs)');
		expect(scene.rows[1].cells).toEqual(['2,5', '1,25']);
		expect(scene.rows[7].cells).toEqual(['2,5', '−1']);
	});

	it('aucune liste créée', () => {
		const s = session(NOTES);
		compared(s, '.comparer L M');

		expect(s.atelier.objects).toHaveLength(2);
	});
});

// =============================================================================
// Erreurs
// =============================================================================

describe('erreurs : un message, rien de dessiné', () => {
	it('une liste qualitative, avec sa cause', () => {
		expect(refusal(session({ L: '12 ; 2x ; 9', M: '1 ; 2' }), '.comparer L M')).toBe(
			'L est une liste qualitative (à cause de « 2x ») : comparer demande des nombres.'
		);
		expect(refusal(session({ L: '1 ; 2', M: 'oui ; non' }), '.comparer L M')).toBe(
			'M est une liste qualitative : comparer demande des nombres.'
		);
	});

	it('une liste inconnue ou vide', () => {
		expect(refusal(session(NOTES), '.comparer L Z')).toBe(
			'« Z » n’est pas une liste de l’atelier.'
		);
		expect(refusal(session({ L: '1 ; 2', M: '' }), '.comparer L M')).toBe(
			'« M » n’a pas encore de valeurs.'
		);
	});

	it('une liste en erreur : son message, pas un tableau (plus de 200 valeurs, virgules)', () => {
		const many = Array.from({ length: 201 }, (_, i) => i).join(' ; ');
		const s = session({ L: '1 ; 2', M: many });
		const message = refusal(s, '.comparer L M');

		expect(message).toBe(s.atelier.get('M')!.message);
		expect(
			actionsFor(s.atelier.get('L')!, s.atelier, 'M').find((a) => a.id === 'compare:M')
				?.disabledReason
		).toBe(message);
		const commas = session({ L: '1 ; 2', M: '12, 15, 9' });
		expect(refusal(commas, '.comparer L M')).toMatch(/points-virgules/);
	});

	it('la même liste deux fois', () => {
		expect(refusal(session(NOTES), '.comparer L L')).toBe(
			'Compare deux listes différentes : .comparer L M.'
		);
	});

	it('une mauvaise syntaxe', () => {
		const usage = 'Écris la commande ainsi : .comparer L M';
		expect(refusal(session(NOTES), '.comparer L')).toBe(usage);
		expect(refusal(session(NOTES), '.comparer L M N')).toBe(usage);
	});
});

// =============================================================================
// Carte d'une liste
// =============================================================================

describe('l’action « Comparer avec M »', () => {
	it('sur la carte d’une liste de nombres, pour la partenaire choisie ; au plus 11 boutons (Q119)', () => {
		const s = session(NOTES);
		const actions = actionsFor(s.atelier.get('L')!, s.atelier, 'M');
		const compare = actions.find((a) => a.id === 'compare:M');

		expect(compare?.label).toBe('Comparer avec M');
		expect(compare?.disabledReason).toBeUndefined();
		expect(actions.length).toBeLessThanOrEqual(11);
	});

	it('partenaire qualitative : visible, désactivée, avec sa raison', () => {
		const s = session({ L: '1 ; 2', M: 'oui ; non' });
		const compare = actionsFor(s.atelier.get('L')!, s.atelier, 'M').find(
			(a) => a.id === 'compare:M'
		);

		// La MÊME raison que la commande (revue)
		expect(compare?.disabledReason).toBe(refusal(s, '.comparer L M'));
		expect(compare?.disabledReason).toBe(
			'M est une liste qualitative : comparer demande des nombres.'
		);
	});

	it('le clic compare tout de suite : une ligne d’historique et son tableau', () => {
		const s = session(NOTES);
		const desk = new CalcDesk(s.atelier, s.engine);

		desk.draft = '.croiser L N';
		expect(desk.runFromPanel('compare:M', 'L')).toBe('ok');
		const last = desk.entries.at(-1)!;
		expect(last.chart?.kind).toBe('comparaison');
		// Le brouillon de l'élève survit au clic (revue)
		expect(desk.draft).toBe('.croiser L N');
	});
});
