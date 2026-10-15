/**
 * Option `afterQuestion` du générateur Typst (cadres de réponse, ADR 0030 lot 3)
 *
 * Ce qu'elle rend est posé à la fin de chaque élément de PREMIER niveau des
 * listes numérotées de premier niveau, après ses sous-éléments ; l'index court
 * d'une liste à l'autre. Sans l'option, rien ne change.
 */
import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '$lib/ubumark';
import { generateTypst } from '../typst-generator';

const SOURCE = [
	'Partie A',
	'',
	'1. UN',
	'   1. UNA',
	'   2. UNB',
	'2. DEUX',
	'',
	'Partie B',
	'',
	'1. TROIS',
	'',
	'- PUCE'
].join('\n');

function typst(afterQuestion?: (index: number) => string): string {
	return generateTypst(parseMarkdown(SOURCE), { includeSetup: false, afterQuestion });
}

describe('afterQuestion', () => {
	it('un appel par question, index continu à travers les listes', () => {
		const out = typst((i) => `MARQUE${i}`);
		expect(out.match(/MARQUE\d/g)).toEqual(['MARQUE0', 'MARQUE1', 'MARQUE2']);
	});

	it('à la fin de la question, après ses sous-questions', () => {
		const out = typst((i) => `MARQUE${i}`);
		expect(out.indexOf('MARQUE0')).toBeGreaterThan(out.indexOf('UNB'));
		expect(out.indexOf('MARQUE0')).toBeLessThan(out.indexOf('DEUX'));
		expect(out.indexOf('MARQUE2')).toBeGreaterThan(out.indexOf('TROIS'));
		expect(out.indexOf('MARQUE2')).toBeLessThan(out.indexOf('PUCE'));
	});

	it('sans l’option : rendu inchangé', () => {
		expect(typst()).toBe(typst(() => ''));
	});
});
