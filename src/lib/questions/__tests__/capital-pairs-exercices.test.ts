/**
 * Sens de deux majuscules collées dans les EXERCICES rédigés (lot 6, décision Q-J)
 * ================================================================================
 *
 * Le contexte seul décide : le thème de l'exercice (`exercises.topic`). `Graphes et
 * matrices` ou un thème de physique → produit ; sinon longueur. Le PDF (`generateTypst`)
 * reçoit le sens par l'option `capitalPairs` ; sans elle, l'écriture d'avant (produit).
 *
 * Témoin visible : `~A'B'=5~` est une ERREUR en produit (« Unexpected token: ' »),
 * une égalité de longueurs en mode longueur.
 */

import { describe, it, expect } from 'vitest';
import { exerciseCapitalPairs } from '../capital-pairs';
import { parseMarkdown } from '$lib/ubumark';
import { generateTypst, processTableCellContent } from '$lib/ubumark/generators/typst-generator';

const PRIMED = "Montrer que ~A'B'=5~.";

describe('exerciseCapitalPairs : le thème de l’exercice décide', () => {
	it.each([
		['Géométrie', 'length'],
		['Géométrie repérée', 'length'],
		['Probabilités', 'length'],
		['Graphes et matrices', 'product'],
		['Physique-chimie', 'product'],
		['  Graphes et matrices  ', 'product']
	] as const)('%s → %s', (topic, expected) => {
		expect(exerciseCapitalPairs(topic)).toBe(expected);
	});

	it('sans thème (null, absent, vide) : longueur', () => {
		expect(exerciseCapitalPairs(null)).toBe('length');
		expect(exerciseCapitalPairs(undefined)).toBe('length');
		expect(exerciseCapitalPairs('')).toBe('length');
	});
});

describe('generateTypst : option capitalPairs', () => {
	const render = (markdown: string, capitalPairs?: 'length' | 'product') =>
		generateTypst(parseMarkdown(markdown), {
			includeSetup: false,
			...(capitalPairs && { capitalPairs })
		});

	it('sans option : écriture d’avant (A′B′ en erreur)', () => {
		expect(render(PRIMED)).toContain('Unexpected token');
	});

	it('produit explicite : identique à sans option', () => {
		expect(render(PRIMED, 'product')).toBe(render(PRIMED));
	});

	it('longueur : A′B′ imprimé, sans erreur', () => {
		const typst = render(PRIMED, 'length');
		expect(typst).not.toContain('Unexpected token');
		expect(typst).toContain("A'B'");
	});

	it('longueur : aussi dans une formule en bloc et dans un tableau', () => {
		const typst = render(`~~A'B'^2~~\n\n| a | b |\n|---|---|\n| ~A'B'~ | 1 |`, 'length');
		expect(typst).not.toContain('Unexpected token');
	});

	it('processTableCellContent reçoit le sens (titre d’exercice)', () => {
		expect(processTableCellContent("~A'B'~", 'fr')).toContain('Unexpected token');
		expect(processTableCellContent("~A'B'~", 'fr', undefined, 'length')).not.toContain(
			'Unexpected token'
		);
	});
});
