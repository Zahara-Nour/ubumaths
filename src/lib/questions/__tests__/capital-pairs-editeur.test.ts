/**
 * Éditeur de modèle : contexte (thème ancien, sinon branche) et déclaration à l'enregistrement
 * ADR 0035, lot 3a : un modèle neuf n'a plus de thème, la branche de « Rangé dans » le remplace.
 */
import { describe, it, expect } from 'vitest';
import { capitalPairsContextOf, capitalPairsToWrite, resolveCapitalPairs } from '../capital-pairs';

describe('capitalPairsContextOf : ancien thème, sinon nom de la branche', () => {
	it('le thème du modèle passe avant la branche', () => {
		expect(capitalPairsContextOf('Algèbre', 'Matrices')).toBe('Algèbre');
	});
	it('sans thème (modèle neuf ou copie), la branche décide', () => {
		expect(capitalPairsContextOf('', 'Matrices')).toBe('Matrices');
		expect(capitalPairsContextOf(null, 'Graphes')).toBe('Graphes');
		expect(capitalPairsContextOf('  ', 'Graphes')).toBe('Graphes');
	});
	it('ni thème ni branche : vide', () => {
		expect(capitalPairsContextOf(undefined, undefined)).toBe('');
	});
});

describe('branches Matrices et Graphes : contexte « produit »', () => {
	it.each(['Matrices', 'Graphes', 'Graphes et matrices'])('%s → produit', (name) => {
		expect(resolveCapitalPairs({ theme: name })).toMatchObject({
			capitalPairs: 'product',
			source: 'context'
		});
	});
	it('une autre branche reste une longueur', () => {
		expect(resolveCapitalPairs({ theme: 'Géométrie' }).capitalPairs).toBe('length');
	});
	it('physique reste un contexte produit', () => {
		expect(resolveCapitalPairs({ theme: 'Physique-chimie' }).capitalPairs).toBe('product');
	});
});

describe('capitalPairsToWrite : valeur de shared.capitalPairs à l’enregistrement', () => {
	it('choix explicite : écrit tel quel, quel que soit le contexte', () => {
		expect(capitalPairsToWrite('length', 'Matrices')).toBe('length');
		expect(capitalPairsToWrite('product', 'Géométrie')).toBe('product');
	});
	it('auto + contexte produit : écrit « product » explicitement', () => {
		expect(capitalPairsToWrite('auto', 'Matrices')).toBe('product');
		expect(capitalPairsToWrite('auto', 'Graphes et matrices')).toBe('product');
	});
	it('auto + contexte longueur ou vide : rien n’est écrit', () => {
		expect(capitalPairsToWrite('auto', 'Géométrie')).toBeUndefined();
		expect(capitalPairsToWrite('auto', '')).toBeUndefined();
	});
});
