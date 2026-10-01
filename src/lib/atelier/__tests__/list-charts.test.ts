/**
 * Atelier — statistiques et diagrammes des listes (chantier outils
 * statistiques, lot 5).
 *
 * Spécification validée par David le 2026-10-01
 * (`docs/wip/outils-statistiques-progress.md`, Q35 à Q39).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { actionsFor } from '../actions';
import { listChart } from '../chart';

// =============================================================================
// Helpers
// =============================================================================

function atelierWith(lists: Record<string, string>) {
	const atelier = new Atelier();
	for (const [name, definition] of Object.entries(lists)) {
		atelier.create({ kind: 'list', name, definition });
	}
	return atelier;
}

function labelsOf(atelier: Atelier, name: string) {
	return actionsFor(atelier.get(name)!, atelier).map((a) => a.label);
}

function idsOf(atelier: Atelier, name: string) {
	return actionsFor(atelier.get(name)!, atelier).map((a) => a.id);
}

function nodeOf(atelier: Atelier, name: string, partner: string | null = null) {
	const chart = listChart(atelier, name, partner);
	if (!chart.ok) throw new Error(`échec inattendu : ${chart.message}`);
	return chart.node;
}

// =============================================================================
// Actions proposées
// =============================================================================

describe('actions d’une liste', () => {
	it('seule : statistiques et diagramme en bâtons', () => {
		const ids = idsOf(atelierWith({ L: '1 ; 2' }), 'L');

		expect(ids).toContain('stats');
		expect(ids).toContain('chart');
	});

	it('avec une partenaire : une action par partenaire, comme le nuage', () => {
		const atelier = atelierWith({ L: '1 ; 2', M: '5 ; 8' });

		expect(idsOf(atelier, 'L')).toEqual(
			expect.arrayContaining(['stats:M', 'chart:M', 'scatter:M', 'fit:M'])
		);
		expect(labelsOf(atelier, 'L')).toEqual(
			expect.arrayContaining(['Statistiques avec effectifs M', 'Diagramme avec effectifs M'])
		);
	});

	// Revue du lot 5 : une action qui ne peut qu'échouer dit pourquoi AVANT le clic
	it('partenaire de longueur différente : actions « avec effectifs » désactivées, avec la raison', () => {
		const atelier = atelierWith({ L: '1 ; 2', N: '3 ; 4 ; 5' });
		const actions = actionsFor(atelier.get('L')!, atelier);

		for (const id of ['stats:N', 'chart:N']) {
			expect(actions.find((a) => a.id === id)?.disabledReason).toMatch(/2.*3|3.*2/);
		}
		expect(actions.find((a) => a.id === 'scatter:N')?.disabledReason).toBeUndefined();
	});

	it('le bouton du diagramme bascule : « Retirer le diagramme »', () => {
		const atelier = atelierWith({ L: '1 ; 2' });
		const desk = new CalcDesk(atelier);

		expect(labelsOf(atelier, 'L')).toContain('Diagramme en bâtons');
		desk.runFromPanel('chart', 'L');
		expect(labelsOf(atelier, 'L')).toContain('Retirer le diagramme');
		desk.runFromPanel('chart', 'L');
		expect(atelier.chartOf('L')).toBeUndefined();
	});
});

// =============================================================================
// Statistiques
// =============================================================================

describe('Statistiques', () => {
	it('les lignes françaises du module statistique', () => {
		const desk = new CalcDesk(atelierWith({ L: '3 ; 7 ; 8 ; 5 ; 12 ; 14 ; 21 ; 13 ; 18' }));

		desk.runFromPanel('stats', 'L');

		const text = desk.entries[0].text;
		expect(text).toContain('Q1 = 7');
		expect(text).toContain('Écart interquartile = 7');
		expect(text).toContain('D9 = 21');
		expect(text).toContain('Écart type ≈ 5,65');
	});

	it('avec effectifs M : valeurs de L, effectifs de M', () => {
		const desk = new CalcDesk(atelierWith({ L: '0 ; 1 ; 2 ; 3 ; 4', M: '5 ; 8 ; 4 ; 2 ; 1' }));

		desk.runFromPanel('stats:M', 'L');

		expect(desk.entries[0].failed).toBe(false);
		expect(desk.entries[0].label).toBe('Statistiques L avec effectifs M');
		expect(desk.entries[0].text).toContain('Effectif : 20');
		expect(desk.entries[0].text).toContain('Moyenne = 1,3');
	});

	it('avec effectifs M de longueur différente : le message du module', () => {
		const desk = new CalcDesk(atelierWith({ L: '1 ; 2 ; 3', M: '5 ; 8' }));

		desk.runFromPanel('stats:M', 'L');

		expect(desk.entries[0].failed).toBe(true);
		expect(desk.entries[0].text).toMatch(/3/);
	});
});

// =============================================================================
// Diagramme
// =============================================================================

describe('diagramme en bâtons', () => {
	it('valeurs distinctes triées, avec leur effectif', () => {
		const node = nodeOf(atelierWith({ L: '2 ; 3 ; 3 ; 5 ; 3' }), 'L');

		expect(node.kind).toBe('barres');
		expect(node.spec?.data.map((d) => [d.label, d.value])).toEqual([
			['2', 1],
			['3', 3],
			['5', 1]
		]);
	});

	it('ligne d’indicateurs : effectif, moyenne, médiane, quartiles', () => {
		const node = nodeOf(atelierWith({ L: '2 ; 3 ; 3 ; 5 ; 3' }), 'L');

		expect(node.spec?.indicators).toEqual(['effectif', 'moyenne', 'mediane', 'quartiles']);
	});

	it('valeurs décimales écrites en français', () => {
		const node = nodeOf(atelierWith({ L: '2,5 ; 1' }), 'L');

		expect(node.spec?.data.map((d) => d.label)).toEqual(['1', '2,5']);
	});

	it('avec effectifs M : une valeur répétée additionne ses effectifs', () => {
		const node = nodeOf(atelierWith({ L: '1 ; 2 ; 1', M: '4 ; 5 ; 6' }), 'L', 'M');

		expect(node.spec?.data.map((d) => [d.label, d.value])).toEqual([
			['1', 10],
			['2', 5]
		]);
	});

	it('plus de 30 valeurs distinctes : un message, pas un diagramme illisible', () => {
		const values = Array.from({ length: 31 }, (_, i) => i).join(' ; ');
		const chart = listChart(atelierWith({ L: values }), 'L', null);

		expect(chart.ok).toBe(false);
		expect(!chart.ok && chart.message).toMatch(/30/);
	});

	it('liste vide, ou partenaire disparue : un message', () => {
		const atelier = atelierWith({ L: '' });

		expect(listChart(atelier, 'L', null).ok).toBe(false);
		expect(listChart(atelierWith({ L: '1' }), 'L', 'M').ok).toBe(false);
	});

	it('effectifs invalides (négatif) : le message du bloc, situé', () => {
		const chart = listChart(atelierWith({ L: '1 ; 2', M: '3 ; -1' }), 'L', 'M');

		expect(chart.ok).toBe(false);
	});

	it('vivant : il suit les valeurs de la liste, sans nouveau clic', () => {
		const atelier = atelierWith({ L: '1 ; 1' });
		new CalcDesk(atelier).runFromPanel('chart', 'L');

		atelier.update('L', '1 ; 2 ; 2');

		expect(nodeOf(atelier, 'L').spec?.data.map((d) => d.value)).toEqual([1, 2]);
		expect(atelier.chartOf('L')).toEqual({ partner: null });
	});

	it('supprimer la liste retire son diagramme', () => {
		const atelier = atelierWith({ L: '1' });
		new CalcDesk(atelier).runFromPanel('chart', 'L');

		atelier.remove('L');

		expect(atelier.chartOf('L')).toBeUndefined();
	});

	// Q37 : rien de nouveau dans la sauvegarde ni dans le lien de partage. Revue
	// du lot 5 : comparer la sauvegarde ENTIÈRE, pas chercher un mot-clé
	it('n’est pas enregistré, et ne déclenche aucun enregistrement', () => {
		const atelier = atelierWith({ L: '1 ; 2', M: '3 ; 4' });
		const before = atelier.serialize();
		const revision = atelier.revision;

		new CalcDesk(atelier).runFromPanel('chart:M', 'L');

		expect(atelier.chartOf('L')).toEqual({ partner: 'M' });
		expect(atelier.serialize()).toEqual(before);
		expect(atelier.revision).toBe(revision);
	});

	// Revue du lot 5 : la liste en erreur bloquait le bouton qui retire son diagramme
	it('se retire même quand la liste est en erreur', () => {
		const atelier = atelierWith({ L: '1 ; 2' });
		atelier.toggleChart('L', null);
		atelier.update('L', '1 ; zz');

		const remove = actionsFor(atelier.get('L')!, atelier).find((a) => a.id === 'chart');
		expect(remove?.label).toBe('Retirer le diagramme');
		expect(remove?.disabledReason).toBeUndefined();
	});

	it('supprimer la partenaire retire les diagrammes qui en dépendaient', () => {
		const atelier = atelierWith({ L: '1 ; 2', M: '3 ; 4' });
		atelier.toggleChart('L', 'M');

		atelier.remove('M');

		expect(atelier.chartOf('L')).toBeUndefined();
	});

	it('vivant aussi pour la partenaire : ses effectifs sont relus', () => {
		const atelier = atelierWith({ L: '1 ; 2', M: '3 ; 4' });
		atelier.toggleChart('L', 'M');

		atelier.update('M', '5 ; 6');

		expect(nodeOf(atelier, 'L', 'M').spec?.data.map((d) => d.value)).toEqual([5, 6]);
	});
});
