/**
 * Garde de l'énoncé masqué (chantier `fuite-enonce`, après #2130)
 * ===============================================================
 *
 * Un masque qui ne lit pas son bloc le laisse tel quel : la réponse partirait sans
 * que rien ne le dise. `findUnmaskedAnswers` relit l'énoncé À ENVOYER, sans passer par
 * les masques (lecture du texte), et nomme chaque bloc à geste qui dit encore sa
 * réponse ; `toPublicQuestion` refuse alors d'envoyer la question.
 */
import { describe, it, expect } from 'vitest';
import { findUnmaskedAnswers, maskGestureAnswers } from '../masked-statement';

// Functions
function block(kind: string, ...lines: string[]): string {
	return ['```' + kind, ...lines, '```'].join('\n');
}

// Constantes
const GESTURES: [string, string][] = [
	['line', block('line', 'start: 0', 'end: 20', 'step: 1', 'placer: A=3 ; B=7')],
	['courbe', block('courbe', 'x: -5 ; 5', 'y: -4 ; 4', 'grille: 1', 'placer: A=(2 ; 3)')],
	['horloge', block('horloge', 'placer: 9 h 25')],
	['collection', block('collection', 'construire: 34')],
	['monnaie', block('monnaie', 'construire: 35')],
	['partage', block('partage', 'forme: bande 8', 'colorier: 3/8')],
	['barres', block('barres', 'axe: 0 à 20, de 2 en 2', 'Foot = 12', 'Danse = 7', 'placer: Danse')],
	['cubes', block('cubes', 'hauteurs: 3 1 2 / 1 0 2', 'retrouver: face, droite')],
	['cubes', block('cubes', 'hauteurs:', '  2 1', '  0 3', 'retrouver: gauche')],
	['patron', block('patron', 'solide: cube', 'forme: 1', 'completer: 5')],
	[
		'figure-a-completer',
		block(
			'figure-a-completer',
			'verifier: carre A ; B',
			'---',
			'A = point(1, 2)',
			'B = point(4, 2)'
		)
	]
];

describe('un bloc à geste qui dit encore sa réponse : nommé', () => {
	it.each(GESTURES)('%s', (kind, source) => {
		expect(findUnmaskedAnswers(`Question.\n\n${source}`)).toEqual([kind]);
	});

	it('bloc illisible du même genre : nommé aussi (le masque l’aurait laissé)', () => {
		const broken = block('cubes', 'hauteurs: 3 1 / 1', 'retrouver: face');
		expect(findUnmaskedAnswers(broken)).toEqual(['cubes']);
		const patron = block('patron', 'solide: cube', 'forme: 99', 'completer: 5');
		expect(findUnmaskedAnswers(patron)).toEqual(['patron']);
	});
});

describe('le même bloc masqué : rien à dire', () => {
	it.each(GESTURES)('%s', (_kind, source) => {
		expect(findUnmaskedAnswers(maskGestureAnswers(`Question.\n\n${source}`))).toEqual([]);
	});
});

describe('ce qui n’est pas une réponse à cacher', () => {
	it.each([
		['cubes à dessiner', block('cubes', 'hauteurs: 2 1 / 1 1', 'dessiner: face')],
		['patron à désigner', block('patron', 'solide: cube', 'marquer: face 1', 'designer: opposee')],
		['droite sans geste', block('line', 'start: 0', 'end: 20', 'step: 1', 'labels: 0, 10, 20')],
		['énoncé sans bloc', 'Calcule 3 + 4.']
	])('%s', (_name, source) => {
		expect(findUnmaskedAnswers(source)).toEqual([]);
	});

	it('un bloc dans une option de ```choix (pas un geste)', () => {
		const statement = [
			'```choix',
			'- Cette horloge :',
			'',
			'  ```horloge',
			'  placer: 9 h 25',
			'  ```',
			'- Aucune',
			'```'
		].join('\n');
		expect(maskGestureAnswers(statement)).toBe(statement);
		expect(findUnmaskedAnswers(statement)).toEqual([]);
	});
});
