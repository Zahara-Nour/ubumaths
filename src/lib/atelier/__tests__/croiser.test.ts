/**
 * `.croiser L M` — tableau croisé de deux listes qualitatives, une entrée par
 * individu (outils statistiques v2, lot 2, PR (b), Q88-Q89, 2026-10-02 ;
 * 2de `2-175`). Le tableau de la v1, sous la ligne de l'historique.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';
import { commandCatalog } from '../commands';
import { actionsFor } from '../actions';
import { CalcDesk } from '../desk.svelte';
import type { CrossTableScene } from '$lib/ubumark/utils/stat-chart-scene';

function session(lists: Record<string, string>): CalcSession {
	const atelier = new Atelier();
	for (const [name, definition] of Object.entries(lists)) {
		atelier.create({ kind: 'list', name, definition });
	}
	return { atelier, engine: new WebReplEngine() };
}

const SURVEY = { L: 'fille ; garçon ; fille ; garçon', M: 'oui ; oui ; non ; oui' };

const table = (s: CalcSession, input: string) => {
	const result = runInput(s, input);
	if (result.kind !== 'commande') throw new Error(`refus : ${JSON.stringify(result)}`);
	return { result, scene: result.chart as CrossTableScene };
};

const texts = (scene: CrossTableScene) =>
	scene.rows.map((row) => [row.header, ...row.cells.map((c) => c.text)]);

describe('la commande se découvre', () => {
	it('« croiser » au catalogue, avec son exemple et son décor', () => {
		const entry = commandCatalog(new WebReplEngine()).find((c) => c.french === 'croiser');

		expect(entry?.example).toBe('.croiser L M');
		expect(entry?.exampleSetup).toBeDefined();
	});
});

describe('cas nominal', () => {
	it('effectifs, totaux, ordre d’apparition, coin « L \\ M »', () => {
		const s = session(SURVEY);
		const { result, scene } = table(s, '.croiser L M');

		expect(result.output).toBe('Tableau croisé de L (lignes) et M (colonnes), 4 individus');
		expect(scene.kind).toBe('tableau-croise');
		expect(scene.corner).toBe('L \\ M');
		expect(scene.columnHeaders).toEqual(['oui', 'non', 'Total']);
		expect(texts(scene)).toEqual([
			['fille', '1', '1', '2'],
			['garçon', '2', '0', '2'],
			['Total', '3', '1', '4']
		]);
		expect(s.atelier.objects).toHaveLength(2);
	});

	it('lignes : fréquences conditionnelles par ligne', () => {
		const { scene } = table(session(SURVEY), '.croiser L M lignes');

		expect(texts(scene)[0]).toEqual(['fille', '50 %', '50 %', '100 %']);
	});

	it.each([
		['fréquences', 'fille', '25 %'],
		['frequences', 'fille', '25 %'],
		['colonnes', 'garçon', '66,7 %']
	])('option %s', (option, header, first) => {
		const { scene } = table(session(SURVEY), `.croiser L M ${option}`);

		expect(scene.rows.find((r) => r.header === header)?.cells[0].text).toBe(first);
	});
});

describe('cas d’erreur — message, rien de créé', () => {
	it.each([
		[
			'longueurs différentes',
			{ L: 'a ; b ; a ; b', M: 'x ; y ; x' },
			'.croiser L M',
			'L a 4 entrées et M 3 : il faut une entrée par individu.'
		],
		[
			'une liste de nombres',
			{ L: 'a ; b', M: '1 ; 2' },
			'.croiser L M',
			'M est une liste de nombres : le tableau croisé croise deux listes de mots.'
		],
		['liste inconnue', SURVEY, '.croiser L P', '« P » n’est pas une liste de l’atelier.'],
		[
			'option inconnue',
			SURVEY,
			'.croiser L M pourcentages',
			'Écris la commande ainsi : .croiser L M, ou avec lignes, colonnes ou fréquences.'
		],
		[
			'deux fois la même liste',
			SURVEY,
			'.croiser L L',
			'Croise deux listes différentes : .croiser L M.'
		],
		// Revue : `Total` est réservé aux totaux, comme dans un bloc de la v1
		[
			'une modalité « Total »',
			{ L: 'Total ; autre', M: 'oui ; non' },
			'.croiser L M',
			'« Total » est réservé aux totaux du tableau : renomme cette modalité dans L.'
		],
		// Revue : une liste REFUSÉE (25 modalités) était croisée, modalités brutes
		[
			'une liste refusée',
			{
				L: Array.from({ length: 25 }, (_, i) => `m${i}`).join(' ; '),
				M: Array.from({ length: 25 }, () => 'x').join(' ; ')
			},
			'.croiser L M',
			'Une liste qualitative a au plus 20 modalités (celle-ci en a 25).'
		]
	])('%s', (_, lists, input, message) => {
		const s = session(lists);
		const before = s.atelier.objects.length;

		expect(runInput(s, input)).toEqual({ kind: 'refus', message });
		expect(s.atelier.objects.length).toBe(before);
	});
});

describe('l’action « Tableau croisé avec M »', () => {
	it('active si M est qualitative et de même longueur ; prépare la commande', () => {
		const s = session(SURVEY);
		const action = actionsFor(s.atelier.get('L')!, s.atelier, 'M').find((a) => a.id === 'cross:M');
		expect(action?.label).toBe('Tableau croisé avec M');
		expect(action?.disabledReason).toBeUndefined();

		const desk = new CalcDesk(s.atelier);
		expect(desk.runFromPanel('cross:M', 'L')).toBe('needs-argument');
		expect(desk.draft).toBe('.croiser L M');
	});

	it.each([
		[
			{ L: 'a ; b', M: '1 ; 2' },
			'M est une liste de nombres : le tableau croisé croise deux listes de mots.'
		],
		[{ L: 'a ; b ; c', M: 'x ; y' }, 'L a 3 entrées et M 2 : il faut une entrée par individu.']
	])('désactivée avec sa raison (%#)', (lists, reason) => {
		const s = session(lists);
		const action = actionsFor(s.atelier.get('L')!, s.atelier, 'M').find((a) => a.id === 'cross:M');

		expect(action?.disabledReason).toBe(reason);
	});

	it('la carte d’une liste qualitative reste sous 10 boutons', () => {
		const s = session({ ...SURVEY, N: 'x ; y ; x ; y' });

		expect(actionsFor(s.atelier.get('L')!, s.atelier).length).toBeLessThanOrEqual(10);
	});
});

describe('revue — le bouton suit la commande', () => {
	it('depuis M, « Tableau croisé avec L » désactivé quand L est refusée', () => {
		const s = session({
			M: Array.from({ length: 25 }, () => 'x').join(' ; '),
			L: Array.from({ length: 25 }, (_, i) => `m${i}`).join(' ; ')
		});
		const action = actionsFor(s.atelier.get('M')!, s.atelier, 'L').find((a) => a.id === 'cross:L');

		expect(action?.disabledReason).toBe(
			'Une liste qualitative a au plus 20 modalités (celle-ci en a 25).'
		);
	});
});
