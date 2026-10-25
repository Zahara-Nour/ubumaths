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

	// Empreintes figées, produites par le générateur d'avant les cadres (origin/main,
	// 2026-10-15) : sans option, une liste se rend exactement comme avant ; seule
	// différence voulue depuis : l'énoncé collé à ses sous-questions (`tete`, 2026-10-26)
	it.each([
		[
			'liste imbriquée',
			'1. UN\n   1. UNA\n   2. UNB\n2. DEUX',
			'\n#ubu-item(numbering("1)", 1), w: "1)", tete: [UN])[#ubu-item(numbering("a)", 1), w: "a)")[UNA]\n#ubu-item(numbering("a)", 2), w: "a)")[UNB]]\n#ubu-item(numbering("1)", 2), w: "1)")[DEUX]'
		],
		[
			'liste en colonnes',
			':colonnes 2\n1. a\n2. b\n3. c',
			'\n#grid(columns: (1fr, 1fr), column-gutter: 1em, row-gutter: 1.5em,\n  ubu-item(numbering("1)", 1), w: "1)")[a],\n  ubu-item(numbering("1)", 2), w: "1)")[b],\n  ubu-item(numbering("1)", 3), w: "1)")[c]\n)'
		],
		[
			'item qui commence par un bloc',
			'1. $$x^2=4$$\n2. b',
			'\n#ubu-item-bloc(numbering("1)", 1), w: "1)")[$ x^2=4 $]\n#ubu-item(numbering("1)", 2), w: "1)")[b]'
		]
	])('sans option, %s : rendu d’avant', (_name, markdown, expected) => {
		const body = generateTypst(parseMarkdown(markdown), { includeSetup: false }).split(
			'// ubumark: fin de l’en-tête'
		)[1];
		expect(body).toBe(expected);
	});
});

/**
 * Un cadre n'est jamais séparé de la fin de ce qui le précède : s'il ne tient
 * pas en bas de colonne, il emmène la dernière ligne avec lui. Sans rendre
 * insécable tout un énoncé long.
 */
describe('le cadre emmène ce qui le précède', () => {
	/** Le corps, sans l'en-tête (dont `ubu-item` contient un bloc `sticky`) */
	const corps = (out: string) => out.split('// ubumark: fin de l’en-tête')[1];

	/** Le bloc Typst qui contient `marker`, depuis l'ouverture `#block(` la plus proche */
	function enclosingBlock(out: string, marker: string): string {
		return out.slice(out.lastIndexOf('#block(', out.indexOf(marker)), out.indexOf(marker));
	}

	it('question d’un seul bloc : insécable avec son cadre', () => {
		const out = typst((i) => `MARQUE${i}`);
		expect(enclosingBlock(out, 'DEUX')).toContain('breakable: false');
		expect(enclosingBlock(out, 'TROIS')).toContain('breakable: false');
	});

	it('question à sous-questions : seule la dernière sous-question est collée au cadre', () => {
		const out = typst((i) => `MARQUE${i}`);
		expect(enclosingBlock(out, 'UNB')).toContain('sticky: true');
		expect(out).toContain('tete: [UN])[#ubu-item(numbering("a)", 1), w: "a)")[UNA]');
		// La question entière reste sécable
		expect(out.slice(0, out.indexOf('UNA'))).not.toContain('breakable: false');
	});

	it('cadre unique à la fin (`keepEndWithNext`) : dernier bloc collé, pas le reste', () => {
		const paragraphs = generateTypst(parseMarkdown('DEBUT\n\nFIN'), {
			includeSetup: false,
			keepEndWithNext: true
		});
		expect(enclosingBlock(paragraphs, 'FIN')).toContain('sticky: true');
		expect(corps(paragraphs).slice(0, corps(paragraphs).indexOf('DEBUT'))).not.toContain('sticky');

		// Liste finale : son dernier élément seulement
		const list = generateTypst(parseMarkdown('1. PREMIER\n2. DERNIER'), {
			includeSetup: false,
			keepEndWithNext: true
		});
		expect(enclosingBlock(list, 'DERNIER')).toContain('sticky: true');
		expect(corps(list).slice(0, corps(list).indexOf('PREMIER'))).not.toContain('sticky');
	});
});
