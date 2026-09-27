/**
 * Affichage d'une grandeur insérée dans un contenu (énoncé, correction)
 * ======================================================================
 *
 * Une grandeur calculée (`{{eval:4*a}}` → `28[mm]`, chantier Grandeurs) s'affichait BRUTE
 * dès qu'elle n'était pas seule dans sa formule : `$$ 7[mm] \times 4 = 28[mm] $$` (formule
 * mêlée de LaTeX d'auteur, que la conversion maison → LaTeX laisse telle quelle), dans un
 * `\frac`, ou dans le texte (« la réponse est 28[mm] »). Relevé par le lot 4 (#485).
 */

import { describe, it, expect } from 'vitest';
import { resolveMarkdownContent } from '../content-resolver';
import { templateMarkdown } from '$lib/ubumark';
import type { ResolvedVariable } from '../../types';

const VARS: ResolvedVariable[] = [
	{ name: 'a', value: '7[mm]' },
	{ name: 'b', value: '28[mm]' },
	{ name: 'c', value: '5.003[km]' },
	{ name: 'h', value: '{2[h]}{15[min]}' },
	{ name: 'n', value: '-3[m]' }
] as ResolvedVariable[];

const resolve = (content: string) =>
	String(resolveMarkdownContent(templateMarkdown(content), VARS));

describe('grandeur dans une formule LaTeX d’auteur', () => {
	it.each([
		['$$ {{a}} \\times 4 = {{b}} $$', '$$ 7~\\unit{mm} \\times 4 = 28~\\unit{mm} $$'],
		['$\\frac{{{b}}}{2}$', '$\\frac{28~\\unit{mm}}{2}$'],
		['$ {{c}} \\approx 5 $', '$ 5.003~\\unit{km} \\approx 5 $'],
		['$ {{n}} \\times 2 $', '$ -3~\\unit{m} \\times 2 $']
	])('%s → %s', (content, expected) => {
		expect(resolve(content)).toBe(expected);
	});

	it('durée composée (;hms) : « 2 h 15 min », séparées par une espace', () => {
		expect(resolve('$ {{h}} \\approx 2 $')).toBe('$ 2~\\unit{h}~15~\\unit{min} \\approx 2 $');
	});
});

describe('grandeur dans le texte', () => {
	it.each([
		['la réponse est {{b}}.', 'la réponse est $28~\\unit{mm}$.'],
		['durée {{h}} ici', 'durée $2~\\unit{h}~15~\\unit{min}$ ici']
	])('%s → %s', (content, expected) => {
		expect(resolve(content)).toBe(expected);
	});
});

describe('non-régression', () => {
	it('une variable seule dans sa formule : inchangé', () => {
		expect(resolve('$$ {{a}} $$')).toBe('$$7~\\unit{mm}$$');
	});

	it('une zone maison ~…~ reste en syntaxe maison', () => {
		expect(resolve('~{{a}}*4 = {{b}}~')).toBe('~7[mm]*4 = 28[mm]~');
	});

	it.each([
		['$ 2[x+1] \\times 3 $', 'crochet de calcul'],
		['$ 3[xyz] \\times 1 $', 'unité inconnue'],
		['le tableau [cm] ci-dessous', 'crochet sans nombre']
	])('%s (%s) : inchangé', (content) => {
		expect(resolve(content)).toBe(content);
	});
});

// Relecture de #486
describe('relecture : ce qui ne doit pas être coupé ni converti', () => {
	it.each([
		['la corde mesure 1,5[m] environ', 'décimal à virgule d’auteur'],
		['nombre groupé 12{}345[m] ici', 'valeur groupée par removeSpaces'],
		['du code `x = 28[mm]` ici', 'code en ligne'],
		['```\nx = 28[mm]\n```', 'bloc de code']
	])('%s (%s) : inchangé', (content) => {
		expect(resolve(content)).toBe(content);
	});
});
