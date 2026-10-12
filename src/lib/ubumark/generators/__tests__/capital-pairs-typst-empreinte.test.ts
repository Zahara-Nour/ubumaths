/**
 * Non-régression du PDF des exercices face au sens de `AB` (lot 6 des longueurs)
 * ==============================================================================
 *
 * Corpus : les 1 299 saisies en syntaxe maison du lot 5
 * (`mathAST/parser/custom/__tests__/fixtures/corpus-syntaxe-maison.json`), dont les 678
 * formules `~…~` à majuscules des exercices de prod. Chaque saisie est imprimée en Typst
 * comme dans un exercice (formule en ligne `~…~` et formule en bloc), et en LaTeX comme à
 * l'écran (`expressionToLatex`). Ce qui est prouvé :
 * 1. l'option `capitalPairs: 'product'` donne exactement la sortie sans option ;
 * 2. en `'length'`, seules changent des saisies à majuscules collées, et aucune formule
 *    imprimable en produit ne devient une erreur.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseMarkdown } from '$lib/ubumark';
import { generateTypst } from '../typst-generator';
import { expressionToLatex } from '$lib/components/markdown/utils/math-utils';
import type { CapitalPairs } from '$lib/mathAST/parser/types';

const CORPUS_PATH = fileURLToPath(
	new URL(
		'../../../mathAST/parser/custom/__tests__/fixtures/corpus-syntaxe-maison.json',
		import.meta.url
	)
);
const CORPUS: { inputs: readonly string[] } = JSON.parse(readFileSync(CORPUS_PATH, 'utf-8'));

/** Deux majuscules collées, avec les décorations d'un point entre elles (primes, indice). */
const ADJACENT_CAPITALS = /[A-Z](?:'+|_\{?[a-z0-9]+\}?)*[A-Z]/;
const ERROR_MARK = /Unexpected|textcolor\{red\}|fill: red/;

/** Saisies qu'une formule `~…~` peut contenir (ni `~`, ni retour à la ligne) */
const INPUTS = CORPUS.inputs.filter((input) => !input.includes('~') && !input.includes('\n'));

function typstOf(input: string, capitalPairs?: CapitalPairs): string {
	const markdown = `Soit ~${input}~.\n\n~~${input}~~`;
	return generateTypst(parseMarkdown(markdown), {
		includeSetup: false,
		...(capitalPairs && { capitalPairs })
	});
}

function renderingOf(input: string, capitalPairs?: CapitalPairs): string {
	return `${typstOf(input, capitalPairs)}\n${expressionToLatex(input, 'custom', undefined, 'fr', capitalPairs)}`;
}

describe('PDF et écran des exercices : empreinte du corpus de la syntaxe maison', () => {
	it('le corpus est bien là (la classe visée y est)', () => {
		expect(INPUTS.length).toBeGreaterThan(1200);
		expect(INPUTS.filter((input) => ADJACENT_CAPITALS.test(input)).length).toBeGreaterThan(300);
	});

	it('produit explicite : sortie identique à sans option, pour chaque saisie', () => {
		const differences = INPUTS.filter(
			(input) => renderingOf(input, 'product') !== renderingOf(input)
		);
		expect(differences).toEqual([]);
	});

	it('longueur : seules changent des saisies à majuscules collées, sans erreur nouvelle', () => {
		const changed = INPUTS.filter((input) => renderingOf(input, 'length') !== renderingOf(input));
		expect(changed.filter((input) => !ADJACENT_CAPITALS.test(input))).toEqual([]);
		const newErrors = changed.filter(
			(input) =>
				ERROR_MARK.test(renderingOf(input, 'length')) && !ERROR_MARK.test(renderingOf(input))
		);
		expect(newErrors).toEqual([]);
		const fixedErrors = changed.filter(
			(input) =>
				!ERROR_MARK.test(renderingOf(input, 'length')) && ERROR_MARK.test(renderingOf(input))
		);
		const typstChanged = INPUTS.filter((input) => typstOf(input, 'length') !== typstOf(input));
		console.info(
			`[empreinte lot 6] ${INPUTS.length} saisies ; en longueur : ${changed.length} changent ` +
				`(écran ou PDF), dont ${typstChanged.length} dans le PDF ; ` +
				`${fixedErrors.length} erreurs disparaissent, 0 nouvelle`
		);
		expect(changed.length).toBeGreaterThan(0);
	});
});
