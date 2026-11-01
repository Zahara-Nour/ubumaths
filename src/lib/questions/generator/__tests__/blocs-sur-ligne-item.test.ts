/**
 * Bloc à case ouvert sur la ligne même d'un item (`- ```cubes`) : refusé comme
 * un bloc en retrait (« premier niveau seulement »). Avant le correctif du
 * parseur de listes, ce bloc était lu vide ; une fois lu, il ne doit pas
 * devenir un geste sans case, jamais jugé.
 */

import { describe, it, expect } from 'vitest';
import { assignBlankIndices } from '../assign-blank-indices';

/** `- ```kind`, corps en retrait de deux espaces sous l'item */
const onItemLine = (marker: string, open: string, body: string[]) => {
	const pad = ' '.repeat(marker.length + 1);
	return [`${marker} ${open}`, ...body.map((l) => pad + l), `${pad}${open.match(/^`+/)?.[0]}`].join(
		'\n'
	);
};

describe('bloc à case ouvert sur la ligne d’un item : refusé, aucune case', () => {
	it.each([
		['collection', '```collection', ['construire: 34']],
		['monnaie', '```monnaie', ['construire: 35']],
		['line', '```line', ['start: 0', 'end: 9', 'step: 1', 'placer: 7']],
		['horloge', '```horloge', ['placer: 9 h']],
		['barres', '```barres', ['A = 1', 'axe: 0 à 5', 'placer: A']],
		['ranger', '```ranger', ['- 1', '- 2']],
		['partage', '```partage', ['colorier: 1/2']],
		['cubes', '```cubes', ['hauteurs: 1', 'dessiner: face']],
		['patron', '```patron', ['solide: cube', 'completer: 5']],
		['courbe', '```courbe', ['x: -5 ; 5', 'y: -4 ; 4', 'placer: A=(2 ; 3)']],
		['operation', '```operation', ['calcul: 45 + 37']],
		[
			'figure-a-completer',
			'```figure-a-completer',
			['fenetre: 0 ; 10 ; 0 ; 6', 'verifier: droite_par A ; B', '---']
		],
		['choix', '````choix', ['- a', '- b']]
	])('%s', (_, open, body) => {
		for (const marker of ['-', '1.', 'a)']) {
			const result = assignBlankIndices(onItemLine(marker, open, body));

			expect(result.totalBlanks).toBe(0);
			expect(JSON.stringify(result)).toContain('premier niveau');
		}
	});

	it('bloc à regarder (sans geste) sur la ligne d’un item : rien à signaler', () => {
		const result = assignBlankIndices(onItemLine('-', '```cubes', ['hauteurs: 2 1']));

		expect(result.totalBlanks).toBe(0);
		expect(JSON.stringify(result)).not.toContain('premier niveau');
	});

	// Forme de 4 modèles publiés (relevé en prod le 2026-11-01) : options d'un choix
	it.each([
		['courbe', ['```courbe', 'x: -2 ; 5', 'y: -3 ; 4', 'f(x) = ln(x)   bleu']],
		['monnaie', ['```monnaie', 'billets: 1×10', 'pièces: 2×2']],
		['horloge', ['```horloge', 'heure: 3 h', 'chiffres: tous']]
	])('options ```%s d’un bloc choix, sans geste : une case, rien à signaler', (_, block) => {
		const option = [`- ${block[0]}`, ...block.slice(1).map((l) => `  ${l}`), '  ```'];
		const result = assignBlankIndices(['````choix', ...option, ...option, '````'].join('\n'));

		expect(result.totalBlanks).toBe(1);
		expect(JSON.stringify(result)).not.toContain('premier niveau');
	});
});
