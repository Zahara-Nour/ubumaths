/**
 * Diagramme en barres à construire (` ```barres ` + `placer:`, chantier
 * `docs/wip/reponses-a-placer-progress.md` § 17, 18)
 *
 * `placer:` nomme les barres que l'élève construit (`placer: toutes` : toutes) ;
 * `axe:` fixe l'axe vertical, obligatoire avec `placer:` (calculé sur les
 * données, il trahirait la plus grande barre).
 */

import { describe, it, expect } from 'vitest';
import {
	findBarsToPlace,
	hasBarsToPlace,
	parseStatChartContent
} from '../../parser/stat-chart-parser';
import { buildStatChartScene, type BarScene } from '../../utils/stat-chart-scene';
import { generateStatChartTypst } from '../../generators/stat-chart-typst';
import { barMistake, barValueAt, barValueOfAnswer, barsToPlace } from '../../utils/barres-placer';

// =============================================================================
// Helpers
// =============================================================================

function nodeOf(...lines: string[]) {
	return parseStatChartContent('barres', lines.join('\n'));
}

function specOf(...lines: string[]) {
	const node = nodeOf(...lines);
	if (node.spec === null) throw new Error(`erreurs inattendues : ${JSON.stringify(node.errors)}`);
	return node.spec;
}

function messagesOf(...lines: string[]) {
	const node = nodeOf(...lines);
	expect(node.spec, 'le bloc devait être en erreur').toBeNull();
	return node.errors.map((e) => e.message);
}

const SPORTS = ['axes: Sport ; Effectif', 'Football = 12', 'Natation = 8', 'Danse = 7'];

// =============================================================================
// `axe:`
// =============================================================================

describe('axe: — l’axe vertical écrit par le prof', () => {
	it('0 à 20, de 2 en 2', () => {
		expect(specOf(...SPORTS, 'axe: 0 à 20, de 2 en 2').axis).toEqual({ max: 20, step: 2 });
	});

	it('sans pas : de 1 en 1', () => {
		expect(specOf(...SPORTS, 'axe: 0 à 15').axis).toEqual({ max: 15, step: 1 });
	});

	it('absent : axe calculé (null)', () => {
		expect(specOf(...SPORTS).axis).toBeNull();
	});

	it('la scène suit l’axe écrit', () => {
		const scene = buildStatChartScene(specOf(...SPORTS, 'axe: 0 à 20, de 2 en 2')) as BarScene;
		expect(scene.yMax).toBe(20);
		expect(scene.ticks.map((t) => t.value)).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
	});

	it.each([
		['axe: 2 à 20', 'Ligne 5 : axe : un diagramme en barres part de 0 (écrire axe: 0 à 20)'],
		['axe: 0 à 20, de 3 en 3', 'Ligne 5 : axe : 20 n’est pas un multiple du pas 3'],
		['axe: 0 à 20 de 2', 'Ligne 5 : axe : écrire « axe: 0 à 20, de 2 en 2 »'],
		['axe: 0 à 0', 'Ligne 5 : axe : le haut de l’axe doit dépasser 0'],
		['axe: 0 à 1000', 'Ligne 5 : axe : au plus 40 graduations (agrandir le pas)']
	])('%s : refusé', (line, message) => {
		expect(messagesOf(...SPORTS, line)).toEqual([message]);
	});

	it('une barre plus haute que l’axe : refusée', () => {
		expect(messagesOf(...SPORTS, 'axe: 0 à 10')).toEqual([
			'Ligne 2 : la barre Football (12) dépasse l’axe (0 à 10)'
		]);
	});

	it('réservé aux diagrammes en barres', () => {
		const node = parseStatChartContent('circulaire', 'A = 1\nB = 2\naxe: 0 à 10');
		expect(node.errors[0].message).toMatch(/l'option « axe » ne s'applique pas/);
	});
});

// =============================================================================
// `placer:`
// =============================================================================

describe('placer: — les barres que l’élève construit', () => {
	it('barres nommées, dans l’ordre des données', () => {
		const spec = specOf(...SPORTS, 'axe: 0 à 20, de 2 en 2', 'placer: Danse ; Natation');
		expect(spec.toPlace).toEqual([1, 2]);
	});

	it('placer: toutes', () => {
		expect(specOf(...SPORTS, 'axe: 0 à 20', 'placer: toutes').toPlace).toEqual([0, 1, 2]);
	});

	it('nom sans tenir compte de la casse', () => {
		expect(specOf(...SPORTS, 'axe: 0 à 20', 'placer: danse').toPlace).toEqual([2]);
	});

	it('absent : rien à construire (null)', () => {
		expect(specOf(...SPORTS).toPlace).toBeNull();
	});

	it('avec données: (série brute) : l’élève compte puis construit', () => {
		const spec = specOf('données: 2 ; 3 ; 2 ; 2 ; 5', 'axe: 0 à 5', 'placer: 2');
		expect(spec.toPlace).toEqual([0]);
		expect(barsToPlace(spec)).toEqual([{ index: 0, label: '2', expected: 3 }]);
	});

	it('effectif 0 attendu : permis', () => {
		expect(specOf('A = 3', 'B = 0', 'axe: 0 à 5', 'placer: B').toPlace).toEqual([1]);
	});

	it.each([
		[
			['placer: Danse'],
			'Ligne 5 : placer : écrire aussi l’axe vertical (axe: 0 à 20, de 2 en 2, ou axe: à choisir) : calculé, il trahirait la plus grande barre'
		],
		[
			['axe: 0 à 20', 'placer: Rugby'],
			'Ligne 6 : placer : « Rugby » n’est pas une catégorie du diagramme'
		],
		[['axe: 0 à 20', 'placer: Danse ; danse'], 'Ligne 6 : placer : « danse » nommée deux fois'],
		[['axe: 0 à 20', 'placer:'], 'Ligne 6 : placer : nommer les barres à construire, ou toutes'],
		[
			['axe: 0 à 20', 'valeurs: oui', 'placer: Danse'],
			'Ligne 7 : placer : impossible avec valeurs: oui (l’effectif attendu serait écrit)'
		]
	])('%j : refusé', (extra, message) => {
		expect(messagesOf(...SPORTS, ...extra)).toEqual([message]);
	});

	it('indicateurs: refusés (l’effectif total ou la moyenne donneraient la barre)', () => {
		expect(
			messagesOf('0 = 1', '1 = 2', '2 = 3', 'indicateurs: effectif', 'axe: 0 à 5', 'placer: 2')
		).toEqual([
			'Ligne 6 : placer : impossible avec indicateurs: (l’effectif attendu se déduirait)'
		]);
	});

	it('casse : le nom exact d’abord, ambigu sinon', () => {
		expect(specOf('Lundi = 1', 'lundi = 2', 'axe: 0 à 5', 'placer: lundi').toPlace).toEqual([1]);
		expect(messagesOf('Lundi = 1', 'lundi = 2', 'axe: 0 à 5', 'placer: LUNDI')).toEqual([
			'Ligne 4 : placer : « LUNDI » désigne plusieurs catégories (écrire le nom exact)'
		]);
	});

	it('axe au-delà de 100 : refusé (l’unité ne se viserait plus au doigt)', () => {
		expect(messagesOf('A = 1200', 'B = 2500', 'axe: 0 à 4000, de 100 en 100', 'placer: A')).toEqual(
			['Ligne 4 : placer : axe jusqu’à 100 au plus (au-delà, l’élève ne viserait plus l’unité)']
		);
		expect(specOf('A = 60', 'B = 99', 'axe: 0 à 100, de 10 en 10', 'placer: B').toPlace).toEqual([
			1
		]);
	});

	it('axe au-delà de 100 sans placer: : permis', () => {
		expect(specOf('A = 1200', 'axe: 0 à 4000, de 100 en 100').axis).toEqual({
			max: 4000,
			step: 100
		});
	});

	it('pourcentages : refusés', () => {
		expect(messagesOf('A = 40 %', 'B = 60 %', 'axe: 0 à 100, de 10 en 10', 'placer: A')).toEqual([
			'Ligne 4 : placer : des effectifs, pas des pourcentages'
		]);
	});

	it('effectif attendu non entier : déjà refusé à sa ligne', () => {
		expect(messagesOf('A = 2,5', 'B = 3', 'axe: 0 à 5', 'placer: A')).toEqual([
			'Ligne 1 : un effectif est un nombre entier (reçu 2,5) ; pour une fréquence, écrire un pourcentage (35 %)'
		]);
	});

	it('deux séries : refusé', () => {
		const messages = messagesOf(
			'données Garçons: 1 ; 2 ; 2',
			'données Filles: 1 ; 1 ; 2',
			'axe: 0 à 5',
			'placer: toutes'
		);
		expect(messages).toEqual(['Ligne 4 : placer : une seule série']);
	});

	it('réservé aux diagrammes en barres', () => {
		const node = parseStatChartContent('circulaire', 'A = 1\nB = 2\nplacer: A');
		expect(node.errors[0].message).toMatch(/l'option « placer » ne s'applique pas/);
	});
});

// =============================================================================
// `case:` (posée par le générateur)
// =============================================================================

describe('case: — le numéro de la première case', () => {
	it('avec placer: : lu', () => {
		const node = nodeOf('case: 3', ...SPORTS, 'axe: 0 à 20', 'placer: Danse');
		expect(node.spec).not.toBeNull();
		expect(node.caseIndex).toBe(3);
	});

	it('sans placer: : refusé', () => {
		expect(messagesOf('case: 0', ...SPORTS)).toEqual(['Ligne 1 : case: sans objet sans placer:']);
	});
});

// =============================================================================
// Repérage dans un énoncé
// =============================================================================

describe('findBarsToPlace', () => {
	const block = ['```barres', ...SPORTS, 'axe: 0 à 20', 'placer: Danse', '```'];

	it('repère le bloc, son corps et sa fermeture', () => {
		const found = findBarsToPlace(['Construis.', '', ...block].join('\n'));
		expect(found).toEqual([
			{ startIndex: 2, body: block.slice(1, -1), closed: true, nested: false }
		]);
		expect(hasBarsToPlace(block.join('\n'))).toBe(true);
	});

	it('diagramme à lire : rien', () => {
		expect(hasBarsToPlace(['```barres', ...SPORTS, '```'].join('\n'))).toBe(false);
	});

	it('bloc cité : nested', () => {
		const quoted = block.map((line) => `> ${line}`).join('\n');
		expect(findBarsToPlace(quoted)[0].nested).toBe(true);
	});
});

// =============================================================================
// Scène : rien ne trahit la réponse
// =============================================================================

describe('scène d’un diagramme à construire', () => {
	const spec = () => specOf(...SPORTS, 'axe: 0 à 20, de 2 en 2', 'placer: Natation ; Danse');

	it('les barres à construire sont marquées', () => {
		const scene = buildStatChartScene(spec()) as BarScene;
		expect(scene.bars.map((b) => b.toPlace ?? false)).toEqual([false, true, true]);
	});

	it('la description ne dit pas les effectifs attendus', () => {
		const scene = buildStatChartScene(spec()) as BarScene;
		expect(scene.description).toContain('Football 12');
		expect(scene.description).not.toContain('8');
		expect(scene.description).not.toContain('7');
		expect(scene.description).toContain('Natation à construire');
	});
});

// =============================================================================
// PDF : l'enfant dessine les barres à construire
// =============================================================================

describe('PDF d’un diagramme à construire', () => {
	it('axe écrit, barres à construire absentes, noms des catégories présents', () => {
		const node = nodeOf(...SPORTS, 'axe: 0 à 20, de 2 en 2', 'placer: Natation ; Danse');
		const typst = generateStatChartTypst(node);
		expect(typst.match(/\/\/ barre\n/g)).toHaveLength(1);
		expect(typst).toContain('[20]');
		expect(typst).toContain('Natation');
		expect(typst).toContain('Danse');
	});
});

// =============================================================================
// Calcul pur
// =============================================================================

describe('barres-placer — calcul pur', () => {
	it('barValueOfAnswer : vide = pas construite', () => {
		expect(barValueOfAnswer('')).toBeNull();
		expect(barValueOfAnswer('12')).toBe(12);
		expect(barValueOfAnswer('0')).toBe(0);
		expect(barValueOfAnswer('abc')).toBeNull();
	});

	it('barValueAt : aimant à l’unité, borné à l’axe', () => {
		const axis = { max: 20, step: 2 };
		expect(barValueAt(axis, 0.35)).toBe(7);
		expect(barValueAt(axis, 0.61)).toBe(12);
		expect(barValueAt(axis, -0.2)).toBe(0);
		expect(barValueAt(axis, 1.4)).toBe(20);
	});

	it('barMistake : barre fausse, barre absente, barre juste', () => {
		expect(barMistake('Danse', 9, 7)).toBe('Ta barre Danse monte à 9.');
		expect(barMistake('Danse', null, 7)).toBe('Tu n’as pas construit la barre Danse.');
		expect(barMistake('Danse', 7, 7)).toBeNull();
	});
});
