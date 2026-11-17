/**
 * Bloc ```schema-barres — analyse (spécification : `docs/wip/schema-barres-progress.md` § 2,
 * comportements 1 à 18)
 */

import { describe, expect, it } from 'vitest';
import {
	findSchemaBarresBlocks,
	parseSchemaBarresContent
} from '$lib/ubumark/parser/schema-barres-parser';

const parse = (...lines: string[]) => parseSchemaBarresContent(lines.join('\n'));

describe('bloc ```schema-barres — nominal', () => {
	it('1. une ligne = une barre, dans l’ordre du texte, nom libre', () => {
		const node = parse('Or : ? (4) ; 70 (2)', 'Argent : ? (4)');
		expect(node.errors).toEqual([]);
		expect(node.spec?.bars.map((b) => b.name)).toEqual(['Or', 'Argent']);
		expect(node.spec?.bars[0].segments).toEqual([
			{ label: '?', length: 4, missing: false },
			{ label: '70', length: 2, missing: false }
		]);
	});

	it('1. nom vide : `: ? ; ?`', () => {
		const node = parse(': ? ; ?');
		expect(node.errors).toEqual([]);
		expect(node.spec?.bars[0].name).toBe('');
		expect(node.spec?.bars[0].segments).toHaveLength(2);
	});

	it('2. étiquette seule : longueur 1 ; virgule ou point décimal', () => {
		const node = parse('A : ? ; 70 € (1,5) ; P (2.5)');
		expect(node.errors).toEqual([]);
		expect(node.spec?.bars[0].segments).toEqual([
			{ label: '?', length: 1, missing: false },
			{ label: '70 €', length: 1.5, missing: false },
			{ label: 'P', length: 2.5, missing: false }
		]);
	});

	it('4. étiquette commençant par `-` : partie manquante, étiquette sans le signe', () => {
		const node = parse('Bronze : ? (2,5) ; -80 (1,5)');
		expect(node.spec?.bars[0].segments[1]).toEqual({ label: '80', length: 1.5, missing: true });
	});

	it('5. `= texte` en fin de ligne : accolade sous la barre', () => {
		const node = parse('Pastèques : P (3) ; A (2) = 9 €');
		expect(node.errors).toEqual([]);
		expect(node.spec?.bars[0].brace).toBe('9 €');
		expect(node.spec?.bars[0].segments).toHaveLength(2);
	});

	it('5. sans `=` : pas d’accolade', () => {
		expect(parse('A : ? (2)').spec?.bars[0].brace).toBeUndefined();
	});

	it('6. `total : texte` : accolade verticale, pas une barre (casse indifférente)', () => {
		const node = parse('Or : ? (4)', 'Argent : ? (4)', 'Total : 320 €');
		expect(node.errors).toEqual([]);
		expect(node.spec?.bars).toHaveLength(2);
		expect(node.spec?.total).toBe('320 €');
		expect(parse('A : ?', 'TOTAL : 100').spec?.total).toBe('100');
	});

	it('6. la ligne total peut venir avant les barres', () => {
		const node = parse('total : 100', 'A : ?');
		expect(node.spec?.total).toBe('100');
		expect(node.spec?.bars).toHaveLength(1);
	});

	it('le nœud garde la source et son type', () => {
		const node = parse('A : ?');
		expect(node.type).toBe('schema-barres');
		expect(node.source).toBe('A : ?');
	});
});

describe('bloc ```schema-barres — limites', () => {
	it('12. lignes vides et espaces autour des `;`, `:`, `=` ignorés', () => {
		const node = parse('', '  Or:?(4);70 (2)  =  9 €', '', ' total:  3 ');
		expect(node.errors).toEqual([]);
		expect(node.spec?.bars[0].name).toBe('Or');
		expect(node.spec?.bars[0].segments.map((s) => s.length)).toEqual([4, 2]);
		expect(node.spec?.bars[0].brace).toBe('9 €');
		expect(node.spec?.total).toBe('3');
	});

	it('13. une seule barre, un seul segment', () => {
		const node = parse('A : ?');
		expect(node.errors).toEqual([]);
		expect(node.spec?.bars).toHaveLength(1);
		expect(node.spec?.bars[0].segments).toHaveLength(1);
	});

	it('14. 6 barres et 12 segments permis ; longueurs 0,1 et 50 permises', () => {
		const bars = Array.from({ length: 6 }, (_, i) => `B${i} : ?`);
		expect(parse(...bars).errors).toEqual([]);
		const segments = Array.from({ length: 12 }, () => '?').join(' ; ');
		expect(parse(`A : ${segments}`).errors).toEqual([]);
		expect(parse('A : ? (0,1) ; ? (50)').errors).toEqual([]);
	});
});

describe('bloc ```schema-barres — erreurs', () => {
	it('16. ligne sans `:`', () => {
		const node = parse('A : ? (2)', 'Argent ? (4)');
		expect(node.spec).toBeNull();
		expect(node.errors).toEqual([
			'Ligne 2 : écris le nom de la barre, puis « : », puis ses segments.'
		]);
	});

	it('17. segment vide', () => {
		const node = parse('A : ? ; ; 7');
		expect(node.spec).toBeNull();
		expect(node.errors[0]).toMatch(/^Ligne 1 : .*segment vide/);
	});

	it('17. longueur illisible, nulle, négative, hors bornes', () => {
		for (const length of ['abc', '0', '-2', '51', '0,05', '1,2,3']) {
			const node = parse(`A : ? (${length})`);
			expect(node.spec, length).toBeNull();
			expect(node.errors[0], length).toMatch(/^Ligne 1 : .*longueur/);
		}
	});

	it('17. parenthèse non fermée', () => {
		for (const text of ['? (4', '? 4)', '? (4 ; 7']) {
			const node = parse(`A : ${text}`);
			expect(node.spec, text).toBeNull();
			expect(node.errors[0], text).toMatch(/^Ligne 1 : .*parenthèse/);
		}
	});

	it('18. aucune barre', () => {
		expect(parse('').spec).toBeNull();
		expect(parse('').errors[0]).toMatch(/^Ligne 1 : .*au moins une barre/);
		const onlyTotal = parse('total : 100');
		expect(onlyTotal.spec).toBeNull();
		expect(onlyTotal.errors[0]).toMatch(/au moins une barre/);
	});

	it('18. plus de 6 barres', () => {
		const bars = Array.from({ length: 7 }, (_, i) => `B${i} : ?`);
		const node = parse(...bars);
		expect(node.spec).toBeNull();
		expect(node.errors[0]).toMatch(/^Ligne 7 : .*6 barres/);
	});

	it('18. plus de 12 segments', () => {
		const segments = Array.from({ length: 13 }, () => '?').join(' ; ');
		const node = parse(`A : ${segments}`);
		expect(node.spec).toBeNull();
		expect(node.errors[0]).toMatch(/^Ligne 1 : .*12 segments/);
	});

	it('18. total écrit deux fois ou vide', () => {
		const twice = parse('A : ?', 'total : 1', 'total : 2');
		expect(twice.spec).toBeNull();
		expect(twice.errors[0]).toMatch(/^Ligne 3 : .*total.*ligne 2/);
		const empty = parse('A : ?', 'total :');
		expect(empty.spec).toBeNull();
		expect(empty.errors[0]).toMatch(/^Ligne 2 : .*total/);
	});

	it('18. `=` vide', () => {
		const node = parse('A : ? (2) =');
		expect(node.spec).toBeNull();
		expect(node.errors[0]).toMatch(/^Ligne 1 : .*=/);
	});

	it('18. barre faite seulement de parties manquantes', () => {
		const node = parse('A : -? (2) ; -5');
		expect(node.spec).toBeNull();
		expect(node.errors[0]).toMatch(/^Ligne 1 : .*parties manquantes/);
	});

	it('18 bis. barre sans nom faite seulement de parties manquantes : désignée par son rang', () => {
		const node = parse(': ? (2)', ': -x (2)');
		expect(node.errors[0]).toMatch(/^Ligne 2 : la barre n° 2 n’a que des parties manquantes/);
	});

	it('plusieurs erreurs : toutes situées, dans l’ordre', () => {
		const node = parse('A ? (2)', 'B : ? (0)', 'C : ? ; ; ?');
		expect(node.errors.map((e) => e.slice(0, 8))).toEqual(['Ligne 1 ', 'Ligne 2 ', 'Ligne 3 ']);
	});
});

describe('repérage du bloc', () => {
	it('bloc fermé : lignes de l’ouverture à la clôture', () => {
		const lines = ['avant', '```schema-barres', 'A : ?', '```', 'après'];
		expect(findSchemaBarresBlocks(lines)).toEqual([{ startIndex: 1, endIndex: 3 }]);
	});

	it('bloc non fermé : s’arrête à la première ligne vide', () => {
		const lines = ['```schema-barres', 'A : ?', '', 'suite'];
		expect(findSchemaBarresBlocks(lines)).toEqual([{ startIndex: 0, endIndex: 1 }]);
	});
});
