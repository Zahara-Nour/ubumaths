/**
 * Bloc ```operation au PDF (texte Typst produit ; compilation réelle :
 * `operation-typst-compilation.test.ts`)
 */

import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '$lib/ubumark';
import { generateTypst } from '$lib/ubumark/generators/typst-generator';
import { generateOperationTypst } from '$lib/ubumark/generators/operation-typst';
import { parseOperationContent } from '$lib/ubumark/parser/operation-parser';
import { OPERATION_UNAVAILABLE } from '$lib/ubumark/types/operation';

const typst = (...lines: string[]) =>
	generateOperationTypst(parseOperationContent(lines.join('\n')));

describe('bloc ```operation au PDF', () => {
	it('à remplir : grille de carreaux, termes écrits, résultat vide, trait sous le dernier terme', () => {
		const out = typst('calcul: 45 + 37');
		// Signe + 3 colonnes de chiffres
		expect(out).toContain('columns: (0.7cm,) * 4');
		expect(out).toContain('table.hline(y: 3,');
		expect(out).toContain('[+]');
		for (const d of ['4', '5', '3', '7']) expect(out).toContain(`[#[${d}]]`);
		// Ni le résultat ni la retenue
		expect(out).not.toContain('[#[8]]');
		expect(out).not.toContain('[#[2]]');
		expect(out).not.toContain('text(size: 7pt)');
	});

	it('résolue : résultat et retenues écrits', () => {
		const out = typst('calcul: 45 + 37', 'cases: aucune');
		expect(out).toContain('[#[8]]');
		expect(out).toContain('[#[2]]');
		expect(out).toContain('text(size: 7pt)[1]');
	});

	it('soustraction : signe moins typographique ; cassage : chiffres barrés', () => {
		expect(typst('calcul: 52 - 37')).toContain('[−]');
		const out = typst('calcul: 302 - 7', 'méthode: cassage', 'cases: aucune');
		expect(out).toContain('strike(stroke: 1pt)[3]');
		expect(out).toContain('text(size: 7pt)[12]');
	});

	it('décimaux : virgule placée sur le chiffre des unités', () => {
		expect(typst('calcul: 2,5 + 1,5')).toContain('text(weight: "bold")[,]');
	});

	it('bloc en erreur : cadre neutre, jamais d’erreur de compilation', () => {
		expect(typst('calcul: 3 - 5')).toContain(OPERATION_UNAVAILABLE);
	});

	it('branché dans generateTypst', () => {
		const out = generateTypst(parseMarkdown('```operation\ncalcul: 45 + 37\n```'));
		expect(out).toContain('table.hline');
	});
});
