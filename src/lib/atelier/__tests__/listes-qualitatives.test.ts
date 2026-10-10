/**
 * Listes qualitatives dans l'atelier (outils statistiques v2, lot 2, PR (a),
 * Q84-Q88, Q91, 2026-10-02).
 *
 * Avant : une liste ne gardait que des nombres ; `fille` était compté
 * « ignoré ». Une liste dont une entrée est un MOT (une lettre au moins) est
 * désormais qualitative : ses entrées sont des modalités.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { actionsFor } from '../actions';
import { listChart } from '../chart';
import { parseDefinition } from '../parse';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput } from '../calcul';
import { salvageObjects } from '../persistence';
import { isList, type ListObject } from '../types';

function atelierWith(lists: Record<string, string>) {
	const atelier = new Atelier();
	for (const [name, definition] of Object.entries(lists)) {
		atelier.create({ kind: 'list', name, definition });
	}
	return atelier;
}

const listOf = (atelier: Atelier, name: string) => {
	const object = atelier.get(name);
	if (object === undefined || !isList(object)) throw new Error(`pas de liste ${name}`);
	return object as ListObject;
};

describe('Q84 — une liste avec des mots est qualitative', () => {
	it('fille ; garçon ; fille : 3 entrées, rien d’ignoré', () => {
		const list = listOf(atelierWith({ L: 'fille ; garçon ; fille' }), 'L');

		expect(list.categories).toEqual(['fille', 'garçon', 'fille']);
		expect(list.values).toEqual([]);
		expect(list.skipped).toBe(0);
		expect(list.status).toBe('ok');
	});

	it('1 ; fille ; 2 : qualitative, les nombres sont des modalités', () => {
		expect(listOf(atelierWith({ L: '1 ; fille ; 2' }), 'L').categories).toEqual([
			'1',
			'fille',
			'2'
		]);
	});

	it('12 ; 15 ; 9 : numérique, inchangée', () => {
		const list = listOf(atelierWith({ L: '12 ; 15 ; 9' }), 'L');

		expect(list.categories).toBeUndefined();
		expect(list.values).toEqual([12, 15, 9]);
	});

	it('1 ; 2 ; 1/0 : numérique, 1/0 reste ignoré (Q45 — pas un mot)', () => {
		const list = listOf(atelierWith({ L: '1 ; 2 ; 1/0' }), 'L');

		expect(list.categories).toBeUndefined();
		expect(list.skipped).toBe(1);
	});
});

describe('Q85 — mêmes modalités sans la casse ni les espaces, accents comptés', () => {
	it('Fille ; fille ; FILLE  → une modalité, affichée « Fille »', () => {
		expect(listOf(atelierWith({ L: 'Fille ; fille ;  FILLE ' }), 'L').categories).toEqual([
			'Fille',
			'Fille',
			'Fille'
		]);
	});

	it('élève ; eleve → deux modalités', () => {
		expect(new Set(listOf(atelierWith({ L: 'élève ; eleve' }), 'L').categories)).toEqual(
			new Set(['élève', 'eleve'])
		);
	});
});

describe('Q86, Q91 — messages', () => {
	it('fille, garçon : points-virgules', () => {
		expect(parseDefinition('list', 'fille, garçon').error).toBe(
			'Sépare tes valeurs par des points-virgules : fille ; garçon'
		);
	});

	it('21 modalités distinctes : refusé, avec le compte', () => {
		const definition = Array.from({ length: 21 }, (_, i) => `m${i}`).join(' ; ');

		expect(parseDefinition('list', definition).error).toBe(
			'Une liste qualitative a au plus 20 modalités (celle-ci en a 21).'
		);
	});

	it('une modalité de plus de 40 caractères : nommée', () => {
		const long = 'a'.repeat(41);

		expect(parseDefinition('list', `oui ; ${long}`).error).toBe(
			`« ${long} » est trop longue : une modalité a au plus 40 caractères.`
		);
	});
});

describe('Q87 — renommer un objet ne réécrit jamais une liste', () => {
	it('A renommé en K : la liste A ; B ; A ; O ne bouge pas', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'A', definition: '3' });
		atelier.create({ kind: 'list', name: 'L', definition: 'A ; B ; A ; O' });
		atelier.create({ kind: 'value', name: 'b', definition: 'A + 1' });

		atelier.rename('A', 'K');

		expect(listOf(atelier, 'L').definition).toBe('A ; B ; A ; O');
		// Une définition qui CITE A suit toujours
		expect(atelier.get('b')?.definition).toBe('K + 1');
	});
});

describe('Q88 — les actions d’une liste qualitative', () => {
	const atelier = atelierWith({ L: 'fille ; garçon ; fille', M: '1 ; 2 ; 3' });
	const actions = actionsFor(listOf(atelier, 'L'), atelier);

	it('Effectifs, Diagramme en barres, Diagramme circulaire actifs', () => {
		for (const label of ['Effectifs', 'Diagramme en barres', 'Diagramme circulaire']) {
			const action = actions.find((a) => a.label === label);
			expect(action, label).toBeDefined();
			expect(action?.disabledReason, label).toBeUndefined();
		}
	});

	it('Statistiques visible mais désactivée, avec sa raison', () => {
		expect(actions.find((a) => a.id === 'stats')?.disabledReason).toBe(
			'L contient des mots : action pour une liste de nombres.'
		);
	});

	// Q89 : la seule action à deux listes d'une liste qualitative, le tableau croisé
	it('une seule action à deux listes (tableau croisé), et au plus 10 boutons', () => {
		expect(actions.filter((a) => a.partner !== undefined).map((a) => a.id)).toEqual(['cross:M']);
		expect(actions.length).toBeLessThanOrEqual(10);
	});

	it('liste de NOMBRES, partenaire qualitative : nuage désactivé avec sa raison', () => {
		const numeric = actionsFor(listOf(atelier, 'M'), atelier, 'L');

		expect(numeric.find((a) => a.id === 'scatter:L')?.disabledReason).toBe(
			'L contient des mots : action pour une liste de nombres.'
		);
	});

	it('« Effectifs » : une ligne par modalité, dans l’ordre d’apparition', () => {
		const desk = new CalcDesk(atelier);
		desk.runFromPanel('counts', 'L');

		expect(desk.entries.at(-1)?.text.split('\n')).toEqual([
			'fille : 2 (66,7 %)',
			'garçon : 1 (33,3 %)'
		]);
	});

	it.each(['barres', 'circulaire'] as const)('diagramme %s des modalités', (kind) => {
		const chart = listChart(atelier, 'L', null, kind);

		expect(chart.ok && chart.node.kind).toBe(kind);
		expect(chart.ok && chart.node.spec?.data.map((d) => [d.label, d.value])).toEqual([
			['fille', 2],
			['garçon', 1]
		]);
	});
});

describe('sauvegarde et partage', () => {
	it('une liste qualitative revient à l’identique', () => {
		const atelier = atelierWith({ L: 'Fille ; garçon ; fille' });
		const restored = new Atelier();
		restored.restore(atelier.serialize());

		expect(listOf(restored, 'L').categories).toEqual(['Fille', 'garçon', 'Fille']);
	});
});

// Revue de la PR (a)
describe('revue — une liste qualitative dans une action numérique', () => {
	it('I1 : .simuler avec une liste qualitative dit pourquoi', () => {
		const atelier = atelierWith({ L: 'pile ; face', M: '1/2 ; 1/2' });
		const s = { atelier, engine: new WebReplEngine(), seed: () => 1 };

		expect(runInput(s, '.simuler L M 10')).toEqual({
			kind: 'refus',
			message: 'L contient des mots : action pour une liste de nombres.'
		});
	});

	it('I1 : « Statistiques » et « Nuage » atteints malgré tout : la raison du bouton', () => {
		const atelier = atelierWith({ L: 'pile ; face', N: '1 ; 2' });
		const desk = new CalcDesk(atelier);

		desk.runFromPanel('stats', 'L');
		expect(desk.entries.at(-1)?.text).toBe(
			'L contient des mots : action pour une liste de nombres.'
		);
		desk.runFromPanel('fit:L', 'N');
		expect(desk.entries.at(-1)?.text).toBe(
			'L contient des mots : action pour une liste de nombres.'
		);
	});
});

describe('revue — sauvegarde, modalités piégées, état du diagramme', () => {
	it('I2 : une liste trop longue pour être enregistrée est refusée À LA SAISIE', () => {
		const definition = Array.from({ length: 200 }, (_, i) => `modalite numero ${i % 20}`).join(
			' ; '
		);
		const atelier = atelierWith({ L: definition });

		expect(definition.length).toBeGreaterThan(4000);
		expect(listOf(atelier, 'L').status).toBe('error');
	});

	it('I2 : une liste acceptée revient toujours de la sauvegarde', () => {
		const definition = Array.from({ length: 150 }, (_, i) => `mod ${i % 20}`).join(' ; ');
		const atelier = atelierWith({ L: definition });

		expect(listOf(atelier, 'L').status).toBe('ok');
		expect(salvageObjects(atelier.serialize().objects).dropped).toBe(0);
	});

	it('M2 : une modalité « titre: Z » reste une modalité, pas une option', () => {
		const chart = listChart(atelierWith({ L: 'titre: Z ; a ; a' }), 'L', null, 'circulaire');

		expect(chart.ok && chart.node.spec?.data.map((d) => [d.label, d.value])).toEqual([
			['titre: Z', 1],
			['a', 2]
		]);
	});

	it('M3 : redevenue numérique, la liste n’a plus de « circulaire » collé', () => {
		const atelier = atelierWith({ L: 'a ; b' });
		atelier.toggleChart('L', null, 'circulaire');
		atelier.update('L', '1 ; 2');

		expect(atelier.chartOf('L')).toEqual({ partner: null });
		expect(actionsFor(listOf(atelier, 'L'), atelier).find((a) => a.id === 'chart')?.label).toBe(
			'Retirer le diagramme'
		);
	});

	it('M4 : refusée (21 modalités), elle garde les actions d’une liste qualitative', () => {
		const definition = Array.from({ length: 21 }, (_, i) => `m${i}`).join(' ; ');
		const atelier = atelierWith({ L: definition });
		const labels = actionsFor(listOf(atelier, 'L'), atelier).map((a) => a.label);

		expect(labels).toContain('Effectifs');
		expect(labels).not.toContain('Nuage de points');
	});
});
