/**
 * Éditeur de modèle : contexte (la branche de « Rangé dans ») et déclaration à l'enregistrement
 * ADR 0035 : un modèle n'a plus de thème, seule la branche de l'arbre fait contexte.
 */
import { describe, it, expect } from 'vitest';
import { capitalPairsContextOf, capitalPairsToWrite, resolveCapitalPairs } from '../capital-pairs';

describe('capitalPairsContextOf : le nom de la branche', () => {
	it('la branche décide', () => {
		expect(capitalPairsContextOf('Matrices')).toBe('Matrices');
		expect(capitalPairsContextOf('  Graphes ')).toBe('Graphes');
	});
	it('pas de branche (modèle pas encore rangé) : vide', () => {
		expect(capitalPairsContextOf(undefined)).toBe('');
		expect(capitalPairsContextOf(null)).toBe('');
	});
});

describe('branches Matrices et Graphes : contexte « produit »', () => {
	it.each(['Matrices', 'Graphes', 'Graphes et matrices'])('%s → produit', (name) => {
		expect(resolveCapitalPairs({ context: name })).toMatchObject({
			capitalPairs: 'product',
			source: 'context'
		});
	});
	it('une autre branche reste une longueur', () => {
		expect(resolveCapitalPairs({ context: 'Géométrie' }).capitalPairs).toBe('length');
	});
	it('physique reste un contexte produit', () => {
		expect(resolveCapitalPairs({ context: 'Physique-chimie' }).capitalPairs).toBe('product');
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
