/**
 * Bloc ```schema-barres au PDF (texte Typst produit ; compilation réelle :
 * `schema-barres-typst-compilation.test.ts`)
 */

import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '$lib/ubumark';
import { generateTypst } from '$lib/ubumark/generators/typst-generator';
import { generateSchemaBarresTypst } from '$lib/ubumark/generators/schema-barres-typst';
import { parseSchemaBarresContent } from '$lib/ubumark/parser/schema-barres-parser';
import { SCHEMA_BARRES_UNAVAILABLE } from '$lib/ubumark/types/schema-barres';

const typst = (...lines: string[]) =>
	generateSchemaBarresTypst(parseSchemaBarresContent(lines.join('\n')));
const count = (text: string, pattern: RegExp) => (text.match(pattern) ?? []).length;

describe('bloc ```schema-barres au PDF', () => {
	it('9. un rectangle par segment, noir sur fond blanc, pointillés pour la partie manquante', () => {
		const out = typst('Or : ? (4) ; 70 (2)', 'Bronze : ? (2,5) ; -80 (1,5)');
		expect(count(out, /rect\(/g)).toBe(4);
		expect(count(out, /dash: "dashed"/g)).toBe(1);
		expect(count(out, /fill: white/g)).toBe(4);
		expect(out).toContain('paint: black');
		expect(out).not.toContain(SCHEMA_BARRES_UNAVAILABLE);
	});

	it('les noms et étiquettes sont écrits (sans le signe d’une partie manquante)', () => {
		const out = typst('Or : ? (4) ; -80 (2)');
		expect(out).toContain('"Or"');
		expect(out).toContain('"?"');
		expect(out).toContain('"80"');
		expect(out).not.toContain('"-80"');
	});

	it('accolades : des traits ; le texte de `=` et de `total`', () => {
		const out = typst('A : P (3) ; A (2) = 9 €', 'total : 100');
		expect(count(out, /line\(/g)).toBe(12); // deux accolades de 7 sommets
		expect(out).toContain('"9 €"');
		expect(out).toContain('"100"');
	});

	it('sans accolade : aucun trait', () => {
		expect(count(typst('A : ?'), /line\(/g)).toBe(0);
	});

	it('un texte à guillemets ou antislash ne casse pas la chaîne Typst', () => {
		const out = typst('A : "x" ; a\\b');
		expect(out).toContain('"\\"x\\""');
		expect(out).toContain('"a\\\\b"');
	});

	it('bloc en erreur : cadre neutre, jamais une erreur de compilation', () => {
		const out = typst('sans deux-points');
		expect(out).toContain(SCHEMA_BARRES_UNAVAILABLE);
		expect(out).not.toContain('rect(');
	});

	it('branché dans generateTypst, au premier niveau et en liste', () => {
		const out = generateTypst(
			parseMarkdown(
				[
					'```schema-barres',
					'A : ? (2) ; ? (1)',
					'```',
					'',
					'1. Dans une liste :',
					'',
					'   ```schema-barres',
					'   B : ?',
					'   ```'
				].join('\n')
			)
		);
		expect(count(out, /rect\(/g)).toBe(3);
	});
});
